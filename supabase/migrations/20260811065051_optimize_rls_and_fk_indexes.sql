-- Cache auth.uid() once per statement in every affected RLS policy instead of
-- re-evaluating it for each row. The policy list is explicit so the migration
-- fails closed if it is ever applied to an unexpected schema state.
do $$
declare
  _policy record;
  _using_expression text;
  _check_expression text;
  _processed integer := 0;
begin
  for _policy in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (tablename, policyname) in (
        values
          ('profiles', 'profiles_select_own'),
          ('profiles', 'profiles_insert_own'),
          ('profiles', 'profiles_update_own'),
          ('user_roles', 'user_roles_select_own'),
          ('user_roles', 'user_roles_admin_write'),
          ('business_members', 'business_members_read'),
          ('business_members', 'business_members_insert'),
          ('business_members', 'business_members_update'),
          ('business_members', 'business_members_delete'),
          ('event_presence', 'event_presence_own_write'),
          ('event_presence', 'event_presence_own_update'),
          ('business_credentials', 'business_credentials_read'),
          ('business_credentials', 'business_credentials_update'),
          ('business_credentials', 'business_credentials_insert'),
          ('properties', 'properties_delete'),
          ('properties', 'properties_insert'),
          ('properties', 'properties_update'),
          ('properties', 'properties_auth_read'),
          ('property_media', 'property_media_write'),
          ('property_media', 'property_media_auth_read'),
          ('property_inquiries', 'property_inquiries_read'),
          ('property_inquiries', 'property_inquiries_insert'),
          ('property_inquiries', 'property_inquiries_update'),
          ('service_inquiries', 'service_inquiries_read'),
          ('service_inquiries', 'service_inquiries_insert'),
          ('service_inquiries', 'service_inquiries_update'),
          ('services', 'services_update'),
          ('services', 'services_delete'),
          ('services', 'services_insert'),
          ('services', 'services_auth_read'),
          ('saved_properties', 'saved_properties_own'),
          ('business_follows', 'business_follows_own'),
          ('events', 'events_admin_write'),
          ('chat_messages', 'chat_messages_read'),
          ('chat_messages', 'chat_messages_update_mod'),
          ('chat_moderation_actions', 'chat_mod_read'),
          ('chat_moderation_actions', 'chat_mod_write'),
          ('event_reminders', 'event_reminders_own'),
          ('tips', 'tips_read'),
          ('payment_events', 'payment_events_admin_read'),
          ('audit_log', 'audit_log_admin_read'),
          ('migration_batches', 'migration_batches_admin'),
          ('migration_record_map', 'migration_record_map_admin'),
          ('businesses', 'businesses_authenticated_read'),
          ('businesses', 'businesses_insert_own'),
          ('businesses', 'businesses_update_manager')
      )
    order by tablename, policyname
  loop
    _using_expression := case
      when _policy.qual is null then null
      else replace(_policy.qual, 'auth.uid()', '(select auth.uid())')
    end;
    _check_expression := case
      when _policy.with_check is null then null
      else replace(_policy.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    execute format(
      'alter policy %I on %I.%I%s%s',
      _policy.policyname,
      _policy.schemaname,
      _policy.tablename,
      case
        when _using_expression is null then ''
        else format(' using (%s)', _using_expression)
      end,
      case
        when _check_expression is null then ''
        else format(' with check (%s)', _check_expression)
      end
    );
    _processed := _processed + 1;
  end loop;

  if _processed <> 46 then
    raise exception 'Expected to optimize 46 RLS policies, found %', _processed;
  end if;
end;
$$;

-- Split broad ALL policies into write-only policies. Their SELECT behavior was
-- redundant with the table's dedicated read policy and caused Postgres to
-- evaluate multiple permissive policies for every authenticated read.
drop policy "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_insert" on public.user_roles
  for insert to authenticated
  with check (private.has_role((select auth.uid()), 'admin'));
create policy "user_roles_admin_update" on public.user_roles
  for update to authenticated
  using (private.has_role((select auth.uid()), 'admin'))
  with check (private.has_role((select auth.uid()), 'admin'));
create policy "user_roles_admin_delete" on public.user_roles
  for delete to authenticated
  using (private.has_role((select auth.uid()), 'admin'));

drop policy "events_admin_write" on public.events;
create policy "events_admin_insert" on public.events
  for insert to authenticated
  with check (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  );
create policy "events_admin_update" on public.events
  for update to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  )
  with check (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  );
create policy "events_admin_delete" on public.events
  for delete to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  );

drop policy "chat_mod_write" on public.chat_moderation_actions;
create policy "chat_mod_insert" on public.chat_moderation_actions
  for insert to authenticated
  with check (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  );
create policy "chat_mod_update" on public.chat_moderation_actions
  for update to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  )
  with check (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  );
create policy "chat_mod_delete" on public.chat_moderation_actions
  for delete to authenticated
  using (
    private.has_role((select auth.uid()), 'admin')
    or private.has_role((select auth.uid()), 'moderator')
  );

drop policy "property_media_write" on public.property_media;
create policy "property_media_insert" on public.property_media
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and (
          private.can_manage_business(p.business_id, (select auth.uid()))
          or private.has_role((select auth.uid()), 'admin')
        )
    )
  );
create policy "property_media_update" on public.property_media
  for update to authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and (
          private.can_manage_business(p.business_id, (select auth.uid()))
          or private.has_role((select auth.uid()), 'admin')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and (
          private.can_manage_business(p.business_id, (select auth.uid()))
          or private.has_role((select auth.uid()), 'admin')
        )
    )
  );
create policy "property_media_delete" on public.property_media
  for delete to authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_id
        and (
          private.can_manage_business(p.business_id, (select auth.uid()))
          or private.has_role((select auth.uid()), 'admin')
        )
    )
  );

-- PostgreSQL does not create indexes for the referencing side of foreign keys.
-- Add the missing single-column indexes used by joins, cascades, and RLS checks.
create index if not exists audit_log_actor_user_id_idx
  on public.audit_log (actor_user_id);
create index if not exists business_credentials_reviewed_by_idx
  on public.business_credentials (reviewed_by);
create index if not exists business_credentials_submitted_by_idx
  on public.business_credentials (submitted_by);
create index if not exists business_follows_business_id_idx
  on public.business_follows (business_id);
create index if not exists business_members_invited_by_idx
  on public.business_members (invited_by);
create index if not exists businesses_created_by_idx
  on public.businesses (created_by);
create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id);
create index if not exists chat_moderation_actions_actor_user_id_idx
  on public.chat_moderation_actions (actor_user_id);
create index if not exists chat_moderation_actions_event_id_idx
  on public.chat_moderation_actions (event_id);
create index if not exists event_presence_user_id_idx
  on public.event_presence (user_id);
create index if not exists event_reminders_user_id_idx
  on public.event_reminders (user_id);
create index if not exists events_created_by_idx
  on public.events (created_by);
create index if not exists events_host_business_id_idx
  on public.events (host_business_id);
create index if not exists migration_record_map_batch_id_idx
  on public.migration_record_map (batch_id);
create index if not exists payment_events_tip_id_idx
  on public.payment_events (tip_id);
create index if not exists properties_created_by_idx
  on public.properties (created_by);
create index if not exists property_inquiries_from_user_id_idx
  on public.property_inquiries (from_user_id);
create index if not exists property_inquiries_property_id_idx
  on public.property_inquiries (property_id);
create index if not exists saved_properties_property_id_idx
  on public.saved_properties (property_id);
create index if not exists service_inquiries_from_user_id_idx
  on public.service_inquiries (from_user_id);
create index if not exists service_inquiries_service_id_idx
  on public.service_inquiries (service_id);
create index if not exists services_created_by_idx
  on public.services (created_by);
create index if not exists tips_event_id_idx
  on public.tips (event_id);
create index if not exists tips_from_user_id_idx
  on public.tips (from_user_id);
create index if not exists tips_to_business_id_idx
  on public.tips (to_business_id);
create index if not exists user_roles_granted_by_idx
  on public.user_roles (granted_by);
