create table if not exists public.routine_templates (
  id text primary key,
  slug text not null unique,
  name text not null,
  summary text not null default '',
  creator_name text not null default 'EvolveFit Coach',
  source text,
  license text not null default 'EvolveFit original',
  target_goal text not null check (target_goal in ('strength', 'muscle', 'fat-loss', 'health')),
  days_per_week integer not null check (days_per_week between 1 and 7),
  minutes_per_session integer not null check (minutes_per_session between 15 and 180),
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  equipment text[] not null default '{}',
  muscle_priority text[] not null default '{}',
  recovery_days text[] not null default '{}',
  progression_notes text,
  deload_notes text,
  muscle_distribution jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  visibility text not null default 'public' check (visibility in ('public', 'private', 'admin-curated')),
  version integer not null default 1 check (version > 0),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_template_days (
  id text primary key,
  template_id text not null references public.routine_templates(id) on delete cascade,
  name text not null,
  weekday text not null,
  order_index integer not null default 0,
  estimated_minutes integer not null check (estimated_minutes between 15 and 180),
  warmup text,
  cooldown text,
  unique (template_id, order_index)
);

create table if not exists public.routine_template_exercise_slots (
  id text primary key,
  template_day_id text not null references public.routine_template_days(id) on delete cascade,
  exercise_id text not null,
  name text not null,
  muscle_group text not null,
  order_index integer not null default 0,
  target_sets integer not null check (target_sets between 1 and 12),
  target_reps_min integer not null check (target_reps_min between 1 and 200),
  target_reps_max integer not null check (target_reps_max between 1 and 200),
  target_weight_kg numeric not null default 0 check (target_weight_kg >= 0),
  rest_seconds integer not null default 90 check (rest_seconds between 15 and 600),
  tempo text,
  rpe numeric check (rpe between 1 and 10),
  note text,
  substitutions text[] not null default '{}',
  unique (template_day_id, order_index),
  check (target_reps_max >= target_reps_min)
);

create table if not exists public.routine_template_feedback (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null references public.routine_templates(id) on delete cascade,
  decision text not null check (decision in ('accepted', 'rejected')),
  favorite boolean not null default false,
  feedback text,
  decided_at timestamptz not null default now(),
  unique (user_id, template_id, decided_at)
);

create index if not exists routine_templates_status_visibility_idx on public.routine_templates(status, visibility);
create index if not exists routine_templates_goal_days_idx on public.routine_templates(target_goal, days_per_week);
create index if not exists routine_templates_equipment_gin_idx on public.routine_templates using gin(equipment);
create index if not exists routine_templates_tags_gin_idx on public.routine_templates using gin(tags);
create index if not exists routine_template_days_template_idx on public.routine_template_days(template_id, order_index);
create index if not exists routine_template_slots_day_idx on public.routine_template_exercise_slots(template_day_id, order_index);
create index if not exists routine_template_feedback_user_idx on public.routine_template_feedback(user_id, template_id);

alter table public.routine_templates enable row level security;
alter table public.routine_template_days enable row level security;
alter table public.routine_template_exercise_slots enable row level security;
alter table public.routine_template_feedback enable row level security;

drop policy if exists "published routine templates are readable" on public.routine_templates;
create policy "published routine templates are readable"
on public.routine_templates for select
using (status = 'published' and visibility in ('public', 'admin-curated'));

drop policy if exists "published routine template days are readable" on public.routine_template_days;
create policy "published routine template days are readable"
on public.routine_template_days for select
using (
  exists (
    select 1
    from public.routine_templates rt
    where rt.id = routine_template_days.template_id
      and rt.status = 'published'
      and rt.visibility in ('public', 'admin-curated')
  )
);

drop policy if exists "published routine template slots are readable" on public.routine_template_exercise_slots;
create policy "published routine template slots are readable"
on public.routine_template_exercise_slots for select
using (
  exists (
    select 1
    from public.routine_template_days rtd
    join public.routine_templates rt on rt.id = rtd.template_id
    where rtd.id = routine_template_exercise_slots.template_day_id
      and rt.status = 'published'
      and rt.visibility in ('public', 'admin-curated')
  )
);

drop policy if exists "users manage own routine template feedback" on public.routine_template_feedback;
create policy "users manage own routine template feedback"
on public.routine_template_feedback for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists routine_templates_set_updated_at on public.routine_templates;
create trigger routine_templates_set_updated_at
before update on public.routine_templates
for each row execute function public.set_updated_at();
