alter table public.exercise_library add column if not exists primary_muscles jsonb not null default '[]'::jsonb;
alter table public.exercise_library add column if not exists secondary_muscles jsonb not null default '[]'::jsonb;
alter table public.exercise_library add column if not exists cues jsonb not null default '[]'::jsonb;
alter table public.exercise_library add column if not exists common_mistakes jsonb not null default '[]'::jsonb;
alter table public.exercise_library add column if not exists substitutions jsonb not null default '[]'::jsonb;
alter table public.exercise_library add column if not exists media_url text;
alter table public.exercise_library add column if not exists difficulty text;
alter table public.exercise_library add column if not exists unilateral boolean not null default false;
alter table public.exercise_library add column if not exists equipment_alternatives jsonb not null default '[]'::jsonb;
alter table public.exercise_library add column if not exists tags jsonb not null default '[]'::jsonb;

create index if not exists exercise_library_tags_gin_idx on public.exercise_library using gin(tags);
create index if not exists exercise_library_primary_muscles_gin_idx on public.exercise_library using gin(primary_muscles);
