-- Require automatically selected members to authorize the same live slippage
-- envelope used to calculate the dynamic minimum source threshold.
create or replace function public.claim_next_fxrp_acceptance_batch(
  p_source_destination text,
  p_minimum_source_amount_base_units numeric,
  p_required_slippage_bps integer,
  p_minimum_members integer default 2,
  p_maximum_members integer default 100
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_existing_id uuid;
  v_choice record;
  v_reservation_ids uuid[];
  v_batch_id uuid;
begin
  if p_source_destination !~* '^0x[0-9a-f]{40}$' then
    raise exception 'source destination must be an EVM address';
  end if;
  if p_minimum_source_amount_base_units <= 0
    or trunc(p_minimum_source_amount_base_units) <> p_minimum_source_amount_base_units then
    raise exception 'minimum source amount must be a positive integer';
  end if;
  if p_required_slippage_bps not between 0 and 10000 then
    raise exception 'required slippage must be between 0 and 10000 basis points';
  end if;
  if p_minimum_members not between 2 and 100
    or p_maximum_members not between p_minimum_members and 100 then
    raise exception 'batch member limits must describe a range from 2 through 100';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(570643, pg_catalog.hashtext(lower(p_source_destination)));

  select batch.id into v_existing_id
  from public.fxrp_acceptance_batches batch
  where batch.status = 'executing'
    and lower(batch.source_destination) = lower(p_source_destination)
  order by batch.created_at, batch.id
  limit 1
  for update;
  if found then return v_existing_id; end if;

  with candidates as (
    select reservation.*
    from public.xrp_acceptance_reservations reservation
    where reservation.status = 'funds_observed'
      and reservation.source_sender is not null
      and lower(reservation.source_destination) = lower(p_source_destination)
      and reservation.slippage_bps >= p_required_slippage_bps
      and reservation.xrpl_destination is not null
      and reservation.xrpl_destination not in (
        reservation.settlement_wallet_address, reservation.profit_wallet_address
      )
      and reservation.expires_at > v_now
      and reservation.quote_expires_at > v_now
      and reservation.funding_evidence ->> 'observationStatus' = 'exact'
      and lower(reservation.funding_evidence ->> 'source') = lower(reservation.source_sender)
      and lower(reservation.funding_evidence ->> 'destination') = lower(reservation.source_destination)
      and reservation.funding_evidence ->> 'assetKey' = reservation.source_asset_key
      and (reservation.funding_evidence ->> 'amountBaseUnits')::numeric
        = reservation.source_amount_base_units
      and (reservation.funding_evidence ->> 'confirmed')::boolean = true
      and (reservation.funding_evidence ->> 'confirmations')::numeric >= 1
      and coalesce(
        (reservation.funding_evidence ->> 'transactionHash') ~ '^0x[0-9a-fA-F]{64}$', false
      )
      and not exists (
        select 1 from public.fxrp_acceptance_batch_members member
        where member.reservation_id = reservation.id
      )
  ), ranked as (
    select candidates.*,
      row_number() over (
        partition by user_id, source_asset_key, lower(source_destination), source_decimals,
          route_profile, route, settlement_wallet_address, profit_wallet_address, maximum_xrpl_fee_drops
        order by created_at, id
      ) as member_position,
      sum(source_amount_base_units) over (
        partition by user_id, source_asset_key, lower(source_destination), source_decimals,
          route_profile, route, settlement_wallet_address, profit_wallet_address, maximum_xrpl_fee_drops
        order by created_at, id rows unbounded preceding
      ) as running_source_amount,
      min(created_at) over (
        partition by user_id, source_asset_key, lower(source_destination), source_decimals,
          route_profile, route, settlement_wallet_address, profit_wallet_address, maximum_xrpl_fee_drops
      ) as group_created_at
    from candidates
  )
  select * into v_choice from ranked
  where member_position between p_minimum_members and p_maximum_members
    and running_source_amount >= p_minimum_source_amount_base_units
  order by group_created_at, user_id, source_asset_key, route_profile,
    settlement_wallet_address, profit_wallet_address, member_position
  limit 1;

  if not found then return null; end if;

  with candidates as (
    select reservation.*
    from public.xrp_acceptance_reservations reservation
    where reservation.status = 'funds_observed'
      and reservation.source_sender is not null
      and lower(reservation.source_destination) = lower(p_source_destination)
      and reservation.slippage_bps >= p_required_slippage_bps
      and reservation.xrpl_destination is not null
      and reservation.xrpl_destination not in (
        reservation.settlement_wallet_address, reservation.profit_wallet_address
      )
      and reservation.expires_at > v_now
      and reservation.quote_expires_at > v_now
      and reservation.funding_evidence ->> 'observationStatus' = 'exact'
      and lower(reservation.funding_evidence ->> 'source') = lower(reservation.source_sender)
      and lower(reservation.funding_evidence ->> 'destination') = lower(reservation.source_destination)
      and reservation.funding_evidence ->> 'assetKey' = reservation.source_asset_key
      and (reservation.funding_evidence ->> 'amountBaseUnits')::numeric
        = reservation.source_amount_base_units
      and (reservation.funding_evidence ->> 'confirmed')::boolean = true
      and (reservation.funding_evidence ->> 'confirmations')::numeric >= 1
      and coalesce(
        (reservation.funding_evidence ->> 'transactionHash') ~ '^0x[0-9a-fA-F]{64}$', false
      )
      and not exists (
        select 1 from public.fxrp_acceptance_batch_members member
        where member.reservation_id = reservation.id
      )
  ), ranked as (
    select candidates.*,
      row_number() over (
        partition by user_id, source_asset_key, lower(source_destination), source_decimals,
          route_profile, route, settlement_wallet_address, profit_wallet_address, maximum_xrpl_fee_drops
        order by created_at, id
      ) as member_position
    from candidates
  )
  select array_agg(id order by member_position) into v_reservation_ids
  from ranked
  where user_id = v_choice.user_id
    and source_asset_key = v_choice.source_asset_key
    and lower(source_destination) = lower(v_choice.source_destination)
    and source_decimals = v_choice.source_decimals
    and route_profile = v_choice.route_profile
    and route = v_choice.route
    and settlement_wallet_address = v_choice.settlement_wallet_address
    and profit_wallet_address = v_choice.profit_wallet_address
    and maximum_xrpl_fee_drops = v_choice.maximum_xrpl_fee_drops
    and member_position <= v_choice.member_position;

  v_batch_id := gen_random_uuid();
  perform public.claim_fxrp_acceptance_batch(
    v_batch_id,
    'automatic-batch:' || v_batch_id::text,
    v_reservation_ids
  );
  return v_batch_id;
end;
$$;

revoke all on function public.claim_next_fxrp_acceptance_batch(text, numeric, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_next_fxrp_acceptance_batch(text, numeric, integer, integer, integer)
  to service_role;

;
