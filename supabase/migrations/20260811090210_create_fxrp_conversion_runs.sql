create table public.fxrp_conversion_runs (
  conversion_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  environment text not null default 'testnet' check (environment = 'testnet'),
  status text not null default 'created' check (
    status in (
      'created',
      'quoted',
      'order_submitted',
      'spot_filled',
      'core_to_evm_submitted',
      'evm_received',
      'oft_submitted',
      'redemption_requested',
      'xrpl_settled',
      'failed',
      'manual_review'
    )
  ),
  version integer not null default 1 check (version > 0),
  intent jsonb not null check (
    jsonb_typeof(intent) = 'object'
    and (intent ->> 'conversionId')::uuid = conversion_id
    and (intent ->> 'userId')::uuid = user_id
  ),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  last_error jsonb check (last_error is null or jsonb_typeof(last_error) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fxrp_conversion_runs is
  'Testnet-only USDC-to-FXRP-to-XRPL conversion state. Never stores wallet private keys, seeds, signatures, or production secrets.';

comment on column public.fxrp_conversion_runs.intent is
  'Immutable testnet conversion input: budget, slippage cap, XRPL destination, and optional destination tag.';

comment on column public.fxrp_conversion_runs.evidence is
  'Public identifiers and verified stage results only: market metadata, client order ID, fills, transaction hashes, LayerZero GUID, redemption, and XRPL settlement.';

create index fxrp_conversion_runs_user_created_idx
  on public.fxrp_conversion_runs (user_id, created_at desc);

create index fxrp_conversion_runs_active_status_idx
  on public.fxrp_conversion_runs (status, updated_at)
  where status not in ('xrpl_settled', 'failed', 'manual_review');

alter table public.fxrp_conversion_runs enable row level security;

revoke all on table public.fxrp_conversion_runs from anon, authenticated;
grant select, insert on table public.fxrp_conversion_runs to authenticated;
grant select, insert, update, delete on table public.fxrp_conversion_runs to service_role;

create policy "Users can read their FXRP conversion runs"
on public.fxrp_conversion_runs
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create testnet FXRP conversion intents"
on public.fxrp_conversion_runs
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and environment = 'testnet'
  and status = 'created'
  and version = 1
  and evidence = '{}'::jsonb
  and last_error is null
);

;
