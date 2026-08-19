create table if not exists public.fxrp_signer_nonces (
  signer_address text primary key,
  last_nonce bigint not null check (last_nonce >= 0),
  updated_at timestamptz not null default now(),
  constraint fxrp_signer_nonces_address_format
    check (signer_address ~ '^0x[0-9a-f]{40}$')
);

alter table public.fxrp_signer_nonces enable row level security;

revoke all on table public.fxrp_signer_nonces from anon, authenticated;
grant select, insert, update on table public.fxrp_signer_nonces to service_role;

create or replace function public.reserve_fxrp_signer_nonce(
  p_signer_address text,
  p_floor_nonce bigint
)
returns bigint
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_signer_address text := lower(p_signer_address);
  v_reserved_nonce bigint;
begin
  if v_signer_address !~ '^0x[0-9a-f]{40}$' then
    raise exception 'invalid signer address' using errcode = '22023';
  end if;

  if p_floor_nonce < 0 then
    raise exception 'nonce floor must be non-negative' using errcode = '22023';
  end if;

  insert into public.fxrp_signer_nonces as signer_nonces (
    signer_address,
    last_nonce,
    updated_at
  ) values (
    v_signer_address,
    p_floor_nonce,
    now()
  )
  on conflict (signer_address) do update
  set last_nonce = greatest(signer_nonces.last_nonce + 1, excluded.last_nonce),
      updated_at = now()
  returning last_nonce into v_reserved_nonce;

  return v_reserved_nonce;
end;
$$;

revoke all on function public.reserve_fxrp_signer_nonce(text, bigint) from public, anon, authenticated;
grant execute on function public.reserve_fxrp_signer_nonce(text, bigint) to service_role;

;
