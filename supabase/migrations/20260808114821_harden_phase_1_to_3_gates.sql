-- Close the Phase 1-3 authorization gaps discovered during the launch audit.
-- This is forward-only and intentionally contains no destructive table changes.

-- Published businesses are public, but internal ownership/legal columns are not.
revoke select on table public.businesses from anon;
grant select (
  id,
  slug,
  display_name,
  headline,
  description,
  logo_path,
  cover_path,
  website_url,
  public_email,
  public_phone,
  year_founded,
  employee_count_range,
  primary_industry,
  address_city,
  address_state,
  address_country,
  service_areas,
  profile_status,
  verification_status,
  public_profile_enabled,
  published_at
) on table public.businesses to anon;

-- Authenticated users need full rows for businesses they belong to, so column
-- grants cannot safely express both the private member contract and the public
-- contract on the base table. This deliberately owner-executed, security-barrier
-- view is the narrow public API for both anon and authenticated callers.
create or replace view public.public_businesses
with (security_barrier = true)
as
select
  id,
  slug,
  display_name,
  headline,
  description,
  logo_path,
  cover_path,
  website_url,
  public_email,
  public_phone,
  year_founded,
  employee_count_range,
  primary_industry,
  address_city,
  address_state,
  address_country,
  service_areas,
  profile_status,
  verification_status,
  public_profile_enabled,
  published_at
from public.businesses
where profile_status = 'published'
  and public_profile_enabled = true;

revoke all on table public.public_businesses from public, anon, authenticated;
grant select on table public.public_businesses to anon, authenticated, service_role;

create or replace view public.public_business_credentials
with (security_barrier = true)
as
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

revoke all on table public.public_business_credentials from public, anon, authenticated;
grant select on table public.public_business_credentials to anon, authenticated, service_role;

drop policy if exists "businesses_authenticated_read" on public.businesses;
create policy "businesses_authenticated_read" on public.businesses
  for select to authenticated
  using (
    public.is_business_member(id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'moderator')
  );

drop policy if exists "businesses_insert_own" on public.businesses;
create policy "businesses_insert_own" on public.businesses
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and profile_status = 'draft'
    and verification_status = 'unverified'
    and public_profile_enabled = false
    and published_at is null
  );

drop policy if exists properties_insert on public.properties;
create policy properties_insert on public.properties
  for insert to authenticated
  with check (
    (
      public.can_manage_business(business_id, auth.uid())
      and created_by = auth.uid()
      and status = 'draft'
      and published_at is null
    )
    or public.has_role(auth.uid(), 'admin')
  );

-- Review decisions are server-authoritative. Owners may submit or archive their
-- own content, but cannot publish, verify, reject, or back-date publication.
create or replace function public.enforce_business_review_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if row(old.profile_status, old.verification_status, old.public_profile_enabled, old.published_at)
    is distinct from
    row(new.profile_status, new.verification_status, new.public_profile_enabled, new.published_at)
    and not (
      old.profile_status in ('draft', 'rejected')
      and new.profile_status = 'pending_review'
      and new.verification_status = 'pending'
      and new.public_profile_enabled = false
      and new.published_at is not distinct from old.published_at
    ) then
    raise exception 'Business review fields can only be changed by an authorized reviewer.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_enforce_review_transition on public.businesses;
create trigger businesses_enforce_review_transition
  before update on public.businesses
  for each row execute function public.enforce_business_review_transition();

create or replace function public.enforce_property_review_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if row(old.status, old.published_at) is distinct from row(new.status, new.published_at)
    and not (
      (old.status in ('draft', 'rejected') and new.status = 'pending_review' and new.published_at is null)
      or (new.status = 'archived' and new.published_at is not distinct from old.published_at)
      or (old.status = 'archived' and new.status = 'draft' and new.published_at is null)
    ) then
    raise exception 'Property publication fields can only be changed by an authorized reviewer.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists properties_enforce_review_transition on public.properties;
create trigger properties_enforce_review_transition
  before update on public.properties
  for each row execute function public.enforce_property_review_transition();

create or replace function public.enforce_service_review_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if row(old.status, old.published_at) is distinct from row(new.status, new.published_at)
    and not (
      (old.status in ('draft', 'rejected') and new.status = 'pending_review' and new.published_at is null)
      or (new.status = 'archived' and new.published_at is not distinct from old.published_at)
      or (old.status = 'archived' and new.status = 'draft' and new.published_at is null)
    ) then
    raise exception 'Service publication fields can only be changed by an authorized reviewer.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists services_enforce_review_transition on public.services;
create trigger services_enforce_review_transition
  before update on public.services
  for each row execute function public.enforce_service_review_transition();

create or replace function public.enforce_credential_review_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if row(old.review_status, old.reviewed_by, old.reviewed_at, old.public_display_approved)
    is distinct from
    row(new.review_status, new.reviewed_by, new.reviewed_at, new.public_display_approved) then
    raise exception 'Credential review fields can only be changed by an authorized reviewer.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists business_credentials_enforce_review_transition
  on public.business_credentials;
create trigger business_credentials_enforce_review_transition
  before update on public.business_credentials
  for each row execute function public.enforce_credential_review_transition();

-- Ordinary table updates remain scoped to business managers. Reviewers use the
-- narrow RPCs below so reviewer authority cannot be repurposed to edit content.
drop policy if exists "businesses_update_manager" on public.businesses;
create policy "businesses_update_manager" on public.businesses
  for update to authenticated
  using (public.can_manage_business(id, auth.uid()))
  with check (public.can_manage_business(id, auth.uid()));

drop policy if exists "business_credentials_update" on public.business_credentials;
create policy "business_credentials_update" on public.business_credentials
  for update to authenticated
  using (public.can_manage_business(business_id, auth.uid()) and review_status = 'pending')
  with check (public.can_manage_business(business_id, auth.uid()) and review_status = 'pending');

drop policy if exists "business_credentials_insert" on public.business_credentials;
create policy "business_credentials_insert" on public.business_credentials
  for insert to authenticated
  with check (
    (
      public.can_manage_business(business_id, auth.uid())
      and review_status = 'pending'
      and reviewed_by is null
      and reviewed_at is null
      and public_display_approved = false
    )
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists properties_update on public.properties;
create policy properties_update on public.properties
  for update to authenticated
  using (public.can_manage_business(business_id, auth.uid()))
  with check (public.can_manage_business(business_id, auth.uid()));

drop policy if exists services_write on public.services;
drop policy if exists services_insert on public.services;
drop policy if exists services_update on public.services;
drop policy if exists services_delete on public.services;

create policy services_insert on public.services
  for insert to authenticated
  with check (
    (
      public.can_manage_business(business_id, auth.uid())
      and created_by = auth.uid()
      and status = 'draft'
      and published_at is null
    )
    or public.has_role(auth.uid(), 'admin')
  );

create policy services_update on public.services
  for update to authenticated
  using (public.can_manage_business(business_id, auth.uid()))
  with check (public.can_manage_business(business_id, auth.uid()));

create policy services_delete on public.services
  for delete to authenticated
  using (
    public.can_manage_business(business_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

-- Child content is public only while its parent business remains public.
drop policy if exists properties_public_read on public.properties;
create policy properties_public_read on public.properties
  for select to anon
  using (
    status = 'published'
    and exists (
      select 1 from public.public_businesses b
      where b.id = business_id
    )
  );

drop policy if exists properties_auth_read on public.properties;
create policy properties_auth_read on public.properties
  for select to authenticated
  using (
    (
      status = 'published'
      and exists (select 1 from public.public_businesses b where b.id = business_id)
    )
    or public.is_business_member(business_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'moderator')
  );

drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  for select to anon
  using (
    status = 'published'
    and exists (
      select 1 from public.public_businesses b
      where b.id = business_id
    )
  );

drop policy if exists services_auth_read on public.services;
create policy services_auth_read on public.services
  for select to authenticated
  using (
    (
      status = 'published'
      and exists (select 1 from public.public_businesses b where b.id = business_id)
    )
    or public.is_business_member(business_id, auth.uid())
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'moderator')
  );

drop policy if exists property_media_public_read on public.property_media;
create policy property_media_public_read on public.property_media
  for select to anon
  using (
    exists (
      select 1
      from public.properties p
       join public.public_businesses b on b.id = p.business_id
      where p.id = property_id
        and p.status = 'published'
    )
  );

drop policy if exists property_media_auth_read on public.property_media;
create policy property_media_auth_read on public.property_media
  for select to authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and (
          (
            p.status = 'published'
            and exists (select 1 from public.public_businesses b where b.id = p.business_id)
          )
          or public.is_business_member(p.business_id, auth.uid())
          or public.has_role(auth.uid(), 'admin')
          or public.has_role(auth.uid(), 'moderator')
        )
    )
  );

create or replace function public.create_business_with_owner(
  _slug text,
  _legal_name text,
  _display_name text,
  _headline text default null,
  _description text default null,
  _website_url text default null,
  _public_email text default null,
  _public_phone text default null,
  _primary_industry text default null,
  _address_city text default null,
  _address_state text default null,
  _address_country text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
  _business_id uuid;
begin
  if _actor is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if btrim(coalesce(_legal_name, '')) = '' or btrim(coalesce(_display_name, '')) = '' then
    raise exception 'Legal name and display name are required.' using errcode = '22023';
  end if;
  if _slug is null or _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(_slug) > 80 then
    raise exception 'Business slug is invalid.' using errcode = '22023';
  end if;

  insert into public.businesses (
    slug,
    legal_name,
    display_name,
    headline,
    description,
    website_url,
    public_email,
    public_phone,
    primary_industry,
    address_city,
    address_state,
    address_country,
    profile_status,
    verification_status,
    public_profile_enabled,
    created_by
  )
  values (
    _slug,
    btrim(_legal_name),
    btrim(_display_name),
    nullif(btrim(_headline), ''),
    nullif(btrim(_description), ''),
    nullif(btrim(_website_url), ''),
    nullif(btrim(_public_email), ''),
    nullif(btrim(_public_phone), ''),
    nullif(btrim(_primary_industry), ''),
    nullif(btrim(_address_city), ''),
    nullif(btrim(_address_state), ''),
    nullif(btrim(_address_country), ''),
    'draft',
    'unverified',
    false,
    _actor
  )
  returning id into _business_id;

  insert into public.business_members (
    business_id,
    user_id,
    membership_role,
    invitation_status,
    joined_at
  )
  values (_business_id, _actor, 'owner', 'active', now());

  insert into public.audit_log (actor_user_id, action, target_table, target_id)
  values (_actor, 'business.created', 'businesses', _business_id);

  return _business_id;
end;
$$;

create or replace function public.review_business(_business_id uuid, _decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
begin
  if _actor is null or not (
    public.has_role(_actor, 'admin') or public.has_role(_actor, 'moderator')
  ) then
    raise exception 'Only an authorized reviewer may review businesses.' using errcode = '42501';
  end if;
  if _decision not in ('approve', 'reject') then
    raise exception 'Unsupported business review decision.' using errcode = '22023';
  end if;

  update public.businesses
  set profile_status = case
        when _decision = 'approve' then 'published'::public.profile_status
        else 'rejected'::public.profile_status
      end,
      verification_status = case
        when _decision = 'approve' then 'verified'::public.verification_status
        else 'rejected'::public.verification_status
      end,
      public_profile_enabled = (_decision = 'approve'),
      published_at = case when _decision = 'approve' then now() else null end
  where id = _business_id and profile_status = 'pending_review';
  if not found then
    raise exception 'Business is not awaiting review.' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    'business.reviewed',
    'businesses',
    _business_id,
    jsonb_build_object('decision', _decision)
  );
end;
$$;

create or replace function public.review_property(_property_id uuid, _decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
begin
  if _actor is null or not (
    public.has_role(_actor, 'admin') or public.has_role(_actor, 'moderator')
  ) then
    raise exception 'Only an authorized reviewer may review properties.' using errcode = '42501';
  end if;
  if _decision not in ('approve', 'reject') then
    raise exception 'Unsupported property review decision.' using errcode = '22023';
  end if;

  update public.properties
  set status = case
        when _decision = 'approve' then 'published'::public.property_status
        else 'rejected'::public.property_status
      end,
      published_at = case when _decision = 'approve' then now() else null end
  where id = _property_id and status = 'pending_review';
  if not found then
    raise exception 'Property is not awaiting review.' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    'property.reviewed',
    'properties',
    _property_id,
    jsonb_build_object('decision', _decision)
  );
end;
$$;

create or replace function public.review_service(_service_id uuid, _decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
begin
  if _actor is null or not (
    public.has_role(_actor, 'admin') or public.has_role(_actor, 'moderator')
  ) then
    raise exception 'Only an authorized reviewer may review services.' using errcode = '42501';
  end if;
  if _decision not in ('approve', 'reject') then
    raise exception 'Unsupported service review decision.' using errcode = '22023';
  end if;

  update public.services
  set status = case
        when _decision = 'approve' then 'published'::public.service_status
        else 'rejected'::public.service_status
      end,
      published_at = case when _decision = 'approve' then now() else null end
  where id = _service_id and status = 'pending_review';
  if not found then
    raise exception 'Service is not awaiting review.' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    'service.reviewed',
    'services',
    _service_id,
    jsonb_build_object('decision', _decision)
  );
end;
$$;

create or replace function public.review_business_credential(_credential_id uuid, _decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor uuid := auth.uid();
begin
  if _actor is null or not (
    public.has_role(_actor, 'admin') or public.has_role(_actor, 'moderator')
  ) then
    raise exception 'Only an authorized reviewer may review credentials.' using errcode = '42501';
  end if;
  if _decision not in ('approve', 'reject') then
    raise exception 'Unsupported credential review decision.' using errcode = '22023';
  end if;

  update public.business_credentials
  set review_status = case
        when _decision = 'approve' then 'approved'::public.credential_review_status
        else 'rejected'::public.credential_review_status
      end,
      public_display_approved = (_decision = 'approve'),
      reviewed_by = _actor,
      reviewed_at = now()
  where id = _credential_id and review_status = 'pending';
  if not found then
    raise exception 'Credential is not awaiting review.' using errcode = 'P0002';
  end if;

  insert into public.audit_log (actor_user_id, action, target_table, target_id, diff)
  values (
    _actor,
    'business_credential.reviewed',
    'business_credentials',
    _credential_id,
    jsonb_build_object('decision', _decision)
  );
end;
$$;

revoke all on function public.create_business_with_owner(
  text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_business_with_owner(
  text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

revoke all on function public.review_business(uuid, text) from public, anon;
revoke all on function public.review_property(uuid, text) from public, anon;
revoke all on function public.review_service(uuid, text) from public, anon;
revoke all on function public.review_business_credential(uuid, text) from public, anon;
grant execute on function public.review_business(uuid, text) to authenticated;
grant execute on function public.review_property(uuid, text) to authenticated;
grant execute on function public.review_service(uuid, text) to authenticated;
grant execute on function public.review_business_credential(uuid, text) to authenticated;

-- Chat writes must cross the authenticated server gateway. Keeping the RLS insert
-- policy provides defense in depth, while the Data API role no longer has INSERT.
revoke insert on table public.chat_messages from authenticated;
grant update on table public.chat_messages to authenticated;

revoke all on function public.enforce_business_review_transition() from public, anon, authenticated;
revoke all on function public.enforce_property_review_transition() from public, anon, authenticated;
revoke all on function public.enforce_service_review_transition() from public, anon, authenticated;
revoke all on function public.enforce_credential_review_transition()
  from public, anon, authenticated;
grant execute on function public.enforce_business_review_transition() to service_role;
grant execute on function public.enforce_property_review_transition() to service_role;
grant execute on function public.enforce_service_review_transition() to service_role;
grant execute on function public.enforce_credential_review_transition() to service_role;
