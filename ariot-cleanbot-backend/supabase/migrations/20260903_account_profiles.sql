-- ARIOT account profiles and private avatar storage.
-- Run once in the Supabase SQL Editor before enabling the account UI.

alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profiles enable row level security;

-- Browser clients can read only their own canonical profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Restrictive scope remains effective even if another permissive policy exists.
drop policy if exists profiles_scope_own_restrictive on public.profiles;
create policy profiles_scope_own_restrictive
  on public.profiles
  as restrictive
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- All self-service writes go through the FastAPI backend and its service role.
-- Revoking table mutations also neutralizes any pre-existing permissive row policy.
revoke select, insert, update, delete on table public.profiles from anon;
revoke insert, update, delete on table public.profiles from authenticated;

-- Defense in depth: even privileged application code cannot accidentally change
-- identity/authorization columns through UPDATE. Administrative role/facility
-- assignment should use a separately reviewed workflow that disables this trigger
-- for that transaction.
create or replace function public.protect_profile_identity_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.facility_id is distinct from old.facility_id then
    raise exception 'protected profile fields cannot be changed by self-service updates';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_identity_fields on public.profiles;
create trigger protect_profile_identity_fields
before update on public.profiles
for each row execute function public.protect_profile_identity_fields();

-- Private bucket. Database values store only paths such as <uuid>/avatar.webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Restrictive policies deny browser credentials access to this bucket even if the
-- project already has a broader permissive storage policy for another bucket.
drop policy if exists avatars_backend_only_select on storage.objects;
create policy avatars_backend_only_select
  on storage.objects
  as restrictive
  for select
  to anon, authenticated
  using (bucket_id <> 'avatars');

drop policy if exists avatars_backend_only_insert on storage.objects;
create policy avatars_backend_only_insert
  on storage.objects
  as restrictive
  for insert
  to anon, authenticated
  with check (bucket_id <> 'avatars');

drop policy if exists avatars_backend_only_update on storage.objects;
create policy avatars_backend_only_update
  on storage.objects
  as restrictive
  for update
  to anon, authenticated
  using (bucket_id <> 'avatars')
  with check (bucket_id <> 'avatars');

drop policy if exists avatars_backend_only_delete on storage.objects;
create policy avatars_backend_only_delete
  on storage.objects
  as restrictive
  for delete
  to anon, authenticated
  using (bucket_id <> 'avatars');

-- FastAPI normalizes images and uses its server-only service role for object paths
-- derived as auth_user_id/avatar.webp, then returns a short-lived signed read URL.
