alter table public.xrp_acceptance_reservations
  add column source_sender text;

alter table public.xrp_acceptance_reservations
  add constraint xrp_reservations_source_sender_format check (
    source_sender is null or source_sender ~ '^0x[0-9a-fA-F]{40}$'
  );

comment on column public.xrp_acceptance_reservations.source_sender is
  'Expected Hyperliquid spot-transfer sender. Required with destination and exact amount to attribute a shared-account deposit to one reservation.';

create unique index xrp_reservations_one_active_funding_stream
  on public.xrp_acceptance_reservations (
    lower(source_sender),
    lower(source_destination),
    source_asset_key
  )
  where source_sender is not null
    and status in ('reserved', 'funds_observed', 'executing');

alter function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, integer, numeric, text, bigint, text, jsonb,
  timestamptz, integer, integer, timestamptz
) set schema fxrp_private;

alter function public.record_xrp_acceptance_funding(uuid, jsonb) set schema fxrp_private;
alter function public.claim_fxrp_acceptance(uuid) set schema fxrp_private;
alter function public.finalize_fxrp_acceptance(uuid) set schema fxrp_private;

revoke all on function fxrp_private.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, integer, numeric, text, bigint, text, jsonb,
  timestamptz, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function fxrp_private.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, integer, numeric, text, bigint, text, jsonb,
  timestamptz, integer, integer, timestamptz
) to service_role;

revoke all on function fxrp_private.record_xrp_acceptance_funding(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function fxrp_private.record_xrp_acceptance_funding(uuid, jsonb) to service_role;
revoke all on function fxrp_private.claim_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function fxrp_private.claim_fxrp_acceptance(uuid) to service_role;
revoke all on function fxrp_private.finalize_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function fxrp_private.finalize_fxrp_acceptance(uuid) to service_role;

create or replace function public.reserve_xrp_acceptance(
  p_invoice_id uuid,
  p_idempotency_key text,
  p_source_asset_key text,
  p_source_amount_base_units numeric,
  p_source_sender text,
  p_source_destination text,
  p_source_decimals integer,
  p_settlement_amount_drops numeric,
  p_xrpl_destination text,
  p_xrpl_destination_tag bigint,
  p_route_profile text,
  p_route jsonb,
  p_quote_expires_at timestamptz,
  p_slippage_bps integer,
  p_total_fees_bps integer,
  p_reservation_expires_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation_id uuid;
  v_existing public.xrp_acceptance_reservations%rowtype;
begin
  if p_source_sender !~ '^0x[0-9a-fA-F]{40}$' then
    raise exception 'invalid Hyperliquid source sender';
  end if;
  if lower(p_source_sender) = lower(p_source_destination) then
    raise exception 'Hyperliquid source sender and destination must differ';
  end if;

  v_reservation_id := fxrp_private.reserve_xrp_acceptance(
    p_invoice_id,
    p_idempotency_key,
    p_source_asset_key,
    p_source_amount_base_units,
    p_source_destination,
    p_source_decimals,
    p_settlement_amount_drops,
    p_xrpl_destination,
    p_xrpl_destination_tag,
    p_route_profile,
    p_route,
    p_quote_expires_at,
    p_slippage_bps,
    p_total_fees_bps,
    p_reservation_expires_at
  );

  select * into v_existing
  from public.xrp_acceptance_reservations
  where id = v_reservation_id
  for update;

  if v_existing.source_sender is not null then
    if lower(v_existing.source_sender) <> lower(p_source_sender) then
      raise exception 'idempotency key belongs to a different funding sender';
    end if;
  else
    update public.xrp_acceptance_reservations
    set source_sender = lower(p_source_sender), updated_at = clock_timestamp()
    where id = v_reservation_id;
  end if;

  return v_reservation_id;
end;
$$;

create or replace function public.record_xrp_acceptance_funding(
  p_reservation_id uuid,
  p_funding_evidence jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reservation public.xrp_acceptance_reservations%rowtype;
  v_ledger_time_ms bigint;
  v_matches boolean;
begin
  select * into v_reservation
  from public.xrp_acceptance_reservations
  where id = p_reservation_id
  for update;
  if not found then raise exception 'acceptance reservation not found'; end if;

  if v_reservation.status in ('funds_observed', 'executing', 'settled') then
    if v_reservation.funding_evidence <> p_funding_evidence then
      raise exception 'reservation already belongs to different funding evidence';
    end if;
    return v_reservation.status;
  end if;
  if v_reservation.status <> 'reserved' then return v_reservation.status; end if;

  if coalesce(p_funding_evidence ->> 'ledgerTime', '') ~ '^[0-9]+$' then
    v_ledger_time_ms := (p_funding_evidence ->> 'ledgerTime')::bigint;
  end if;
  v_matches := v_reservation.source_sender is not null
    and p_funding_evidence ->> 'observationStatus' = 'exact'
    and lower(p_funding_evidence ->> 'source') = lower(v_reservation.source_sender)
    and v_ledger_time_ms >= trunc(extract(epoch from v_reservation.created_at) * 1000)::bigint
    and v_ledger_time_ms <= trunc(extract(epoch from least(v_reservation.quote_expires_at, v_reservation.expires_at)) * 1000)::bigint;

  if not coalesce(v_matches, false) then
    update public.xrp_acceptance_reservations
    set status = 'manual_review', funding_evidence = p_funding_evidence,
        failure_code = 'funding_observation_mismatch', updated_at = v_now
    where id = p_reservation_id;
    return 'manual_review';
  end if;

  return fxrp_private.record_xrp_acceptance_funding(p_reservation_id, p_funding_evidence);
end;
$$;

create or replace function public.claim_fxrp_acceptance(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reservation public.xrp_acceptance_reservations%rowtype;
  v_result jsonb;
begin
  select * into v_reservation
  from public.xrp_acceptance_reservations
  where id = p_reservation_id
  for update;
  if not found then raise exception 'acceptance reservation not found'; end if;

  if v_reservation.status = 'reserved'
    and (v_reservation.expires_at <= v_now or v_reservation.quote_expires_at <= v_now) then
    update public.xrp_acceptance_reservations
    set status = 'released', failure_code = 'reservation_expired', released_at = v_now, updated_at = v_now
    where id = p_reservation_id;
  end if;

  if v_reservation.status = 'funds_observed' and v_reservation.source_sender is null then
    update public.xrp_acceptance_reservations
    set status = 'manual_review', failure_code = 'missing_funding_sender', updated_at = v_now
    where id = p_reservation_id;
  end if;

  v_result := fxrp_private.claim_fxrp_acceptance(p_reservation_id);

  select * into v_reservation
  from public.xrp_acceptance_reservations
  where id = p_reservation_id;

  return v_result || jsonb_build_object(
    'sourceSender', v_reservation.source_sender,
    'createdAt', trunc(extract(epoch from v_reservation.created_at) * 1000)::bigint,
    'expiresAt', trunc(extract(epoch from v_reservation.expires_at) * 1000)::bigint
  );
end;
$$;

create or replace function public.finalize_fxrp_acceptance(
  p_reservation_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation public.xrp_acceptance_reservations%rowtype;
  v_run public.fxrp_conversion_runs%rowtype;
begin
  select * into v_reservation
  from public.xrp_acceptance_reservations
  where id = p_reservation_id
  for update;
  if not found then raise exception 'acceptance reservation not found'; end if;

  select * into v_run
  from public.fxrp_conversion_runs
  where conversion_id = p_reservation_id
  for update;
  if not found then raise exception 'FXRP conversion run not found'; end if;

  if v_run.status = 'xrpl_settled' and (
    v_run.intent #>> '{acceptance,sourceSender}' is distinct from v_reservation.source_sender
    or lower(v_run.intent #>> '{acceptance,funding,source}') is distinct from lower(v_reservation.source_sender)
    or (v_run.intent #>> '{acceptance,funding,ledgerTime}')::bigint is distinct from
      (v_reservation.funding_evidence ->> 'ledgerTime')::bigint
  ) then
    raise exception 'FXRP run funding sender or ledger time does not match acceptance authorization';
  end if;

  return fxrp_private.finalize_fxrp_acceptance(p_reservation_id);
end;
$$;

revoke all on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, text, integer, numeric, text, bigint, text, jsonb,
  timestamptz, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, text, integer, numeric, text, bigint, text, jsonb,
  timestamptz, integer, integer, timestamptz
) to service_role;

revoke all on function public.record_xrp_acceptance_funding(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_xrp_acceptance_funding(uuid, jsonb) to service_role;
revoke all on function public.claim_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.claim_fxrp_acceptance(uuid) to service_role;
revoke all on function public.finalize_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.finalize_fxrp_acceptance(uuid) to service_role;

;
