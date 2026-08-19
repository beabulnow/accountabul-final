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
  v_budget_usdc text;
  v_funding_confirmations text;
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

  if v_run.user_id is distinct from v_reservation.user_id
    or v_run.intent ->> 'conversionId' is distinct from p_reservation_id::text
    or v_run.intent ->> 'userId' is distinct from v_reservation.user_id::text
    or v_run.intent ->> 'xrplDestination' is distinct from v_reservation.xrpl_destination
    or (v_run.intent ->> 'destinationTag')::bigint is distinct from v_reservation.xrpl_destination_tag
    or v_run.intent #>> '{acceptance,reservationId}' is distinct from p_reservation_id::text
    or v_run.intent #>> '{acceptance,sourceAssetKey}' is distinct from v_reservation.source_asset_key
    or (v_run.intent #>> '{acceptance,sourceAmountBaseUnits}')::numeric is distinct from v_reservation.source_amount_base_units
    or lower(v_run.intent #>> '{acceptance,sourceDestination}') is distinct from lower(v_reservation.source_destination)
    or (v_run.intent #>> '{acceptance,sourceDecimals}')::integer is distinct from v_reservation.source_decimals
    or (v_run.intent #>> '{acceptance,settlementAmountDrops}')::numeric is distinct from v_reservation.settlement_amount_drops
    or v_run.intent #>> '{acceptance,routeProfile}' is distinct from v_reservation.route_profile
    or (v_run.intent #>> '{acceptance,quoteExpiresAt}')::bigint is distinct from
      trunc(extract(epoch from v_reservation.quote_expires_at) * 1000)::bigint
    or (v_run.intent #>> '{acceptance,slippageBps}')::integer is distinct from v_reservation.slippage_bps
    or (v_run.intent #>> '{acceptance,totalFeesBps}')::integer is distinct from v_reservation.total_fees_bps
    or v_run.intent #>> '{acceptance,funding,network}' is distinct from v_reservation.funding_evidence ->> 'network'
    or v_run.intent #>> '{acceptance,funding,assetKey}' is distinct from v_reservation.funding_evidence ->> 'assetKey'
    or lower(v_run.intent #>> '{acceptance,funding,destination}') is distinct from lower(v_reservation.funding_evidence ->> 'destination')
    or (v_run.intent #>> '{acceptance,funding,amountBaseUnits}')::numeric is distinct from
      (v_reservation.funding_evidence ->> 'amountBaseUnits')::numeric
    or lower(v_run.intent #>> '{acceptance,funding,transactionHash}') is distinct from
      lower(v_reservation.funding_evidence ->> 'transactionHash')
    or (v_run.intent #>> '{acceptance,funding,confirmed}')::boolean is distinct from true then
    raise exception 'FXRP run identity or funding proof does not match acceptance authorization';
  end if;

  v_funding_confirmations := v_run.intent #>> '{acceptance,funding,confirmations}';
  if not coalesce(v_funding_confirmations ~ '^[0-9]+$', false)
    or v_funding_confirmations::numeric < 1
    or v_funding_confirmations::numeric is distinct from
      (v_reservation.funding_evidence ->> 'confirmations')::numeric then
    raise exception 'FXRP run funding confirmations do not match acceptance authorization';
  end if;

  v_budget_usdc := v_run.intent ->> 'budgetUsdc';
  if not coalesce(v_budget_usdc ~ '^[0-9]+(\.[0-9]+)?$', false)
    or trunc(v_budget_usdc::numeric * power(10::numeric, v_reservation.source_decimals))
      <> v_reservation.source_amount_base_units
    or (v_run.intent ->> 'maxSlippageBps')::integer is distinct from v_reservation.slippage_bps then
    raise exception 'FXRP run budget does not match acceptance authorization';
  end if;

  v_minimum_xrp := v_run.intent ->> 'minimumDeliveredXrp';
  v_delivered_xrp := v_run.evidence #>> '{xrpl,deliveredXrp}';
  if not coalesce(v_minimum_xrp ~ '^[0-9]+(\.[0-9]{1,6})?$', false)
    or not coalesce(v_delivered_xrp ~ '^[0-9]+(\.[0-9]{1,6})?$', false)
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

revoke all on function public.finalize_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.finalize_fxrp_acceptance(uuid) to service_role;

;
