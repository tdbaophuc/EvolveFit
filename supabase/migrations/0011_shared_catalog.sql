-- Shared (global) catalog managed by admins and readable by everyone.
--
-- Marketplace exercises are stored in exercise_library with user_id = null and catalog_source = 'marketplace'.
-- Their app-level ids (e.g. "market-single-arm-db-row") are not uuids, so they live in external_id while the
-- primary key stays a generated uuid. Rows owned by users keep external_id null (nulls never collide).
alter table public.exercise_library add column if not exists external_id text;
create unique index if not exists exercise_library_external_id_idx on public.exercise_library(external_id);

-- Catalog rows have no owner; the API writes them with the service role after checking admin permissions.
alter table public.exercise_library alter column user_id drop not null;

-- Routine templates already live in routine_templates / routine_template_days / routine_template_exercise_slots
-- (migration 0008). Readers use the published/visibility policies from 0008; writes use the service role.
