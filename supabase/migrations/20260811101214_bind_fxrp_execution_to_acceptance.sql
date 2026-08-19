alter table public.xrp_acceptance_reservations
  add column source_destination text,
  add column source_decimals integer,
  add column xrpl_destination text,
  add column xrpl_destination_tag bigint,
  add column funding_evidence jsonb not null default '{}'::jsonb;

alter table public.xrp_acceptance_reservations
  add constraint xrp_reservations_source_destination_format check (
    source_destination is null or source_destination ~ '^0x[0-9a-fA-F]{40}$'
  ),
  add constraint xrp_reservations_source_decimals_range check (
    source_decimals is null or source_decimals between 0 and 30
  ),
  add constraint xrp_reservations_xrpl_destination_format check (
    xrpl_destination is null or xrpl_destination ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'
  ),
  add constraint xrp_reservations_xrpl_tag_range check (
    xrpl_destination_tag is null or xrpl_destination_tag between 0 and 4294967295
  ),
  add constraint xrp_reservations_funding_evidence_object check (
    jsonb_typeof(funding_evidence) = 'object'
  );

create unique index xrp_reservations_funding_tx_unique
  on public.xrp_acceptance_reservations (lower(funding_evidence ->> 'transactionHash'))
  where funding_evidence ? 'transactionHash';

create schema if not exists fxrp_private;
revoke all on schema fxrp_private from public, anon, authenticated;
grant usage on schema fxrp_private to service_role;

alter function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, numeric, text, jsonb, timestamptz, integer, integer, timestamptz
) set schema fxrp_private;

revoke all on function fxrp_private.reserve_xrp_acceptance(
  uuid, text, text, numeric, numeric, text, jsonb, timestamptz, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function fxrp_private.reserve_xrp_acceptance(
  uuid, text, text, numeric, numeric, text, jsonb, timestamptz, integer, integer, timestamptz
) to service_role;

create or replace function public.reserve_xrp_acceptance(
  p_invoice_id uuid,
  p_idempotency_key text,
  p_source_asset_key text,
  p_source_amount_base_units numeric,
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
  if p_source_destination !~ '^0x[0-9a-fA-F]{40}$' then
    raise exception 'invalid Hyperliquid source destination';
  end if;
  if p_source_decimals not between 0 and 30 then
    raise exception 'source decimals must be between 0 and 30';
  end if;
  if p_xrpl_destination !~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$' then
    raise exception 'invalid XRPL classic destination';
  end if;
  if p_xrpl_destination_tag is not null and p_xrpl_destination_tag not between 0 and 4294967295 then
    raise exception 'XRPL destination tag must be a uint32';
  end if;

  v_reservation_id := fxrp_private.reserve_xrp_acceptance(
    p_invoice_id,
    p_idempotency_key,
    p_source_asset_key,
    p_source_amount_base_units,
    p_settlement_amount_drops,
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

  if v_existing.source_destination is not null then
    if lower(v_existing.source_destination) <> lower(p_source_destination)
      or v_existing.source_decimals <> p_source_decimals
      or v_existing.xrpl_destination <> p_xrpl_destination
      or v_existing.xrpl_destination_tag is distinct from p_xrpl_destination_tag then
      raise exception 'idempotency key belongs to a different settlement destination';
    end if;
  else
    update public.xrp_acceptance_reservations
    set source_destination = lower(p_source_destination),
        source_decimals = p_source_decimals,
        xrpl_destination = p_xrpl_destination,
        xrpl_destination_tag = p_xrpl_destination_tag,
        updated_at = clock_timestamp()
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
  if v_reservation.status <> 'reserved' then
    return v_reservation.status;
  end if;
  if v_reservation.expires_at <= v_now or v_reservation.quote_expires_at <= v_now then
    update public.xrp_acceptance_reservations
    set status = 'released', failure_code = 'reservation_expired', released_at = v_now, updated_at = v_now
    where id = p_reservation_id;
    return 'released';
  end if;

  v_matches := jsonb_typeof(p_funding_evidence) = 'object'
    and p_funding_evidence ->> 'network' = 'hyperliquid-testnet'
    and p_funding_evidence ->> 'assetKey' = v_reservation.source_asset_key
    and lower(p_funding_evidence ->> 'destination') = lower(v_reservation.source_destination)
    and (p_funding_evidence ->> 'amountBaseUnits') ~ '^[0-9]+$'
    and (p_funding_evidence ->> 'amountBaseUnits')::numeric = v_reservation.source_amount_base_units
    and (p_funding_evidence ->> 'transactionHash') ~ '^0x[0-9a-fA-F]{64}$'
    and jsonb_typeof(p_funding_evidence -> 'confirmed') = 'boolean'
    and (p_funding_evidence ->> 'confirmed')::boolean = true
    and (p_funding_evidence ->> 'confirmations') ~ '^[0-9]+$'
    and (p_funding_evidence ->> 'confirmations')::numeric >= 1;

  if not coalesce(v_matches, false) then
    update public.xrp_acceptance_reservations
    set status = 'manual_review', funding_evidence = p_funding_evidence,
        failure_code = 'funding_proof_mismatch', updated_at = v_now
    where id = p_reservation_id;
    return 'manual_review';
  end if;

  update public.xrp_acceptance_reservations
  set status = 'funds_observed', funding_evidence = p_funding_evidence,
      failure_code = null, updated_at = v_now
  where id = p_reservation_id;
  return 'funds_observed';
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
begin
  select * into v_reservation
  from public.xrp_acceptance_reservations
  where id = p_reservation_id
  for update;
  if not found then raise exception 'acceptance reservation not found'; end if;

  if v_reservation.status = 'funds_observed' then
    if v_reservation.expires_at <= v_now or v_reservation.quote_expires_at <= v_now then
      update public.xrp_acceptance_reservations
      set status = 'manual_review', failure_code = 'funded_reservation_expired', updated_at = v_now
      where id = p_reservation_id;
      v_reservation.status := 'manual_review';
      v_reservation.failure_code := 'funded_reservation_expired';
    elsif v_reservation.source_asset_key <> 'hyperliquid-testnet:USDC'
      or v_reservation.route_profile <> 'hyperliquid-usdc-fxrp-xrp-v1'
      or v_reservation.source_destination is null
      or v_reservation.source_decimals is null
      or v_reservation.xrpl_destination is null
      or v_reservation.route ->> 'source' <> 'hyperliquid-testnet:USDC'
      or v_reservation.route ->> 'destination' <> 'xrpl:XRP'
      or jsonb_array_length(v_reservation.route -> 'legs') <> 2
      or v_reservation.route #>> '{legs,0,from}' <> 'hyperliquid-testnet:USDC'
      or v_reservation.route #>> '{legs,0,to}' <> 'hyperliquid-testnet:FXRP'
      or v_reservation.route #>> '{legs,0,executor}' <> 'hyperliquid-spot'
      or v_reservation.route #>> '{legs,1,from}' <> 'hyperliquid-testnet:FXRP'
      or v_reservation.route #>> '{legs,1,to}' <> 'xrpl:XRP'
      or v_reservation.route #>> '{legs,1,executor}' <> 'fxrp-flow' then
      update public.xrp_acceptance_reservations
      set status = 'manual_review', failure_code = 'unsupported_fxrp_execution_authorization', updated_at = v_now
      where id = p_reservation_id;
      v_reservation.status := 'manual_review';
      v_reservation.failure_code := 'unsupported_fxrp_execution_authorization';
    else
      update public.xrp_acceptance_reservations
      set status = 'executing', updated_at = v_now
      where id = p_reservation_id;
      v_reservation.status := 'executing';
    end if;
  end if;

  return jsonb_build_object(
    'reservationId', v_reservation.id,
    'status', v_reservation.status,
    'failureCode', v_reservation.failure_code,
    'userId', v_reservation.user_id,
    'sourceAssetKey', v_reservation.source_asset_key,
    'sourceAmountBaseUnits', v_reservation.source_amount_base_units::text,
    'sourceDestination', v_reservation.source_destination,
    'sourceDecimals', v_reservation.source_decimals,
    'settlementAmountDrops', v_reservation.settlement_amount_drops::text,
    'xrplDestination', v_reservation.xrpl_destination,
    'destinationTag', v_reservation.xrpl_destination_tag,
    'routeProfile', v_reservation.route_profile,
    'route', v_reservation.route,
    'quoteExpiresAt', trunc(extract(epoch from v_reservation.quote_expires_at) * 1000)::bigint,
    'slippageBps', v_reservation.slippage_bps,
    'totalFeesBps', v_reservation.total_fees_bps,
    'fundingEvidence', v_reservation.funding_evidence
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
  v_now timestamptz := clock_timestamp();
  v_reservation public.xrp_acceptance_reservations%rowtype;
  v_run public.fxrp_conversion_runs%rowtype;
  v_minimum_xrp text;
  v_delivered_xrp text;
begin
  select * into v_reservation
  from public.xrp_acceptance_reservations
  where id = p_reservation_id
  for update;
  if not found then raise exception 'acceptance reservation not found'; end if;
  if v_reservation.status = 'settled' then return 'settled'; end if;

  select * into v_run
  from public.fxrp_conversion_runs
  where conversion_id = p_reservation_id
  for update;
  if not found then raise exception 'FXRP conversion run not found'; end if;

  if v_run.status in ('manual_review', 'failed') then
    update public.xrp_acceptance_reservations
    set status = 'manual_review', failure_code = coalesce(v_run.last_error ->> 'code', 'fxrp_terminal_exception'),
        execution_evidence = jsonb_build_object('conversionVersion', v_run.version, 'evidence', v_run.evidence),
        updated_at = v_now
    where id = p_reservation_id;
    update public.xrp_settlement_invoices
    set status = 'manual_review', updated_at = v_now
    where id = v_reservation.invoice_id and status = 'open';
    return 'manual_review';
  end if;

  if v_run.status <> 'xrpl_settled' then raise exception 'FXRP conversion is not terminal'; end if;
  if v_reservation.status <> 'executing' then raise exception 'acceptance reservation is not executing'; end if;
  if v_run.user_id <> v_reservation.user_id
    or v_run.intent ->> 'conversionId' <> p_reservation_id::text
    or v_run.intent ->> 'userId' <> v_reservation.user_id::text
    or v_run.intent ->> 'xrplDestination' <> v_reservation.xrpl_destination
    or (v_run.intent ->> 'destinationTag')::bigint is distinct from v_reservation.xrpl_destination_tag then
    raise exception 'FXRP run identity does not match acceptance authorization';
  end if;

  v_minimum_xrp := v_run.intent ->> 'minimumDeliveredXrp';
  v_delivered_xrp := v_run.evidence #>> '{xrpl,deliveredXrp}';
  if v_minimum_xrp !~ '^[0-9]+(\.[0-9]{1,6})?$'
    or v_delivered_xrp !~ '^[0-9]+(\.[0-9]{1,6})?$'
    or trunc(v_minimum_xrp::numeric * 1000000) <> v_reservation.settlement_amount_drops
    or trunc(v_delivered_xrp::numeric * 1000000) < v_reservation.settlement_amount_drops then
    raise exception 'FXRP settlement amount does not match acceptance authorization';
  end if;

  update public.xrp_acceptance_reservations
  set status = 'settled', failure_code = null,
      execution_evidence = jsonb_build_object('conversionVersion', v_run.version, 'evidence', v_run.evidence),
      settled_at = v_now, updated_at = v_now
  where id = p_reservation_id;

  update public.xrp_settlement_invoices
  set settled_amount_drops = settled_amount_drops + v_reservation.settlement_amount_drops,
      status = case
        when settled_amount_drops + v_reservation.settlement_amount_drops >= target_amount_drops then 'paid'
        else status
      end,
      updated_at = v_now
  where id = v_reservation.invoice_id;

  return 'settled';
end;
$$;

revoke all on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, integer, numeric, text, bigint, text, jsonb,
  timestamptz, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, integer, numeric, text, bigint, text, jsonb,
  timestamptz, integer, integer, timestamptz
) to service_role;

revoke all on function public.record_xrp_acceptance_funding(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.record_xrp_acceptance_funding(uuid, jsonb) to service_role;
revoke all on function public.claim_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.claim_fxrp_acceptance(uuid) to service_role;
revoke all on function public.finalize_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.finalize_fxrp_acceptance(uuid) to service_role;

;
