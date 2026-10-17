alter table public.exercise_library add column if not exists slug text;
alter table public.exercise_library add column if not exists catalog_source text not null default 'custom';
alter table public.exercise_library add column if not exists status text not null default 'published';
alter table public.exercise_library add column if not exists force_type text;
alter table public.exercise_library add column if not exists contraindications jsonb not null default '[]'::jsonb;
alter table public.exercise_library add column if not exists source text;
alter table public.exercise_library add column if not exists license text;
alter table public.exercise_library add column if not exists created_by uuid;
alter table public.exercise_library add column if not exists reviewed_by uuid;
alter table public.exercise_library add column if not exists published_at timestamptz;
alter table public.exercise_library add column if not exists version integer not null default 1;

update public.exercise_library
set catalog_source = case when built_in then 'built-in' else 'custom' end
where catalog_source is null or catalog_source = '';

alter table public.exercise_library drop constraint if exists exercise_library_catalog_source_check;
alter table public.exercise_library add constraint exercise_library_catalog_source_check check (catalog_source in ('built-in', 'marketplace', 'custom'));

alter table public.exercise_library drop constraint if exists exercise_library_status_check;
alter table public.exercise_library add constraint exercise_library_status_check check (status in ('draft', 'published', 'archived', 'pending-review'));

alter table public.exercise_library drop constraint if exists exercise_library_force_type_check;
alter table public.exercise_library add constraint exercise_library_force_type_check check (force_type is null or force_type in ('push', 'pull', 'static', 'mixed'));

create unique index if not exists exercise_library_public_slug_unique_idx on public.exercise_library(slug) where catalog_source in ('built-in', 'marketplace') and status <> 'archived';
create index if not exists exercise_library_marketplace_filter_idx on public.exercise_library(catalog_source, status, muscle_group, equipment, movement_pattern, difficulty);
create index if not exists exercise_library_contraindications_gin_idx on public.exercise_library using gin(contraindications);

drop policy if exists "exercise library owner or built in read" on public.exercise_library;
create policy "exercise library owner or public catalog read" on public.exercise_library
  for select using (
    auth.uid() = user_id
    or (catalog_source in ('built-in', 'marketplace') and status = 'published')
  );

drop policy if exists "exercise library owner write" on public.exercise_library;
create policy "exercise library owner custom write" on public.exercise_library
  for all using (auth.uid() = user_id and catalog_source = 'custom')
  with check (auth.uid() = user_id and catalog_source = 'custom');
