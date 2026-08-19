create table public.fxrp_acceptance_batches (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  status text not null check (status in ('executing', 'settled', 'manual_review')),
  failure_code text,
  source_asset_key text not null,
  source_amount_base_units numeric(78, 0) not null check (source_amount_base_units > 0),
  source_destination text not null check (source_destination ~ '^0x[0-9a-f]{40}$'),
  source_decimals integer not null check (source_decimals between 0 and 30),
  settlement_amount_drops numeric(78, 0) not null check (settlement_amount_drops > 0),
  settlement_wallet_address text not null check (settlement_wallet_address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'),
  profit_wallet_address text not null check (profit_wallet_address ~ '^r[1-9A-HJ-NP-Za-km-z]{24,34}$'),
  minimum_profit_payment_drops numeric(78, 0) not null check (minimum_profit_payment_drops > 0),
  maximum_profit_payment_drops numeric(78, 0) not null check (
    maximum_profit_payment_drops >= minimum_profit_payment_drops
  ),
  expense_reserve_drops numeric(78, 0) not null check (expense_reserve_drops >= 0),
  maximum_xrpl_fee_drops numeric(78, 0) not null check (maximum_xrpl_fee_drops > 0),
  route_profile text not null,
  route jsonb not null check (jsonb_typeof(route) = 'object'),
  quote_expires_at timestamptz not null,
  slippage_bps integer not null check (slippage_bps between 0 and 10000),
  total_fees_bps integer not null check (total_fees_bps between 0 and 10000),
  expires_at timestamptz not null,
  execution_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(execution_evidence) = 'object'),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (settlement_wallet_address <> profit_wallet_address),
  check (expires_at <= quote_expires_at)
);

create table public.fxrp_acceptance_batch_members (
  batch_id uuid not null references public.fxrp_acceptance_batches(id) on delete cascade,
  reservation_id uuid not null unique references public.xrp_acceptance_reservations(id) on delete restrict,
  position integer not null check (position between 0 and 99),
  created_at timestamptz not null default now(),
  primary key (batch_id, position)
);

create index fxrp_acceptance_batches_user_status_idx
  on public.fxrp_acceptance_batches (user_id, status, created_at desc);

comment on table public.fxrp_acceptance_batches is
  'Atomically claimed groups of funded $2 reservations sharing one minimum-size FXRP network conversion.';
comment on table public.fxrp_acceptance_batch_members is
  'Immutable customer payout order. One reservation can belong to only one FXRP batch.';

alter table public.fxrp_acceptance_batches enable row level security;
alter table public.fxrp_acceptance_batch_members enable row level security;

revoke all on table public.fxrp_acceptance_batches, public.fxrp_acceptance_batch_members
  from anon, authenticated;
grant select on table public.fxrp_acceptance_batches, public.fxrp_acceptance_batch_members
  to authenticated;
grant select, insert, update, delete on table public.fxrp_acceptance_batches,
  public.fxrp_acceptance_batch_members to service_role;

create policy "Users can read their FXRP acceptance batches"
on public.fxrp_acceptance_batches for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their FXRP acceptance batch members"
on public.fxrp_acceptance_batch_members for select to authenticated
using (exists (
  select 1 from public.fxrp_acceptance_batches batch
  where batch.id = batch_id and batch.user_id = (select auth.uid())
));

create or replace function fxrp_private.fxrp_acceptance_authorization(p_reservation_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'reservationId', reservation.id,
    'status', reservation.status,
    'failureCode', reservation.failure_code,
    'userId', reservation.user_id,
    'sourceAssetKey', reservation.source_asset_key,
    'sourceAmountBaseUnits', reservation.source_amount_base_units::text,
    'sourceSender', reservation.source_sender,
    'sourceDestination', reservation.source_destination,
    'sourceDecimals', reservation.source_decimals,
    'settlementAmountDrops', reservation.settlement_amount_drops::text,
    'settlementWalletAddress', reservation.settlement_wallet_address,
    'profitWalletAddress', reservation.profit_wallet_address,
    'minimumProfitPaymentDrops', reservation.minimum_profit_payment_drops::text,
    'maximumProfitPaymentDrops', reservation.maximum_profit_payment_drops::text,
    'expenseReserveDrops', reservation.expense_reserve_drops::text,
    'maximumXrplFeeDrops', reservation.maximum_xrpl_fee_drops::text,
    'xrplDestination', reservation.xrpl_destination,
    'destinationTag', reservation.xrpl_destination_tag,
    'routeProfile', reservation.route_profile,
    'route', reservation.route,
    'quoteExpiresAt', trunc(extract(epoch from reservation.quote_expires_at) * 1000)::bigint,
    'slippageBps', reservation.slippage_bps,
    'totalFeesBps', reservation.total_fees_bps,
    'createdAt', trunc(extract(epoch from reservation.created_at) * 1000)::bigint,
    'expiresAt', trunc(extract(epoch from reservation.expires_at) * 1000)::bigint,
    'fundingEvidence', reservation.funding_evidence
  )
  from public.xrp_acceptance_reservations reservation
  where reservation.id = p_reservation_id
$$;

create or replace function public.read_fxrp_acceptance(p_reservation_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select fxrp_private.fxrp_acceptance_authorization(p_reservation_id)
$$;

create or replace function fxrp_private.fxrp_batch_authorization(p_batch_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'batchId', batch.id,
    'status', batch.status,
    'failureCode', batch.failure_code,
    'userId', batch.user_id,
    'sourceAssetKey', batch.source_asset_key,
    'sourceAmountBaseUnits', batch.source_amount_base_units::text,
    'sourceDestination', batch.source_destination,
    'sourceDecimals', batch.source_decimals,
    'settlementAmountDrops', batch.settlement_amount_drops::text,
    'settlementWalletAddress', batch.settlement_wallet_address,
    'profitWalletAddress', batch.profit_wallet_address,
    'minimumProfitPaymentDrops', batch.minimum_profit_payment_drops::text,
    'maximumProfitPaymentDrops', batch.maximum_profit_payment_drops::text,
    'expenseReserveDrops', batch.expense_reserve_drops::text,
    'maximumXrplFeeDrops', batch.maximum_xrpl_fee_drops::text,
    'routeProfile', batch.route_profile,
    'route', batch.route,
    'quoteExpiresAt', trunc(extract(epoch from batch.quote_expires_at) * 1000)::bigint,
    'slippageBps', batch.slippage_bps,
    'totalFeesBps', batch.total_fees_bps,
    'createdAt', trunc(extract(epoch from batch.created_at) * 1000)::bigint,
    'expiresAt', trunc(extract(epoch from batch.expires_at) * 1000)::bigint,
    'members', (
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'position', member.position,
        'reservationId', reservation.id,
        'invoiceId', reservation.invoice_id,
        'sourceAmountBaseUnits', reservation.source_amount_base_units::text,
        'sourceSender', reservation.source_sender,
        'settlementAmountDrops', reservation.settlement_amount_drops::text,
        'xrplDestination', reservation.xrpl_destination,
        'destinationTag', reservation.xrpl_destination_tag,
        'minimumProfitPaymentDrops', reservation.minimum_profit_payment_drops::text,
        'maximumProfitPaymentDrops', reservation.maximum_profit_payment_drops::text,
        'expenseReserveDrops', reservation.expense_reserve_drops::text,
        'quoteExpiresAt', trunc(extract(epoch from reservation.quote_expires_at) * 1000)::bigint,
        'slippageBps', reservation.slippage_bps,
        'totalFeesBps', reservation.total_fees_bps,
        'funding', reservation.funding_evidence
      )) order by member.position)
      from public.fxrp_acceptance_batch_members member
      join public.xrp_acceptance_reservations reservation on reservation.id = member.reservation_id
      where member.batch_id = batch.id
    )
  )
  from public.fxrp_acceptance_batches batch
  where batch.id = p_batch_id
$$;

create or replace function public.claim_fxrp_acceptance_batch(
  p_batch_id uuid,
  p_idempotency_key text,
  p_reservation_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_batch public.fxrp_acceptance_batches%rowtype;
  v_root public.xrp_acceptance_reservations%rowtype;
  v_reservation public.xrp_acceptance_reservations%rowtype;
  v_reservation_id uuid;
  v_position integer := 0;
  v_count integer;
  v_source_total numeric := 0;
  v_settlement_total numeric := 0;
  v_minimum_profit_total numeric := 0;
  v_maximum_profit_total numeric := 0;
  v_expense_total numeric := 0;
  v_quote_expires_at timestamptz := 'infinity';
  v_expires_at timestamptz := 'infinity';
  v_slippage_bps integer := 10000;
  v_total_fees_bps integer := 10000;
begin
  if length(p_idempotency_key) not between 8 and 200 then
    raise exception 'batch idempotency key must contain 8 to 200 characters';
  end if;
  if coalesce(cardinality(p_reservation_ids), 0) not between 2 and 100
    or cardinality(array(select distinct value from unnest(p_reservation_ids) as item(value)))
      <> cardinality(p_reservation_ids) then
    raise exception 'batch must contain 2 to 100 unique reservations';
  end if;

  select * into v_batch from public.fxrp_acceptance_batches
  where id = p_batch_id for update;
  if found then
    if v_batch.idempotency_key <> p_idempotency_key
      or (select array_agg(member.reservation_id order by member.position)
          from public.fxrp_acceptance_batch_members member where member.batch_id = p_batch_id)
        is distinct from p_reservation_ids then
      raise exception 'batch ID or idempotency key belongs to different immutable members';
    end if;
    return fxrp_private.fxrp_batch_authorization(p_batch_id);
  end if;

  perform 1 from public.xrp_acceptance_reservations reservation
  where reservation.id = any(p_reservation_ids)
  order by reservation.id
  for update;
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_reservation_ids) then
    raise exception 'one or more batch reservations do not exist';
  end if;

  select * into v_root from public.xrp_acceptance_reservations
  where id = p_reservation_ids[1];

  foreach v_reservation_id in array p_reservation_ids loop
    select * into v_reservation from public.xrp_acceptance_reservations
    where id = v_reservation_id;
    if v_reservation.status <> 'funds_observed' then
      raise exception 'every batch reservation must be funds_observed';
    end if;
    if v_reservation.expires_at <= v_now or v_reservation.quote_expires_at <= v_now then
      raise exception 'batch contains an expired reservation or quote';
    end if;
    if exists (select 1 from public.fxrp_acceptance_batch_members where reservation_id = v_reservation.id) then
      raise exception 'reservation already belongs to an FXRP batch';
    end if;
    if v_reservation.user_id is distinct from v_root.user_id
      or v_reservation.source_asset_key is distinct from v_root.source_asset_key
      or lower(v_reservation.source_destination) is distinct from lower(v_root.source_destination)
      or v_reservation.source_decimals is distinct from v_root.source_decimals
      or v_reservation.route_profile is distinct from v_root.route_profile
      or v_reservation.route is distinct from v_root.route
      or v_reservation.settlement_wallet_address is distinct from v_root.settlement_wallet_address
      or v_reservation.profit_wallet_address is distinct from v_root.profit_wallet_address
      or v_reservation.maximum_xrpl_fee_drops is distinct from v_root.maximum_xrpl_fee_drops then
      raise exception 'batch reservations do not share immutable network and settlement controls';
    end if;
    if v_reservation.source_sender is null
      or v_reservation.xrpl_destination is null
      or v_reservation.xrpl_destination in (v_root.settlement_wallet_address, v_root.profit_wallet_address)
      or v_reservation.funding_evidence ->> 'observationStatus' is distinct from 'exact'
      or lower(v_reservation.funding_evidence ->> 'source') is distinct from lower(v_reservation.source_sender)
      or lower(v_reservation.funding_evidence ->> 'destination') is distinct from lower(v_root.source_destination)
      or v_reservation.funding_evidence ->> 'assetKey' is distinct from v_root.source_asset_key
      or (v_reservation.funding_evidence ->> 'amountBaseUnits')::numeric
        is distinct from v_reservation.source_amount_base_units
      or (v_reservation.funding_evidence ->> 'confirmed')::boolean is distinct from true
      or (v_reservation.funding_evidence ->> 'confirmations')::numeric < 1
      or not coalesce(
        (v_reservation.funding_evidence ->> 'transactionHash') ~ '^0x[0-9a-fA-F]{64}$',
        false
      ) then
      raise exception 'batch reservation funding or destination evidence is incomplete';
    end if;
    v_source_total := v_source_total + v_reservation.source_amount_base_units;
    v_settlement_total := v_settlement_total + v_reservation.settlement_amount_drops;
    v_minimum_profit_total := v_minimum_profit_total + v_reservation.minimum_profit_payment_drops;
    v_maximum_profit_total := v_maximum_profit_total + v_reservation.maximum_profit_payment_drops;
    v_expense_total := v_expense_total + v_reservation.expense_reserve_drops;
    v_quote_expires_at := least(v_quote_expires_at, v_reservation.quote_expires_at);
    v_expires_at := least(v_expires_at, v_reservation.expires_at);
    v_slippage_bps := least(v_slippage_bps, v_reservation.slippage_bps);
    v_total_fees_bps := least(v_total_fees_bps, v_reservation.total_fees_bps);
  end loop;

  insert into public.fxrp_acceptance_batches (
    id, user_id, idempotency_key, status, source_asset_key, source_amount_base_units,
    source_destination, source_decimals, settlement_amount_drops,
    settlement_wallet_address, profit_wallet_address, minimum_profit_payment_drops,
    maximum_profit_payment_drops, expense_reserve_drops, maximum_xrpl_fee_drops,
    route_profile, route, quote_expires_at, slippage_bps, total_fees_bps, expires_at
  ) values (
    p_batch_id, v_root.user_id, p_idempotency_key, 'executing', v_root.source_asset_key, v_source_total,
    lower(v_root.source_destination), v_root.source_decimals, v_settlement_total,
    v_root.settlement_wallet_address, v_root.profit_wallet_address, v_minimum_profit_total,
    v_maximum_profit_total, v_expense_total, v_root.maximum_xrpl_fee_drops,
    v_root.route_profile, v_root.route, v_quote_expires_at, v_slippage_bps, v_total_fees_bps, v_expires_at
  );

  insert into public.fxrp_acceptance_batch_members (batch_id, reservation_id, position)
  select p_batch_id, value, ordinality::integer - 1
  from unnest(p_reservation_ids) with ordinality item(value, ordinality);

  update public.xrp_acceptance_reservations
  set status = 'executing', updated_at = v_now
  where id = any(p_reservation_ids);

  return fxrp_private.fxrp_batch_authorization(p_batch_id);
end;
$$;

alter function public.claim_fxrp_acceptance(uuid) rename to claim_fxrp_acceptance_single_bridge;
alter function public.claim_fxrp_acceptance_single_bridge(uuid) set schema fxrp_private;

create or replace function public.claim_fxrp_acceptance(p_reservation_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.fxrp_acceptance_batch_members member
    where member.reservation_id = p_reservation_id
  ) then
    raise exception 'reservation belongs to an FXRP batch and cannot be claimed singly';
  end if;
  return fxrp_private.claim_fxrp_acceptance_single_bridge(p_reservation_id);
end;
$$;

create or replace function public.finalize_fxrp_acceptance_batch(p_batch_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_batch public.fxrp_acceptance_batches%rowtype;
  v_run public.fxrp_conversion_runs%rowtype;
  v_member record;
  v_member_json jsonb;
  v_customer jsonb;
  v_profit jsonb;
  v_customer_count integer;
  v_customer_amount numeric := 0;
  v_customer_fees numeric := 0;
  v_customer_hashes text[] := array[]::text[];
  v_last_sequence bigint := -1;
  v_last_ledger bigint := -1;
  v_expected_key text;
  v_expected_memo text;
  v_incoming numeric;
  v_profit_amount numeric;
  v_profit_fee numeric;
  v_remainder numeric;
begin
  select * into v_batch from public.fxrp_acceptance_batches
  where id = p_batch_id for update;
  if not found then raise exception 'FXRP acceptance batch not found'; end if;
  if v_batch.status = 'settled' then return 'settled'; end if;

  perform 1 from public.xrp_acceptance_reservations reservation
  join public.fxrp_acceptance_batch_members member on member.reservation_id = reservation.id
  where member.batch_id = p_batch_id
  order by reservation.id
  for update of reservation;

  perform 1 from public.xrp_settlement_invoices invoice
  where invoice.id in (
    select reservation.invoice_id
    from public.xrp_acceptance_reservations reservation
    join public.fxrp_acceptance_batch_members member on member.reservation_id = reservation.id
    where member.batch_id = p_batch_id
  )
  order by invoice.id
  for update;

  select * into v_run from public.fxrp_conversion_runs
  where conversion_id = p_batch_id for update;
  if not found then raise exception 'FXRP batch conversion run not found'; end if;

  if v_run.status in ('manual_review', 'failed') then
    update public.fxrp_acceptance_batches
    set status = 'manual_review', failure_code = coalesce(v_run.last_error ->> 'code', 'fxrp_batch_terminal_exception'),
        execution_evidence = jsonb_build_object('conversionVersion', v_run.version, 'evidence', v_run.evidence),
        updated_at = v_now
    where id = p_batch_id;
    update public.xrp_acceptance_reservations reservation
    set status = 'manual_review', failure_code = coalesce(v_run.last_error ->> 'code', 'fxrp_batch_terminal_exception'),
        execution_evidence = jsonb_build_object('batchId', p_batch_id, 'conversionVersion', v_run.version, 'evidence', v_run.evidence),
        updated_at = v_now
    from public.fxrp_acceptance_batch_members member
    where member.batch_id = p_batch_id and reservation.id = member.reservation_id;
    update public.xrp_settlement_invoices invoice
    set status = 'manual_review', updated_at = v_now
    where invoice.id in (
      select reservation.invoice_id
      from public.xrp_acceptance_reservations reservation
      join public.fxrp_acceptance_batch_members member on member.reservation_id = reservation.id
      where member.batch_id = p_batch_id
    ) and invoice.status = 'open';
    return 'manual_review';
  end if;

  if v_batch.status <> 'executing' or v_run.status <> 'xrpl_settled' then
    raise exception 'FXRP batch is not ready for finalization';
  end if;
  select count(*) into v_customer_count from public.fxrp_acceptance_batch_members
  where batch_id = p_batch_id;
  if v_customer_count not between 2 and 100
    or coalesce(jsonb_array_length(v_run.intent #> '{acceptance,batch,members}'), -1) <> v_customer_count
    or coalesce(jsonb_array_length(v_run.evidence #> '{settlement,customerPayments}'), -1) <> v_customer_count
    or v_run.user_id is distinct from v_batch.user_id
    or v_run.intent ->> 'conversionId' is distinct from p_batch_id::text
    or v_run.intent ->> 'userId' is distinct from v_batch.user_id::text
    or v_run.intent #>> '{acceptance,reservationId}' is distinct from p_batch_id::text
    or v_run.intent #>> '{acceptance,batch,batchId}' is distinct from p_batch_id::text
    or v_run.intent #>> '{acceptance,sourceAssetKey}' is distinct from v_batch.source_asset_key
    or (v_run.intent #>> '{acceptance,sourceAmountBaseUnits}')::numeric is distinct from v_batch.source_amount_base_units
    or lower(v_run.intent #>> '{acceptance,sourceDestination}') is distinct from lower(v_batch.source_destination)
    or (v_run.intent #>> '{acceptance,sourceDecimals}')::integer is distinct from v_batch.source_decimals
    or (v_run.intent #>> '{acceptance,settlementAmountDrops}')::numeric is distinct from v_batch.settlement_amount_drops
    or v_run.intent #>> '{acceptance,settlementWalletAddress}' is distinct from v_batch.settlement_wallet_address
    or v_run.intent #>> '{acceptance,profitWalletAddress}' is distinct from v_batch.profit_wallet_address
    or (v_run.intent #>> '{acceptance,minimumProfitPaymentDrops}')::numeric is distinct from v_batch.minimum_profit_payment_drops
    or (v_run.intent #>> '{acceptance,maximumProfitPaymentDrops}')::numeric is distinct from v_batch.maximum_profit_payment_drops
    or (v_run.intent #>> '{acceptance,expenseReserveDrops}')::numeric is distinct from v_batch.expense_reserve_drops
    or (v_run.intent #>> '{acceptance,maximumXrplFeeDrops}')::numeric is distinct from v_batch.maximum_xrpl_fee_drops
    or v_run.intent #>> '{acceptance,routeProfile}' is distinct from v_batch.route_profile
    or (v_run.intent #>> '{acceptance,quoteExpiresAt}')::bigint is distinct from
      trunc(extract(epoch from v_batch.quote_expires_at) * 1000)::bigint
    or (v_run.intent #>> '{acceptance,slippageBps}')::integer is distinct from v_batch.slippage_bps
    or (v_run.intent #>> '{acceptance,totalFeesBps}')::integer is distinct from v_batch.total_fees_bps
    or trunc((v_run.intent ->> 'budgetUsdc')::numeric * power(10::numeric, v_batch.source_decimals))
      is distinct from v_batch.source_amount_base_units
    or trunc((v_run.intent ->> 'minimumDeliveredXrp')::numeric * 1000000)
      is distinct from v_batch.settlement_amount_drops
    or v_run.evidence #>> '{settlement,settlementWalletAddress}' is distinct from v_batch.settlement_wallet_address
    or (v_run.evidence #>> '{settlement,expenseReserveDrops}')::numeric is distinct from v_batch.expense_reserve_drops then
    raise exception 'FXRP batch run identity or aggregate authorization does not match the database';
  end if;

  for v_member in
    select member.position, reservation.*
    from public.fxrp_acceptance_batch_members member
    join public.xrp_acceptance_reservations reservation on reservation.id = member.reservation_id
    where member.batch_id = p_batch_id
    order by member.position
  loop
    v_member_json := v_run.intent #> array['acceptance', 'batch', 'members', v_member.position::text];
    v_customer := v_run.evidence #> array['settlement', 'customerPayments', v_member.position::text];
    if jsonb_typeof(v_member_json) is distinct from 'object'
      or jsonb_typeof(v_customer) is distinct from 'object'
      or (v_member_json ->> 'position')::integer is distinct from v_member.position
      or v_member_json ->> 'reservationId' is distinct from v_member.id::text
      or v_member_json ->> 'invoiceId' is distinct from v_member.invoice_id::text
      or (v_member_json ->> 'sourceAmountBaseUnits')::numeric is distinct from v_member.source_amount_base_units
      or lower(v_member_json ->> 'sourceSender') is distinct from lower(v_member.source_sender)
      or (v_member_json ->> 'settlementAmountDrops')::numeric is distinct from v_member.settlement_amount_drops
      or v_member_json ->> 'xrplDestination' is distinct from v_member.xrpl_destination
      or (v_member_json ->> 'destinationTag')::bigint is distinct from v_member.xrpl_destination_tag
      or (v_member_json ->> 'minimumProfitPaymentDrops')::numeric is distinct from v_member.minimum_profit_payment_drops
      or (v_member_json ->> 'maximumProfitPaymentDrops')::numeric is distinct from v_member.maximum_profit_payment_drops
      or (v_member_json ->> 'expenseReserveDrops')::numeric is distinct from v_member.expense_reserve_drops
      or (v_member_json ->> 'quoteExpiresAt')::bigint is distinct from
        trunc(extract(epoch from v_member.quote_expires_at) * 1000)::bigint
      or (v_member_json ->> 'slippageBps')::integer is distinct from v_member.slippage_bps
      or (v_member_json ->> 'totalFeesBps')::integer is distinct from v_member.total_fees_bps
      or v_member_json -> 'funding' is distinct from v_member.funding_evidence then
      raise exception 'FXRP batch member % does not match its reservation', v_member.position;
    end if;

    v_expected_key := p_batch_id::text || ':customer:' || v_member.id::text;
    v_expected_memo := upper(encode(extensions.digest(
      'voicepay:' || p_batch_id::text || ':customer:' || v_member.id::text,
      'sha256'
    ), 'hex'));
    if v_customer ->> 'role' is distinct from 'customer'
      or v_customer ->> 'paymentKey' is distinct from v_expected_key
      or v_customer ->> 'memoData' is distinct from v_expected_memo
      or v_customer ->> 'sourceAddress' is distinct from v_batch.settlement_wallet_address
      or v_customer ->> 'destinationAddress' is distinct from v_member.xrpl_destination
      or (v_customer ->> 'destinationTag')::bigint is distinct from v_member.xrpl_destination_tag
      or (v_customer ->> 'amountDrops')::numeric is distinct from v_member.settlement_amount_drops
      or not coalesce((v_customer ->> 'feeDrops') ~ '^[1-9][0-9]*$', false)
      or (v_customer ->> 'feeDrops')::numeric > v_batch.maximum_xrpl_fee_drops
      or not coalesce((v_customer ->> 'transactionHash') ~ '^[0-9A-Fa-f]{64}$', false)
      or not coalesce((v_customer ->> 'sequence') ~ '^[0-9]+$', false)
      or not coalesce((v_customer ->> 'lastLedgerSequence') ~ '^[1-9][0-9]*$', false)
      or jsonb_typeof(v_customer -> 'acknowledgement') is distinct from 'object'
      or jsonb_typeof(v_customer -> 'validated') is distinct from 'object'
      or not coalesce((v_customer #>> '{validated,sequence}') ~ '^[0-9]+$', false)
      or not coalesce((v_customer #>> '{validated,lastLedgerSequence}') ~ '^[1-9][0-9]*$', false)
      or not coalesce((v_customer #>> '{validated,ledgerIndex}') ~ '^[0-9]+$', false)
      or v_customer #>> '{validated,sourceAddress}' is distinct from v_batch.settlement_wallet_address
      or v_customer #>> '{validated,destinationAddress}' is distinct from v_member.xrpl_destination
      or (v_customer #>> '{validated,destinationTag}')::bigint is distinct from v_member.xrpl_destination_tag
      or (v_customer #>> '{validated,deliveredDrops}')::numeric is distinct from v_member.settlement_amount_drops
      or v_customer #>> '{validated,feeDrops}' is distinct from v_customer ->> 'feeDrops'
      or v_customer #>> '{validated,memoData}' is distinct from v_expected_memo
      or v_customer #>> '{validated,transactionHash}' is distinct from v_customer ->> 'transactionHash'
      or (v_customer #>> '{validated,sequence}')::bigint is distinct from (v_customer ->> 'sequence')::bigint
      or (v_customer #>> '{validated,lastLedgerSequence}')::bigint
        is distinct from (v_customer ->> 'lastLedgerSequence')::bigint
      or (v_customer ->> 'sequence')::bigint <= v_last_sequence
      or (v_customer #>> '{validated,ledgerIndex}')::bigint < v_last_ledger
      or lower(v_customer ->> 'transactionHash') = any(v_customer_hashes) then
      raise exception 'FXRP batch customer payment % failed exact validation', v_member.position;
    end if;
    if v_member.position = 0 and (
      v_run.intent ->> 'xrplDestination' is distinct from v_member.xrpl_destination
      or (v_run.intent ->> 'destinationTag')::bigint is distinct from v_member.xrpl_destination_tag
    ) then
      raise exception 'FXRP batch summary destination does not match its first member';
    end if;
    v_customer_amount := v_customer_amount + (v_customer ->> 'amountDrops')::numeric;
    v_customer_fees := v_customer_fees + (v_customer ->> 'feeDrops')::numeric;
    v_last_sequence := (v_customer ->> 'sequence')::bigint;
    v_last_ledger := (v_customer #>> '{validated,ledgerIndex}')::bigint;
    v_customer_hashes := array_append(v_customer_hashes, lower(v_customer ->> 'transactionHash'));
  end loop;

  v_profit := v_run.evidence #> '{settlement,profitPayment}';
  v_expected_key := p_batch_id::text || ':profit';
  v_expected_memo := upper(encode(extensions.digest(
    'voicepay:' || p_batch_id::text || ':profit', 'sha256'
  ), 'hex'));
  if jsonb_typeof(v_profit) is distinct from 'object'
    or v_profit ->> 'role' is distinct from 'profit'
    or v_profit ->> 'paymentKey' is distinct from v_expected_key
    or v_profit ->> 'memoData' is distinct from v_expected_memo
    or v_profit ->> 'sourceAddress' is distinct from v_batch.settlement_wallet_address
    or v_profit ->> 'destinationAddress' is distinct from v_batch.profit_wallet_address
    or v_profit ->> 'destinationTag' is not null
    or not coalesce((v_profit ->> 'amountDrops') ~ '^[1-9][0-9]*$', false)
    or not coalesce((v_profit ->> 'feeDrops') ~ '^[1-9][0-9]*$', false)
    or (v_profit ->> 'amountDrops')::numeric < v_batch.minimum_profit_payment_drops
    or (v_profit ->> 'amountDrops')::numeric > v_batch.maximum_profit_payment_drops
    or (v_profit ->> 'feeDrops')::numeric > v_batch.maximum_xrpl_fee_drops
    or not coalesce((v_profit ->> 'transactionHash') ~ '^[0-9A-Fa-f]{64}$', false)
    or not coalesce((v_profit ->> 'sequence') ~ '^[0-9]+$', false)
    or not coalesce((v_profit ->> 'lastLedgerSequence') ~ '^[1-9][0-9]*$', false)
    or lower(v_profit ->> 'transactionHash') = any(v_customer_hashes)
    or (v_profit ->> 'sequence')::bigint <= v_last_sequence
    or jsonb_typeof(v_profit -> 'acknowledgement') is distinct from 'object'
    or jsonb_typeof(v_profit -> 'validated') is distinct from 'object'
    or not coalesce((v_profit #>> '{validated,sequence}') ~ '^[0-9]+$', false)
    or not coalesce((v_profit #>> '{validated,lastLedgerSequence}') ~ '^[1-9][0-9]*$', false)
    or not coalesce((v_profit #>> '{validated,ledgerIndex}') ~ '^[0-9]+$', false)
    or v_profit #>> '{validated,sourceAddress}' is distinct from v_batch.settlement_wallet_address
    or v_profit #>> '{validated,destinationAddress}' is distinct from v_batch.profit_wallet_address
    or (v_profit #>> '{validated,deliveredDrops}')::numeric is distinct from (v_profit ->> 'amountDrops')::numeric
    or v_profit #>> '{validated,feeDrops}' is distinct from v_profit ->> 'feeDrops'
    or v_profit #>> '{validated,memoData}' is distinct from v_expected_memo
    or v_profit #>> '{validated,transactionHash}' is distinct from v_profit ->> 'transactionHash'
    or (v_profit #>> '{validated,sequence}')::bigint is distinct from (v_profit ->> 'sequence')::bigint
    or (v_profit #>> '{validated,lastLedgerSequence}')::bigint
      is distinct from (v_profit ->> 'lastLedgerSequence')::bigint
    or (v_profit #>> '{validated,ledgerIndex}')::bigint < v_last_ledger then
    raise exception 'FXRP batch profit payment failed exact validation or customer-first ordering';
  end if;

  if not coalesce((v_run.evidence #>> '{xrpl,deliveredXrp}') ~ '^[0-9]+(\.[0-9]{1,6})?$', false)
    or not coalesce((v_run.evidence #>> '{settlement,safetyRemainderDrops}') ~ '^[0-9]+$', false) then
    raise exception 'FXRP batch incoming XRP or safety remainder is malformed';
  end if;
  v_incoming := trunc((v_run.evidence #>> '{xrpl,deliveredXrp}')::numeric * 1000000);
  v_profit_amount := (v_profit ->> 'amountDrops')::numeric;
  v_profit_fee := (v_profit ->> 'feeDrops')::numeric;
  v_remainder := (v_run.evidence #>> '{settlement,safetyRemainderDrops}')::numeric;
  if v_customer_amount is distinct from v_batch.settlement_amount_drops
    or v_incoming <> v_customer_amount + v_customer_fees + v_batch.expense_reserve_drops
      + v_profit_amount + v_profit_fee + v_remainder then
    raise exception 'FXRP batch XRP amount conservation failed';
  end if;

  update public.xrp_acceptance_reservations reservation
  set status = 'settled', failure_code = null,
      execution_evidence = jsonb_build_object(
        'batchId', p_batch_id,
        'batchPosition', member.position,
        'conversionVersion', v_run.version,
        'customerPayment', v_run.evidence #> array['settlement', 'customerPayments', member.position::text]
      ),
      settled_at = v_now, updated_at = v_now
  from public.fxrp_acceptance_batch_members member
  where member.batch_id = p_batch_id and reservation.id = member.reservation_id;

  with credits as (
    select reservation.invoice_id, sum(reservation.settlement_amount_drops) as amount_drops
    from public.xrp_acceptance_reservations reservation
    join public.fxrp_acceptance_batch_members member on member.reservation_id = reservation.id
    where member.batch_id = p_batch_id
    group by reservation.invoice_id
  )
  update public.xrp_settlement_invoices invoice
  set settled_amount_drops = invoice.settled_amount_drops + credits.amount_drops,
      status = case when invoice.settled_amount_drops + credits.amount_drops >= invoice.target_amount_drops
        then 'paid' else invoice.status end,
      updated_at = v_now
  from credits where invoice.id = credits.invoice_id;

  update public.fxrp_acceptance_batches
  set status = 'settled', failure_code = null,
      execution_evidence = jsonb_build_object('conversionVersion', v_run.version, 'evidence', v_run.evidence),
      settled_at = v_now, updated_at = v_now
  where id = p_batch_id;
  return 'settled';
end;
$$;

alter function public.finalize_fxrp_acceptance(uuid) rename to finalize_fxrp_acceptance_single_bridge;
alter function public.finalize_fxrp_acceptance_single_bridge(uuid) set schema fxrp_private;

create or replace function public.finalize_fxrp_acceptance(p_reservation_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.fxrp_acceptance_batch_members member
    where member.reservation_id = p_reservation_id
  ) then
    raise exception 'reservation belongs to an FXRP batch and cannot be finalized singly';
  end if;
  return fxrp_private.finalize_fxrp_acceptance_single_bridge(p_reservation_id);
end;
$$;

revoke all on function fxrp_private.fxrp_batch_authorization(uuid)
  from public, anon, authenticated;
grant execute on function fxrp_private.fxrp_batch_authorization(uuid) to service_role;
revoke all on function fxrp_private.fxrp_acceptance_authorization(uuid)
  from public, anon, authenticated;
grant execute on function fxrp_private.fxrp_acceptance_authorization(uuid) to service_role;
revoke all on function public.read_fxrp_acceptance(uuid)
  from public, anon, authenticated;
grant execute on function public.read_fxrp_acceptance(uuid) to service_role;
revoke all on function fxrp_private.claim_fxrp_acceptance_single_bridge(uuid)
  from public, anon, authenticated;
grant execute on function fxrp_private.claim_fxrp_acceptance_single_bridge(uuid) to service_role;
revoke all on function fxrp_private.finalize_fxrp_acceptance_single_bridge(uuid)
  from public, anon, authenticated;
grant execute on function fxrp_private.finalize_fxrp_acceptance_single_bridge(uuid) to service_role;
revoke all on function public.claim_fxrp_acceptance_batch(uuid, text, uuid[])
  from public, anon, authenticated;
grant execute on function public.claim_fxrp_acceptance_batch(uuid, text, uuid[]) to service_role;
revoke all on function public.finalize_fxrp_acceptance_batch(uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_fxrp_acceptance_batch(uuid) to service_role;
revoke all on function public.claim_fxrp_acceptance(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_fxrp_acceptance(uuid) to service_role;
revoke all on function public.finalize_fxrp_acceptance(uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_fxrp_acceptance(uuid) to service_role;

;
