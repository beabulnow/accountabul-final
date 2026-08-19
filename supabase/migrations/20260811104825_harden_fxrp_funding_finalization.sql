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
    v_reservation.funding_evidence ->> 'observationStatus' is distinct from 'exact'
    or v_run.intent #>> '{acceptance,funding,observationStatus}' is distinct from 'exact'
    or lower(v_run.intent #>> '{acceptance,sourceSender}') is distinct from lower(v_reservation.source_sender)
    or lower(v_run.intent #>> '{acceptance,funding,source}') is distinct from lower(v_reservation.source_sender)
    or (v_run.intent #>> '{acceptance,funding,ledgerTime}')::bigint is distinct from
      (v_reservation.funding_evidence ->> 'ledgerTime')::bigint
  ) then
    raise exception 'FXRP run funding attribution does not match the exact acceptance observation';
  end if;

  return fxrp_private.finalize_fxrp_acceptance(p_reservation_id);
end;
$$;

revoke all on function public.finalize_fxrp_acceptance(uuid) from public, anon, authenticated;
grant execute on function public.finalize_fxrp_acceptance(uuid) to service_role;

;
