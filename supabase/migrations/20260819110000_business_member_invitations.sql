-- Secure business membership changes behind narrow, audited RPCs. Browser
-- clients retain RLS-scoped reads but cannot write membership rows directly.

revoke insert, update, delete on public.business_members from authenticated;

drop policy if exists "business_members_insert" on public.business_members;
drop policy if exists "business_members_update" on public.business_members;
drop policy if exists "business_members_delete" on public.business_members;

create or replace function public.invite_business_member(
  _business_id uuid,
  _email text,
  _role public.membership_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
  _normalized_email text := lower(btrim(coalesce(_email, '')));
  _target_user_id uuid;
  _membership_id uuid;
  _existing_status public.invitation_status;
begin
  if _actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if not private.is_business_owner(_business_id, _actor) then
    raise exception 'Only an active business owner may invite members.' using errcode = '42501';
  end if;
  if _role is null or _role = 'owner' then
    raise exception 'Ownership transfer is not supported by invitations.' using errcode = '22023';
  end if;
  if _normalized_email = '' or length(_normalized_email) > 320 then
    raise exception 'Enter a valid account email.' using errcode = '22023';
  end if;

  select u.id
  into _target_user_id
  from auth.users u
  where lower(u.email) = _normalized_email
  limit 1;

  if _target_user_id is null then
    raise exception 'No eligible Accountabul account was found.' using errcode = 'P0002';
  end if;
  if _target_user_id = _actor then
    raise exception 'You already own this business.' using errcode = '22023';
  end if;

  select m.id, m.invitation_status
  into _membership_id, _existing_status
  from public.business_members m
  where m.business_id = _business_id
    and m.user_id = _target_user_id
  for update;

  if _existing_status = 'active' then
    raise exception 'That account is already an active member.' using errcode = '23505';
  end if;

  if _membership_id is null then
    insert into public.business_members (
      business_id,
      user_id,
      membership_role,
      invitation_status,
      invited_by,
      joined_at
    )
    values (
      _business_id,
      _target_user_id,
      _role,
      'invited',
      _actor,
      null
    )
    returning id into _membership_id;
  else
    update public.business_members
    set membership_role = _role,
        invitation_status = 'invited',
        invited_by = _actor,
        joined_at = null,
        updated_at = now()
    where id = _membership_id;
  end if;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    'business_member.invited',
    'business_members',
    _membership_id,
    jsonb_build_object(
      'business_id', _business_id,
      'user_id', _target_user_id,
      'membership_role', _role
    )
  );

  return _membership_id;
end;
$$;

create or replace function public.get_my_business_invitations()
returns table (
  membership_id uuid,
  business_id uuid,
  business_name text,
  membership_role public.membership_role,
  invited_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.business_id,
    b.display_name,
    m.membership_role,
    m.updated_at
  from public.business_members m
  join public.businesses b on b.id = m.business_id
  where m.user_id = auth.uid()
    and m.invitation_status = 'invited'
  order by m.updated_at, m.id;
$$;

create or replace function public.respond_to_business_invitation(
  _membership_id uuid,
  _accept boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
  _business_id uuid;
  _status public.invitation_status;
begin
  if _actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if _accept is null then
    raise exception 'Invitation response is required.' using errcode = '22023';
  end if;

  select m.business_id, m.invitation_status
  into _business_id, _status
  from public.business_members m
  where m.id = _membership_id
    and m.user_id = _actor
  for update;

  if _business_id is null then
    raise exception 'Invitation not found.' using errcode = '42501';
  end if;
  if _status <> 'invited' then
    raise exception 'This invitation is no longer pending.' using errcode = '22023';
  end if;

  update public.business_members
  set invitation_status = case
        when _accept then 'active'::public.invitation_status
        else 'revoked'::public.invitation_status
      end,
      joined_at = case when _accept then now() else null end
  where id = _membership_id;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    case when _accept then 'business_member.accepted' else 'business_member.declined' end,
    'business_members',
    _membership_id,
    jsonb_build_object('business_id', _business_id)
  );

  return _business_id;
end;
$$;

create or replace function public.update_business_member_role(
  _membership_id uuid,
  _role public.membership_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
  _business_id uuid;
  _old_role public.membership_role;
  _status public.invitation_status;
begin
  if _actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if _role is null or _role = 'owner' then
    raise exception 'Ownership transfer requires a separate workflow.' using errcode = '22023';
  end if;

  select m.business_id, m.membership_role, m.invitation_status
  into _business_id, _old_role, _status
  from public.business_members m
  where m.id = _membership_id
  for update;

  if _business_id is null or not private.is_business_owner(_business_id, _actor) then
    raise exception 'Only an active business owner may change member roles.' using errcode = '42501';
  end if;
  if _old_role = 'owner' then
    raise exception 'Owner roles cannot be changed here.' using errcode = '42501';
  end if;
  if _status not in ('invited', 'active') then
    raise exception 'Revoked memberships cannot be changed.' using errcode = '22023';
  end if;

  update public.business_members
  set membership_role = _role
  where id = _membership_id;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    'business_member.role_changed',
    'business_members',
    _membership_id,
    jsonb_build_object('business_id', _business_id, 'from', _old_role, 'to', _role)
  );
end;
$$;

create or replace function public.revoke_business_member(_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
  _business_id uuid;
  _member_role public.membership_role;
  _status public.invitation_status;
begin
  if _actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select m.business_id, m.membership_role, m.invitation_status
  into _business_id, _member_role, _status
  from public.business_members m
  where m.id = _membership_id
  for update;

  if _business_id is null or not private.is_business_owner(_business_id, _actor) then
    raise exception 'Only an active business owner may revoke members.' using errcode = '42501';
  end if;
  if _member_role = 'owner' then
    raise exception 'Owners cannot be revoked here.' using errcode = '42501';
  end if;
  if _status = 'revoked' then
    raise exception 'This membership is already revoked.' using errcode = '22023';
  end if;

  update public.business_members
  set invitation_status = 'revoked'
  where id = _membership_id;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    'business_member.revoked',
    'business_members',
    _membership_id,
    jsonb_build_object('business_id', _business_id, 'membership_role', _member_role)
  );
end;
$$;

revoke all on function public.invite_business_member(uuid, text, public.membership_role)
  from public, anon;
revoke all on function public.get_my_business_invitations() from public, anon;
revoke all on function public.respond_to_business_invitation(uuid, boolean) from public, anon;
revoke all on function public.update_business_member_role(uuid, public.membership_role)
  from public, anon;
revoke all on function public.revoke_business_member(uuid) from public, anon;

grant execute on function public.invite_business_member(uuid, text, public.membership_role)
  to authenticated;
grant execute on function public.get_my_business_invitations() to authenticated;
grant execute on function public.respond_to_business_invitation(uuid, boolean) to authenticated;
grant execute on function public.update_business_member_role(uuid, public.membership_role)
  to authenticated;
grant execute on function public.revoke_business_member(uuid) to authenticated;
