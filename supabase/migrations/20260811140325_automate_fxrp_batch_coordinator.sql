-- Server-only queue inspection and deterministic minimum-batch claiming.
-- The caller supplies a live, route-specific minimum source amount; the database
-- owns member selection so no operator can redirect or reorder customer payouts.

create or replace function public.list_fxrp_acceptances_for_funding(
  p_source_destination text,
  p_limit integer default 100
)
returns setof uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_source_destination !~* '^0x[0-9a-f]{40}$' then
    raise exception 'source destination must be an EVM address';
  end if;
  if p_limit not between 1 and 1000 then
    raise exception 'funding scan limit must be between 1 and 1000';
  end if;

  return query
  select reservation.id
  from public.xrp_acceptance_reservations reservation
  where reservation.status = 'reserved'
    and reservation.source_sender is not null
    and lower(reservation.source_destination) = lower(p_source_destination)
    and reservation.source_asset_key = 'hyperliquid-testnet:USDC'
    and reservation.expires_at > clock_timestamp()
    and reservation.quote_expires_at > clock_timestamp()
    and not exists (
      select 1 from public.fxrp_acceptance_batch_members member
      where member.reservation_id = reservation.id
    )
  order by reservation.created_at, reservation.id
  limit p_limit;
end;
$$;

create or replace function public.claim_next_fxrp_acceptance_batch(
  p_source_destination text,
  p_minimum_source_amount_base_units numeric,
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
  v_root public.xrp_acceptance_reservations%rowtype;
  v_required_position bigint;
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
  if p_minimum_members not between 2 and 100
    or p_maximum_members not between p_minimum_members and 100 then
    raise exception 'batch member limits must describe a range from 2 through 100';
  end if;

  -- One signer destination processes one batch at a time. This also makes an
  -- ambiguous HTTP response resumable: the next call returns the durable batch.
  perform pg_catalog.pg_advisory_xact_lock(570643, pg_catalog.hashtext(lower(p_source_destination)));

  select batch.id into v_existing_id
  from public.fxrp_acceptance_batches batch
  where batch.status = 'executing'
    and lower(batch.source_destination) = lower(p_source_destination)
  order by batch.created_at, batch.id
  limit 1
  for update;
  if found then
    return v_existing_id;
  end if;

  -- Try roots in oldest-first order. Compatibility is deliberately stricter
  -- than asset equality: users, routes, destinations, signers, and fee controls
  -- may never be mixed inside one conversion.
  for v_root in
    select reservation.*
    from public.xrp_acceptance_reservations reservation
    where reservation.status = 'funds_observed'
      and reservation.source_sender is not null
      and lower(reservation.source_destination) = lower(p_source_destination)
      and reservation.expires_at > v_now
      and reservation.quote_expires_at > v_now
      and not exists (
        select 1 from public.fxrp_acceptance_batch_members member
        where member.reservation_id = reservation.id
      )
    order by reservation.created_at, reservation.id
    limit 1000
  loop
    with compatible as (
      select reservation.id,
        row_number() over (order by reservation.created_at, reservation.id) as position,
        sum(reservation.source_amount_base_units) over (
          order by reservation.created_at, reservation.id rows unbounded preceding
        ) as running_source_amount
      from public.xrp_acceptance_reservations reservation
      where reservation.status = 'funds_observed'
        and reservation.user_id = v_root.user_id
        and reservation.source_asset_key = v_root.source_asset_key
        and lower(reservation.source_destination) = lower(v_root.source_destination)
        and reservation.source_decimals = v_root.source_decimals
        and reservation.route_profile = v_root.route_profile
        and reservation.route = v_root.route
        and reservation.settlement_wallet_address = v_root.settlement_wallet_address
        and reservation.profit_wallet_address = v_root.profit_wallet_address
        and reservation.maximum_xrpl_fee_drops = v_root.maximum_xrpl_fee_drops
        and reservation.source_sender is not null
        and reservation.xrpl_destination is not null
        and reservation.xrpl_destination not in (
          v_root.settlement_wallet_address, v_root.profit_wallet_address
        )
        and reservation.expires_at > v_now
        and reservation.quote_expires_at > v_now
        and reservation.funding_evidence ->> 'observationStatus' = 'exact'
        and lower(reservation.funding_evidence ->> 'source') = lower(reservation.source_sender)
        and lower(reservation.funding_evidence ->> 'destination') = lower(v_root.source_destination)
        and reservation.funding_evidence ->> 'assetKey' = v_root.source_asset_key
        and (reservation.funding_evidence ->> 'amountBaseUnits')::numeric
          = reservation.source_amount_base_units
        and (reservation.funding_evidence ->> 'confirmed')::boolean = true
        and (reservation.funding_evidence ->> 'confirmations')::numeric >= 1
        and coalesce(
          (reservation.funding_evidence ->> 'transactionHash') ~ '^0x[0-9a-fA-F]{64}$',
          false
        )
        and not exists (
          select 1 from public.fxrp_acceptance_batch_members member
          where member.reservation_id = reservation.id
        )
    )
    select min(position) into v_required_position
    from compatible
    where position between p_minimum_members and p_maximum_members
      and running_source_amount >= p_minimum_source_amount_base_units;

    if v_required_position is null then
      continue;
    end if;

    with compatible as (
      select reservation.id,
        row_number() over (order by reservation.created_at, reservation.id) as position
      from public.xrp_acceptance_reservations reservation
      where reservation.status = 'funds_observed'
        and reservation.user_id = v_root.user_id
        and reservation.source_asset_key = v_root.source_asset_key
        and lower(reservation.source_destination) = lower(v_root.source_destination)
        and reservation.source_decimals = v_root.source_decimals
        and reservation.route_profile = v_root.route_profile
        and reservation.route = v_root.route
        and reservation.settlement_wallet_address = v_root.settlement_wallet_address
        and reservation.profit_wallet_address = v_root.profit_wallet_address
        and reservation.maximum_xrpl_fee_drops = v_root.maximum_xrpl_fee_drops
        and reservation.source_sender is not null
        and reservation.xrpl_destination is not null
        and reservation.xrpl_destination not in (
          v_root.settlement_wallet_address, v_root.profit_wallet_address
        )
        and reservation.expires_at > v_now
        and reservation.quote_expires_at > v_now
        and reservation.funding_evidence ->> 'observationStatus' = 'exact'
        and lower(reservation.funding_evidence ->> 'source') = lower(reservation.source_sender)
        and lower(reservation.funding_evidence ->> 'destination') = lower(v_root.source_destination)
        and reservation.funding_evidence ->> 'assetKey' = v_root.source_asset_key
        and (reservation.funding_evidence ->> 'amountBaseUnits')::numeric
          = reservation.source_amount_base_units
        and (reservation.funding_evidence ->> 'confirmed')::boolean = true
        and (reservation.funding_evidence ->> 'confirmations')::numeric >= 1
        and coalesce(
          (reservation.funding_evidence ->> 'transactionHash') ~ '^0x[0-9a-fA-F]{64}$',
          false
        )
        and not exists (
          select 1 from public.fxrp_acceptance_batch_members member
          where member.reservation_id = reservation.id
        )
    )
    select array_agg(id order by position) into v_reservation_ids
    from compatible where position <= v_required_position;

    v_batch_id := gen_random_uuid();
    perform public.claim_fxrp_acceptance_batch(
      v_batch_id,
      'automatic-batch:' || v_batch_id::text,
      v_reservation_ids
    );
    return v_batch_id;
  end loop;

  return null;
end;
$$;

create or replace function public.read_fxrp_acceptance_batch(p_batch_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select fxrp_private.fxrp_batch_authorization(p_batch_id)
$$;

revoke all on function public.list_fxrp_acceptances_for_funding(text, integer)
  from public, anon, authenticated;
grant execute on function public.list_fxrp_acceptances_for_funding(text, integer)
  to service_role;
revoke all on function public.claim_next_fxrp_acceptance_batch(text, numeric, integer, integer)
  from public, anon, authenticated;
grant execute on function public.claim_next_fxrp_acceptance_batch(text, numeric, integer, integer)
  to service_role;
revoke all on function public.read_fxrp_acceptance_batch(uuid)
  from public, anon, authenticated;
grant execute on function public.read_fxrp_acceptance_batch(uuid)
  to service_role;

;
