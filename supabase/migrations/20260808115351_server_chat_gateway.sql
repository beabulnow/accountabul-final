-- Phase 3: make chat writes server-only and enforce moderation/rate limits
-- transactionally. The server function calls this RPC with the member JWT;
-- auth.uid() remains the source of identity.

drop policy if exists chat_messages_insert on public.chat_messages;
revoke insert on public.chat_messages from authenticated;

create or replace function public.send_chat_message(_event_id uuid, _body text)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid := auth.uid();
  _normalized_body text := btrim(_body);
  _message public.chat_messages;
begin
  if _user_id is null then
    raise exception 'Authentication required';
  end if;

  if _normalized_body is null or length(_normalized_body) not between 1 and 500 then
    raise exception 'Message length is invalid';
  end if;

  -- Serialize sends for this member/room so concurrent requests cannot race
  -- through the rolling-window count.
  perform pg_advisory_xact_lock(hashtextextended(_user_id::text || ':' || _event_id::text, 0));

  if public.is_chat_banned(_event_id, _user_id) then
    raise exception 'Chat moderation restriction';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = _event_id
      and e.chat_enabled = true
      and e.status in ('scheduled', 'live', 'replay_available')
  ) then
    raise exception 'Chat is unavailable';
  end if;

  if (
    select count(*)
    from public.chat_messages m
    where m.event_id = _event_id
      and m.user_id = _user_id
      and m.created_at > now() - interval '10 seconds'
  ) >= 5 then
    raise exception 'Chat rate limit exceeded';
  end if;

  insert into public.chat_messages (event_id, user_id, body, kind, is_hidden)
  values (_event_id, _user_id, _normalized_body, 'message', false)
  returning * into _message;

  return _message;
end;
$$;

revoke all on function public.send_chat_message(uuid, text) from public, anon;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
grant execute on function public.send_chat_message(uuid, text) to service_role;
