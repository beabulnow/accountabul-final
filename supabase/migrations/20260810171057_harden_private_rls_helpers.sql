-- Keep privileged RLS helpers out of the exposed public API schema while
-- preserving the existing public RPC and view contracts used by the app.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.has_role(uuid, public.app_role) set schema private;
alter function public.is_business_member(uuid, uuid) set schema private;
alter function public.can_manage_business(uuid, uuid) set schema private;
alter function public.is_business_owner(uuid, uuid) set schema private;
alter function public.is_chat_banned(uuid, uuid) set schema private;
alter function public.can_manage_property_media_object(text, uuid) set schema private;
alter function public.can_read_public_property_media_object(text) set schema private;

-- These helpers are used by RLS policies. Restrict identity checks to the
-- calling JWT so their compatibility wrappers cannot probe another member.
create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(_user_id = (select auth.uid()), false)
    and exists (
      select 1
      from public.user_roles
      where user_id = _user_id
        and role = _role
        and revoked_at is null
    );
$$;

create or replace function private.is_business_member(_business_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(_user_id = (select auth.uid()), false)
    and exists (
      select 1
      from public.business_members
      where business_id = _business_id
        and user_id = _user_id
        and invitation_status = 'active'
    );
$$;

create or replace function private.can_manage_business(_business_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(_user_id = (select auth.uid()), false)
    and exists (
      select 1
      from public.business_members
      where business_id = _business_id
        and user_id = _user_id
        and invitation_status = 'active'
        and membership_role in ('owner', 'manager')
    );
$$;

create or replace function private.is_business_owner(_business_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(_user_id = (select auth.uid()), false)
    and exists (
      select 1
      from public.business_members
      where business_id = _business_id
        and user_id = _user_id
        and invitation_status = 'active'
        and membership_role = 'owner'
    );
$$;

create or replace function private.is_chat_banned(_event_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(_user_id = (select auth.uid()), false)
    and exists (
      select 1
      from public.chat_moderation_actions a
      where a.target_user_id = _user_id
        and a.action = 'ban'
        and (a.event_id is null or a.event_id = _event_id)
        and (a.expires_at is null or a.expires_at > now())
    );
$$;

-- Storage policies keep using these functions through their tracked function
-- dependencies, but the functions are no longer callable as public RPCs.
create or replace function private.can_manage_property_media_object(_name text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(_user_id = (select auth.uid()), false)
    and exists (
      select 1
      from public.properties p
      where p.id::text = (storage.foldername(_name))[2]
        and p.business_id::text = (storage.foldername(_name))[1]
        and (
          private.can_manage_business(p.business_id, _user_id)
          or private.has_role(_user_id, 'admin')
        )
    );
$$;

create or replace function private.can_read_public_property_media_object(_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.properties p
    join public.businesses b on b.id = p.business_id
    where p.id::text = (storage.foldername(_name))[2]
      and p.business_id::text = (storage.foldername(_name))[1]
      and p.status = 'published'
      and b.profile_status = 'published'
      and b.public_profile_enabled = true
  );
$$;

-- Compatibility wrappers preserve existing function names for stored
-- procedures and generated clients. The privileged implementation remains in
-- the unexposed private schema and validates the JWT identity above.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.has_role(_user_id, _role); $$;

create or replace function public.is_business_member(_business_id uuid, _user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_business_member(_business_id, _user_id); $$;

create or replace function public.can_manage_business(_business_id uuid, _user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.can_manage_business(_business_id, _user_id); $$;

create or replace function public.is_business_owner(_business_id uuid, _user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_business_owner(_business_id, _user_id); $$;

create or replace function public.is_chat_banned(_event_id uuid, _user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_chat_banned(_event_id, _user_id); $$;

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.is_business_member(uuid, uuid) from public, anon;
revoke all on function public.can_manage_business(uuid, uuid) from public, anon;
revoke all on function public.is_business_owner(uuid, uuid) from public, anon;
revoke all on function public.is_chat_banned(uuid, uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_business_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_manage_business(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_business_owner(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_chat_banned(uuid, uuid) to authenticated, service_role;

-- Public directory views retain their names and columns, but now invoke fixed,
-- argument-free private functions rather than running as security-definer views.
create or replace function private.public_business_rows()
returns table (
  id uuid,
  slug text,
  display_name text,
  headline text,
  description text,
  logo_path text,
  cover_path text,
  website_url text,
  public_email text,
  public_phone text,
  year_founded integer,
  employee_count_range text,
  primary_industry text,
  address_city text,
  address_state text,
  address_country text,
  service_areas text[],
  profile_status public.profile_status,
  verification_status public.verification_status,
  public_profile_enabled boolean,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.slug,
    b.display_name,
    b.headline,
    b.description,
    b.logo_path,
    b.cover_path,
    b.website_url,
    b.public_email,
    b.public_phone,
    b.year_founded,
    b.employee_count_range,
    b.primary_industry,
    b.address_city,
    b.address_state,
    b.address_country,
    b.service_areas,
    b.profile_status,
    b.verification_status,
    b.public_profile_enabled,
    b.published_at
  from public.businesses b
  where b.profile_status = 'published'
    and b.public_profile_enabled = true;
$$;

create or replace function private.public_business_credential_rows()
returns table (
  business_id uuid,
  credential_type text,
  issuing_authority text,
  identifier text,
  issued_at date,
  expires_at date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.business_id,
    c.credential_type,
    c.issuing_authority,
    c.identifier,
    c.issued_at,
    c.expires_at
  from public.business_credentials c
  join public.businesses b on b.id = c.business_id
  where c.review_status = 'approved'
    and c.public_display_approved = true
    and b.profile_status = 'published'
    and b.public_profile_enabled = true;
$$;

revoke all on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.is_business_member(uuid, uuid) to authenticated, service_role;
grant execute on function private.can_manage_business(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_business_owner(uuid, uuid) to authenticated, service_role;
grant execute on function private.is_chat_banned(uuid, uuid) to authenticated, service_role;
grant execute on function private.can_manage_property_media_object(text, uuid) to authenticated, service_role;
grant execute on function private.can_read_public_property_media_object(text) to anon, authenticated, service_role;
grant execute on function private.public_business_rows() to anon, authenticated, service_role;
grant execute on function private.public_business_credential_rows() to anon, authenticated, service_role;

create or replace view public.public_businesses
with (security_barrier = true, security_invoker = true)
as
select * from private.public_business_rows();

create or replace view public.public_business_credentials
with (security_barrier = true, security_invoker = true)
as
select * from private.public_business_credential_rows();

revoke all on table public.public_businesses from public, anon, authenticated;
revoke all on table public.public_business_credentials from public, anon, authenticated;
grant select on table public.public_businesses to anon, authenticated, service_role;
grant select on table public.public_business_credentials to anon, authenticated, service_role;
