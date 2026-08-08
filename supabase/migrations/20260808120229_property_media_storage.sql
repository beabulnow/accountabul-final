-- Private property media. Object names are:
--   <business UUID>/<property UUID>/<random filename>
-- Reads use short-lived signed URLs; uploads/deletes require business authority.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_manage_property_media_object(_name text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select exists (
    select 1
    from public.properties p
    where p.id::text = (storage.foldername(_name))[2]
      and p.business_id::text = (storage.foldername(_name))[1]
      and (
        public.can_manage_business(p.business_id, _user_id)
        or public.has_role(_user_id, 'admin')
      )
  ) and _user_id = auth.uid();
$$;

create or replace function public.can_read_public_property_media_object(_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
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

drop policy if exists property_media_object_public_read on storage.objects;
create policy property_media_object_public_read on storage.objects
  for select to anon
  using (
    bucket_id = 'property-media'
    and public.can_read_public_property_media_object(name)
  );

drop policy if exists property_media_object_authenticated_read on storage.objects;
create policy property_media_object_authenticated_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'property-media'
    and (
      public.can_read_public_property_media_object(name)
      or public.can_manage_property_media_object(name, auth.uid())
    )
  );

drop policy if exists property_media_object_insert on storage.objects;
create policy property_media_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-media'
    and public.can_manage_property_media_object(name, auth.uid())
  );

drop policy if exists property_media_object_update on storage.objects;
create policy property_media_object_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'property-media'
    and public.can_manage_property_media_object(name, auth.uid())
  )
  with check (
    bucket_id = 'property-media'
    and public.can_manage_property_media_object(name, auth.uid())
  );

drop policy if exists property_media_object_delete on storage.objects;
create policy property_media_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-media'
    and public.can_manage_property_media_object(name, auth.uid())
  );

revoke all on function public.can_manage_property_media_object(text, uuid) from public;
revoke all on function public.can_read_public_property_media_object(text) from public;
grant execute on function public.can_manage_property_media_object(text, uuid) to authenticated, service_role;
grant execute on function public.can_read_public_property_media_object(text) to anon, authenticated, service_role;
