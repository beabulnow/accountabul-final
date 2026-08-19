alter table public.fxrp_conversion_runs
  drop constraint fxrp_conversion_runs_status_check;

alter table public.fxrp_conversion_runs
  add constraint fxrp_conversion_runs_status_check check (status in (
    'created', 'quoted', 'order_submitted', 'spot_filled', 'core_to_evm_submitted',
    'evm_received', 'oft_submitted', 'redemption_requested', 'fassets_received',
    'customer_payment_submitted', 'customer_paid', 'profit_payment_submitted',
    'xrpl_settled', 'failed', 'manual_review'
  ));

comment on table public.fxrp_conversion_runs is
  'Testnet-only conversion state. Private keys and seeds are forbidden. Signed XRPL blobs are service-only retry evidence and must be redacted from public APIs.';

alter table public.xrp_acceptance_reservations
  add column settlement_wallet_address text,
  add column profit_wallet_address text,
  add column minimum_profit_payment_drops numeric(78, 0),
  add column maximum_profit_payment_drops numeric(78, 0),
  add column expense_reserve_drops numeric(78, 0),
  add column maximum_xrpl_fee_drops numeric(78, 0);

alter table public.xrp_acceptance_reservations
  add constraint xrp_reservations_settlement_wallet_format check (
    settlement_wallet_address is null or settlement_wallet_address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'
  ),
  add constraint xrp_reservations_profit_wallet_format check (
    profit_wallet_address is null or profit_wallet_address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'
  ),
  add constraint xrp_reservations_profit_bounds check (
    (minimum_profit_payment_drops is null and maximum_profit_payment_drops is null)
    or (minimum_profit_payment_drops > 0 and maximum_profit_payment_drops >= minimum_profit_payment_drops)
  ),
  add constraint xrp_reservations_expense_reserve_nonnegative check (
    expense_reserve_drops is null or expense_reserve_drops >= 0
  ),
  add constraint xrp_reservations_xrpl_fee_cap_positive check (
    maximum_xrpl_fee_drops is null or maximum_xrpl_fee_drops > 0
  ),
  add constraint xrp_reservations_split_wallets_distinct check (
    settlement_wallet_address is null
    or (
      settlement_wallet_address <> xrpl_destination
      and settlement_wallet_address <> profit_wallet_address
      and xrpl_destination <> profit_wallet_address
    )
  );

comment on column public.xrp_acceptance_reservations.settlement_wallet_address is
  'VoicePay-controlled XRPL wallet that receives FAssets redemption before exact customer and profit payouts.';
comment on column public.xrp_acceptance_reservations.expense_reserve_drops is
  'Immutable quote-authorized XRP-equivalent expense recovery retained before profit is paid.';
comment on column public.xrp_acceptance_reservations.maximum_xrpl_fee_drops is
  'Per-payment fee ceiling enforced before either XRPL transaction is signed.';

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
  p_settlement_wallet_address text,
  p_profit_wallet_address text,
  p_minimum_profit_payment_drops numeric,
  p_maximum_profit_payment_drops numeric,
  p_expense_reserve_drops numeric,
  p_maximum_xrpl_fee_drops numeric,
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
  if p_source_sender !~ '^0x[0-9a-fA-F]{40}$'
    or p_source_destination !~ '^0x[0-9a-fA-F]{40}$'
    or lower(p_source_sender) = lower(p_source_destination) then
    raise exception 'invalid or identical Hyperliquid funding accounts';
  end if;
  if p_xrpl_destination !~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'
    or p_settlement_wallet_address !~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'
    or p_profit_wallet_address !~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'
    or p_xrpl_destination = p_settlement_wallet_address
    or p_xrpl_destination = p_profit_wallet_address
    or p_settlement_wallet_address = p_profit_wallet_address then
    raise exception 'customer, settlement, and profit XRPL wallets must be valid and distinct';
  end if;
  if p_minimum_profit_payment_drops <= 0
    or p_maximum_profit_payment_drops < p_minimum_profit_payment_drops
    or p_expense_reserve_drops < 0
    or p_maximum_xrpl_fee_drops <= 0 then
    raise exception 'invalid split-settlement XRP amount controls';
  end if;

  v_reservation_id := fxrp_private.reserve_xrp_acceptance(
    p_invoice_id, p_idempotency_key, p_source_asset_key, p_source_amount_base_units,
    p_source_destination, p_source_decimals, p_settlement_amount_drops,
    p_xrpl_destination, p_xrpl_destination_tag, p_route_profile, p_route,
    p_quote_expires_at, p_slippage_bps, p_total_fees_bps, p_reservation_expires_at
  );

  select * into v_existing
  from public.xrp_acceptance_reservations
  where id = v_reservation_id
  for update;

  if v_existing.source_sender is not null then
    if lower(v_existing.source_sender) <> lower(p_source_sender)
      or v_existing.settlement_wallet_address is distinct from p_settlement_wallet_address
      or v_existing.profit_wallet_address is distinct from p_profit_wallet_address
      or v_existing.minimum_profit_payment_drops is distinct from p_minimum_profit_payment_drops
      or v_existing.maximum_profit_payment_drops is distinct from p_maximum_profit_payment_drops
      or v_existing.expense_reserve_drops is distinct from p_expense_reserve_drops
      or v_existing.maximum_xrpl_fee_drops is distinct from p_maximum_xrpl_fee_drops then
      raise exception 'idempotency key belongs to different funding or split-settlement controls';
    end if;
  else
    update public.xrp_acceptance_reservations
    set source_sender = lower(p_source_sender),
        settlement_wallet_address = p_settlement_wallet_address,
        profit_wallet_address = p_profit_wallet_address,
        minimum_profit_payment_drops = p_minimum_profit_payment_drops,
        maximum_profit_payment_drops = p_maximum_profit_payment_drops,
        expense_reserve_drops = p_expense_reserve_drops,
        maximum_xrpl_fee_drops = p_maximum_xrpl_fee_drops,
        updated_at = clock_timestamp()
    where id = v_reservation_id;
  end if;
  return v_reservation_id;
end;
$$;

create or replace function public.reserve_xrp_acceptance(
  p_invoice_id uuid, p_idempotency_key text, p_source_asset_key text,
  p_source_amount_base_units numeric, p_source_sender text, p_source_destination text,
  p_source_decimals integer, p_settlement_amount_drops numeric, p_xrpl_destination text,
  p_xrpl_destination_tag bigint, p_route_profile text, p_route jsonb,
  p_quote_expires_at timestamptz, p_slippage_bps integer, p_total_fees_bps integer,
  p_reservation_expires_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'split-settlement wallet and XRP amount controls are required';
end;
$$;

create or replace function public.claim_fxrp_acceptance(p_reservation_id uuid)
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
  select * into v_reservation from public.xrp_acceptance_reservations
  where id = p_reservation_id for update;
  if not found then raise exception 'acceptance reservation not found'; end if;

  if v_reservation.status = 'reserved'
    and (v_reservation.expires_at <= v_now or v_reservation.quote_expires_at <= v_now) then
    update public.xrp_acceptance_reservations
    set status = 'released', failure_code = 'reservation_expired', released_at = v_now, updated_at = v_now
    where id = p_reservation_id;
  end if;

  if v_reservation.status = 'funds_observed' and (
    v_reservation.source_sender is null
    or v_reservation.settlement_wallet_address is null
    or v_reservation.profit_wallet_address is null
    or v_reservation.minimum_profit_payment_drops is null
    or v_reservation.maximum_profit_payment_drops is null
    or v_reservation.expense_reserve_drops is null
    or v_reservation.maximum_xrpl_fee_drops is null
  ) then
    update public.xrp_acceptance_reservations
    set status = 'manual_review', failure_code = 'missing_split_settlement_authorization', updated_at = v_now
    where id = p_reservation_id;
  end if;

  v_result := fxrp_private.claim_fxrp_acceptance(p_reservation_id);
  select * into v_reservation from public.xrp_acceptance_reservations where id = p_reservation_id;
  return v_result || jsonb_build_object(
    'sourceSender', v_reservation.source_sender,
    'createdAt', trunc(extract(epoch from v_reservation.created_at) * 1000)::bigint,
    'expiresAt', trunc(extract(epoch from v_reservation.expires_at) * 1000)::bigint,
    'settlementWalletAddress', v_reservation.settlement_wallet_address,
    'profitWalletAddress', v_reservation.profit_wallet_address,
    'minimumProfitPaymentDrops', v_reservation.minimum_profit_payment_drops::text,
    'maximumProfitPaymentDrops', v_reservation.maximum_profit_payment_drops::text,
    'expenseReserveDrops', v_reservation.expense_reserve_drops::text,
    'maximumXrplFeeDrops', v_reservation.maximum_xrpl_fee_drops::text
  );
end;
$$;

create or replace function public.finalize_fxrp_acceptance(p_reservation_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reservation public.xrp_acceptance_reservations%rowtype;
  v_run public.fxrp_conversion_runs%rowtype;
  v_incoming numeric;
  v_customer numeric;
  v_customer_fee numeric;
  v_profit numeric;
  v_profit_fee numeric;
  v_remainder numeric;
begin
  select * into v_reservation from public.xrp_acceptance_reservations
  where id = p_reservation_id for update;
  if not found then raise exception 'acceptance reservation not found'; end if;
  select * into v_run from public.fxrp_conversion_runs
  where conversion_id = p_reservation_id for update;
  if not found then raise exception 'FXRP conversion run not found'; end if;

  if v_run.status = 'xrpl_settled' then
    if v_reservation.funding_evidence ->> 'observationStatus' is distinct from 'exact'
      or v_run.intent #>> '{acceptance,funding,observationStatus}' is distinct from 'exact'
      or lower(v_run.intent #>> '{acceptance,sourceSender}') is distinct from lower(v_reservation.source_sender)
      or lower(v_run.intent #>> '{acceptance,funding,source}') is distinct from lower(v_reservation.source_sender)
      or (v_run.intent #>> '{acceptance,funding,ledgerTime}')::bigint is distinct from
        (v_reservation.funding_evidence ->> 'ledgerTime')::bigint
      or v_run.intent #>> '{acceptance,settlementWalletAddress}' is distinct from v_reservation.settlement_wallet_address
      or v_run.intent #>> '{acceptance,profitWalletAddress}' is distinct from v_reservation.profit_wallet_address
      or (v_run.intent #>> '{acceptance,minimumProfitPaymentDrops}')::numeric is distinct from v_reservation.minimum_profit_payment_drops
      or (v_run.intent #>> '{acceptance,maximumProfitPaymentDrops}')::numeric is distinct from v_reservation.maximum_profit_payment_drops
      or (v_run.intent #>> '{acceptance,expenseReserveDrops}')::numeric is distinct from v_reservation.expense_reserve_drops
      or (v_run.intent #>> '{acceptance,maximumXrplFeeDrops}')::numeric is distinct from v_reservation.maximum_xrpl_fee_drops
      or v_run.evidence #>> '{settlement,settlementWalletAddress}' is distinct from v_reservation.settlement_wallet_address
      or v_run.evidence #>> '{settlement,customerPayment,sourceAddress}' is distinct from v_reservation.settlement_wallet_address
      or v_run.evidence #>> '{settlement,customerPayment,destinationAddress}' is distinct from v_reservation.xrpl_destination
      or (v_run.evidence #>> '{settlement,customerPayment,destinationTag}')::bigint is distinct from v_reservation.xrpl_destination_tag
      or v_run.evidence #>> '{settlement,customerPayment,validated,sourceAddress}' is distinct from v_reservation.settlement_wallet_address
      or v_run.evidence #>> '{settlement,customerPayment,validated,destinationAddress}' is distinct from v_reservation.xrpl_destination
      or v_run.evidence #>> '{settlement,profitPayment,sourceAddress}' is distinct from v_reservation.settlement_wallet_address
      or v_run.evidence #>> '{settlement,profitPayment,destinationAddress}' is distinct from v_reservation.profit_wallet_address
      or v_run.evidence #>> '{settlement,profitPayment,validated,sourceAddress}' is distinct from v_reservation.settlement_wallet_address
      or v_run.evidence #>> '{settlement,profitPayment,validated,destinationAddress}' is distinct from v_reservation.profit_wallet_address
      or v_run.evidence #>> '{settlement,customerPayment,transactionHash}' is distinct from v_run.evidence #>> '{settlement,customerPayment,validated,transactionHash}'
      or v_run.evidence #>> '{settlement,profitPayment,transactionHash}' is distinct from v_run.evidence #>> '{settlement,profitPayment,validated,transactionHash}'
      or lower(v_run.evidence #>> '{settlement,customerPayment,transactionHash}') = lower(v_run.evidence #>> '{settlement,profitPayment,transactionHash}')
      or (v_run.evidence #>> '{settlement,profitPayment,validated,ledgerIndex}')::bigint <
        (v_run.evidence #>> '{settlement,customerPayment,validated,ledgerIndex}')::bigint then
      raise exception 'FXRP split-settlement identities or ordering do not match acceptance authorization';
    end if;

    v_incoming := trunc((v_run.evidence #>> '{xrpl,deliveredXrp}')::numeric * 1000000);
    v_customer := (v_run.evidence #>> '{settlement,customerPayment,validated,deliveredDrops}')::numeric;
    v_customer_fee := (v_run.evidence #>> '{settlement,customerPayment,validated,feeDrops}')::numeric;
    v_profit := (v_run.evidence #>> '{settlement,profitPayment,validated,deliveredDrops}')::numeric;
    v_profit_fee := (v_run.evidence #>> '{settlement,profitPayment,validated,feeDrops}')::numeric;
    v_remainder := (v_run.evidence #>> '{settlement,safetyRemainderDrops}')::numeric;
    if v_customer is distinct from v_reservation.settlement_amount_drops
      or v_profit < v_reservation.minimum_profit_payment_drops
      or v_profit > v_reservation.maximum_profit_payment_drops
      or v_customer_fee <= 0 or v_customer_fee > v_reservation.maximum_xrpl_fee_drops
      or v_profit_fee <= 0 or v_profit_fee > v_reservation.maximum_xrpl_fee_drops
      or v_remainder < 0
      or (v_run.evidence #>> '{settlement,expenseReserveDrops}')::numeric is distinct from v_reservation.expense_reserve_drops
      or v_incoming <> v_customer + v_customer_fee + v_reservation.expense_reserve_drops
        + v_profit + v_profit_fee + v_remainder then
      raise exception 'FXRP split-settlement amount conservation or payout limits failed';
    end if;
  end if;

  return fxrp_private.finalize_fxrp_acceptance(p_reservation_id);
end;
$$;

revoke all on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, text, integer, numeric, text, bigint,
  text, text, numeric, numeric, numeric, numeric, text, jsonb,
  timestamptz, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, text, integer, numeric, text, bigint,
  text, text, numeric, numeric, numeric, numeric, text, jsonb,
  timestamptz, integer, integer, timestamptz
) to service_role;

revoke all on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, text, text, integer, numeric, text, bigint,
  text, jsonb, timestamptz, integer, integer, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function public.claim_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.claim_fxrp_acceptance(uuid) to service_role;
revoke all on function public.finalize_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.finalize_fxrp_acceptance(uuid) to service_role;

;
