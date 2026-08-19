create table public.xrp_acceptance_policies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  environment text not null default 'testnet' check (environment in ('testnet', 'production')),
  enabled boolean not null default false,
  minimum_payment_drops numeric(78, 0) not null check (minimum_payment_drops > 0),
  maximum_payment_drops numeric(78, 0) not null check (maximum_payment_drops >= minimum_payment_drops),
  rolling_24_hour_limit_drops numeric(78, 0) not null check (rolling_24_hour_limit_drops >= maximum_payment_drops),
  open_exposure_limit_drops numeric(78, 0) not null check (open_exposure_limit_drops >= maximum_payment_drops),
  maximum_overpayment_bps integer not null default 0 check (maximum_overpayment_bps between 0 and 10000),
  maximum_slippage_bps integer not null check (maximum_slippage_bps between 0 and 10000),
  maximum_total_fees_bps integer not null check (maximum_total_fees_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.xrp_accepted_assets (
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_key text not null check (asset_key ~ '^[a-z0-9-]+:.+$'),
  route_profile text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, asset_key)
);

create table public.xrp_settlement_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  external_reference text not null,
  target_amount_drops numeric(78, 0) not null check (target_amount_drops > 0),
  settled_amount_drops numeric(78, 0) not null default 0 check (settled_amount_drops >= 0),
  status text not null default 'open' check (status in ('open', 'paid', 'expired', 'cancelled', 'manual_review')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, external_reference)
);

create table public.xrp_acceptance_reservations (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.xrp_settlement_invoices(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  source_asset_key text not null,
  source_amount_base_units numeric(78, 0) not null check (source_amount_base_units > 0),
  settlement_amount_drops numeric(78, 0) not null check (settlement_amount_drops > 0),
  route_profile text not null,
  route jsonb not null check (
    jsonb_typeof(route) = 'object'
    and route ->> 'source' = source_asset_key
    and route ->> 'destination' = 'xrpl:XRP'
    and jsonb_typeof(route -> 'legs') = 'array'
  ),
  quote_expires_at timestamptz not null,
  slippage_bps integer not null check (slippage_bps between 0 and 10000),
  total_fees_bps integer not null check (total_fees_bps between 0 and 10000),
  status text not null default 'reserved' check (
    status in ('reserved', 'funds_observed', 'executing', 'settled', 'released', 'manual_review')
  ),
  execution_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(execution_evidence) = 'object'),
  failure_code text,
  expires_at timestamptz not null,
  settled_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index xrp_invoices_user_status_idx
  on public.xrp_settlement_invoices (user_id, status, expires_at);

create index xrp_reservations_invoice_active_idx
  on public.xrp_acceptance_reservations (invoice_id, status, expires_at);

create index xrp_reservations_user_rolling_idx
  on public.xrp_acceptance_reservations (user_id, status, settled_at, expires_at);

comment on table public.xrp_acceptance_policies is
  'Server-enforced XRP settlement limits. The policy row is locked to serialize all capacity reservations for one user.';

comment on table public.xrp_accepted_assets is
  'Explicit asset allowlist. Wallet visibility alone never makes an asset acceptable.';

comment on table public.xrp_acceptance_reservations is
  'Immutable quoted acceptance capacity created before a deposit instruction is exposed. Amounts are integer source base units and XRP drops.';

create or replace function public.reserve_xrp_acceptance(
  p_invoice_id uuid,
  p_idempotency_key text,
  p_source_asset_key text,
  p_source_amount_base_units numeric,
  p_settlement_amount_drops numeric,
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
  v_now timestamptz := clock_timestamp();
  v_invoice public.xrp_settlement_invoices%rowtype;
  v_policy public.xrp_acceptance_policies%rowtype;
  v_asset public.xrp_accepted_assets%rowtype;
  v_existing public.xrp_acceptance_reservations%rowtype;
  v_invoice_reserved numeric(78, 0);
  v_open_exposure numeric(78, 0);
  v_settled_24_hours numeric(78, 0);
  v_invoice_maximum numeric(78, 0);
  v_reservation_id uuid;
begin
  if p_source_amount_base_units <= 0 or trunc(p_source_amount_base_units) <> p_source_amount_base_units then
    raise exception 'source_amount_base_units must be a positive integer';
  end if;
  if p_settlement_amount_drops <= 0 or trunc(p_settlement_amount_drops) <> p_settlement_amount_drops then
    raise exception 'settlement_amount_drops must be a positive integer';
  end if;
  if p_quote_expires_at <= v_now or p_reservation_expires_at <= v_now then
    raise exception 'quote and reservation must both be unexpired';
  end if;
  if p_reservation_expires_at > p_quote_expires_at then
    raise exception 'reservation cannot outlive its quote';
  end if;
  if jsonb_typeof(p_route) <> 'object'
    or p_route ->> 'source' <> p_source_asset_key
    or p_route ->> 'destination' <> 'xrpl:XRP'
    or jsonb_typeof(p_route -> 'legs') <> 'array' then
    raise exception 'route does not match the requested source and XRP destination';
  end if;

  select * into v_invoice
  from public.xrp_settlement_invoices
  where id = p_invoice_id
  for update;
  if not found then raise exception 'invoice not found'; end if;

  -- This is the merchant-wide serialization point for invoice, rolling, and exposure limits.
  select * into v_policy
  from public.xrp_acceptance_policies
  where user_id = v_invoice.user_id
  for update;
  if not found or not v_policy.enabled then raise exception 'XRP acceptance is disabled'; end if;
  if v_invoice.status <> 'open' or v_invoice.expires_at <= v_now then raise exception 'invoice is not open'; end if;

  select * into v_existing
  from public.xrp_acceptance_reservations
  where user_id = v_invoice.user_id and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.invoice_id <> p_invoice_id
      or v_existing.source_asset_key <> p_source_asset_key
      or v_existing.source_amount_base_units <> p_source_amount_base_units
      or v_existing.settlement_amount_drops <> p_settlement_amount_drops
      or v_existing.route_profile <> p_route_profile
      or v_existing.route <> p_route then
      raise exception 'idempotency key belongs to a different immutable acceptance request';
    end if;
    return v_existing.id;
  end if;

  select * into v_asset
  from public.xrp_accepted_assets
  where user_id = v_invoice.user_id and asset_key = p_source_asset_key;
  if not found or not v_asset.enabled then raise exception 'source asset is not allowlisted'; end if;
  if v_asset.route_profile <> p_route_profile then raise exception 'route profile is not approved for the source asset'; end if;
  if p_slippage_bps not between 0 and v_policy.maximum_slippage_bps then raise exception 'slippage limit exceeded'; end if;
  if p_total_fees_bps not between 0 and v_policy.maximum_total_fees_bps then raise exception 'total fee limit exceeded'; end if;
  if p_settlement_amount_drops < v_policy.minimum_payment_drops then raise exception 'payment is below the minimum'; end if;
  if p_settlement_amount_drops > v_policy.maximum_payment_drops then raise exception 'per-payment limit exceeded'; end if;

  update public.xrp_acceptance_reservations
  set status = 'released', failure_code = 'reservation_expired', released_at = v_now, updated_at = v_now
  where user_id = v_invoice.user_id and status = 'reserved' and expires_at <= v_now;

  select coalesce(sum(settlement_amount_drops), 0) into v_invoice_reserved
  from public.xrp_acceptance_reservations
  where invoice_id = p_invoice_id and status in ('reserved', 'funds_observed', 'executing');

  select coalesce(sum(settlement_amount_drops), 0) into v_open_exposure
  from public.xrp_acceptance_reservations
  where user_id = v_invoice.user_id and status in ('reserved', 'funds_observed', 'executing');

  select coalesce(sum(settlement_amount_drops), 0) into v_settled_24_hours
  from public.xrp_acceptance_reservations
  where user_id = v_invoice.user_id and status = 'settled' and settled_at >= v_now - interval '24 hours';

  v_invoice_maximum := v_invoice.target_amount_drops
    + trunc(v_invoice.target_amount_drops * v_policy.maximum_overpayment_bps / 10000);

  if v_invoice.settled_amount_drops + v_invoice_reserved + p_settlement_amount_drops > v_invoice_maximum then
    raise exception 'invoice remaining amount exceeded';
  end if;
  if v_open_exposure + p_settlement_amount_drops > v_policy.open_exposure_limit_drops then
    raise exception 'open exposure limit exceeded';
  end if;
  if v_settled_24_hours + v_open_exposure + p_settlement_amount_drops > v_policy.rolling_24_hour_limit_drops then
    raise exception 'rolling 24-hour limit exceeded';
  end if;

  insert into public.xrp_acceptance_reservations (
    invoice_id, user_id, idempotency_key, source_asset_key, source_amount_base_units,
    settlement_amount_drops, route_profile, route, quote_expires_at, slippage_bps,
    total_fees_bps, expires_at
  ) values (
    p_invoice_id, v_invoice.user_id, p_idempotency_key, p_source_asset_key, p_source_amount_base_units,
    p_settlement_amount_drops, p_route_profile, p_route, p_quote_expires_at, p_slippage_bps,
    p_total_fees_bps, p_reservation_expires_at
  ) returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

alter table public.xrp_acceptance_policies enable row level security;
alter table public.xrp_accepted_assets enable row level security;
alter table public.xrp_settlement_invoices enable row level security;
alter table public.xrp_acceptance_reservations enable row level security;

revoke all on table public.xrp_acceptance_policies from anon, authenticated;
revoke all on table public.xrp_accepted_assets from anon, authenticated;
revoke all on table public.xrp_settlement_invoices from anon, authenticated;
revoke all on table public.xrp_acceptance_reservations from anon, authenticated;
grant select on table public.xrp_acceptance_policies, public.xrp_accepted_assets,
  public.xrp_settlement_invoices, public.xrp_acceptance_reservations to authenticated;
grant select, insert, update, delete on table public.xrp_acceptance_policies, public.xrp_accepted_assets,
  public.xrp_settlement_invoices, public.xrp_acceptance_reservations to service_role;

revoke all on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, numeric, text, jsonb, timestamptz, integer, integer, timestamptz
) from public, anon, authenticated;
grant execute on function public.reserve_xrp_acceptance(
  uuid, text, text, numeric, numeric, text, jsonb, timestamptz, integer, integer, timestamptz
) to service_role;

create policy "Users can read their XRP acceptance policy"
on public.xrp_acceptance_policies for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their accepted XRP assets"
on public.xrp_accepted_assets for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their XRP settlement invoices"
on public.xrp_settlement_invoices for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their XRP acceptance reservations"
on public.xrp_acceptance_reservations for select to authenticated
using ((select auth.uid()) = user_id);

;
