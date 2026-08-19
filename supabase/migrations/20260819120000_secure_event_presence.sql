-- Expose only an aggregate live-room presence count. Raw viewer identities and
-- direct heartbeat writes are removed from browser access.

revoke select, insert, update, delete on public.event_presence from authenticated;

drop policy if exists event_presence_read on public.event_presence;
drop policy if exists event_presence_own_write on public.event_presence;
drop policy if exists event_presence_own_update on public.event_presence;

create index if not exists event_presence_event_last_seen_idx
  on public.event_presence (event_id, last_seen_at desc);

create or replace function public.touch_event_presence(_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
  _active_count integer;
begin
  if _actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  perform 1
  from public.events e
  where e.id = _event_id
    and e.status <> 'canceled';

  if not found then
    raise exception 'Live event not found.' using errcode = 'P0002';
  end if;

  delete from public.event_presence p
  where p.event_id = _event_id
    and p.last_seen_at < now() - interval '5 minutes';

  insert into public.event_presence (event_id, user_id, last_seen_at)
  values (_event_id, _actor, now())
  on conflict (event_id, user_id)
  do update set last_seen_at = excluded.last_seen_at;

  select count(*)::integer
  into _active_count
  from public.event_presence p
  where p.event_id = _event_id
    and p.last_seen_at >= now() - interval '90 seconds';

  return _active_count;
end;
$$;

revoke all on function public.touch_event_presence(uuid) from public, anon;
grant execute on function public.touch_event_presence(uuid) to authenticated;
