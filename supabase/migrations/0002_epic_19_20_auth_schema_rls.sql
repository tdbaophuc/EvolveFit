create extension if not exists "pgcrypto";

create table if not exists public.drink_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  drink_type text not null,
  name text not null,
  category text not null default 'drink',
  unit text not null default 'ml',
  active boolean not null default true,
  goal numeric not null default 0,
  hydration_factor numeric not null default 1,
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, drink_type)
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  name text not null,
  weekday text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  equipment text not null default 'other',
  movement_pattern text not null default 'isolation',
  built_in boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.routine_exercises add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.routine_exercises add column if not exists workout_day_id uuid references public.workout_days(id) on delete cascade;
alter table public.routine_exercises add column if not exists superset_group text;

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric not null,
  height_cm numeric not null,
  body_fat_percent numeric,
  waist_cm numeric,
  chest_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  note text
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'locked',
  progress numeric not null default 0,
  target numeric not null default 0,
  streak_months integer not null default 0,
  earned_at timestamptz,
  lost_at timestamptz,
  condition text,
  created_at timestamptz not null default now(),
  unique(user_id, code, period_start, period_end)
);

create table if not exists public.leaderboard_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  score numeric not null default 0,
  badge_streak_months integer not null default 0,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  platform text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(user_id, endpoint)
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(user_id, idempotency_key)
);

create index if not exists drink_modules_user_idx on public.drink_modules(user_id, active);
create index if not exists hydration_logs_user_logged_at_idx on public.hydration_logs(user_id, logged_at desc);
create index if not exists supplements_user_idx on public.supplements(user_id, active);
create index if not exists supplement_logs_user_logged_at_idx on public.supplement_logs(user_id, logged_at desc);
create index if not exists routines_user_idx on public.routines(user_id, active);
create index if not exists workout_days_user_routine_idx on public.workout_days(user_id, routine_id, order_index);
create index if not exists routine_exercises_user_day_idx on public.routine_exercises(user_id, workout_day_id, order_index);
create index if not exists exercise_library_user_idx on public.exercise_library(user_id, built_in);
create index if not exists workout_sessions_user_started_at_idx on public.workout_sessions(user_id, started_at desc);
create index if not exists workout_sets_user_session_idx on public.workout_sets(user_id, session_id, completed_at desc);
create index if not exists body_metrics_user_measured_at_idx on public.body_metrics(user_id, measured_at desc);
create index if not exists achievements_user_period_idx on public.achievements(user_id, period_start desc, code);
create index if not exists leaderboard_profiles_public_idx on public.leaderboard_profiles(is_public, score desc);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id, revoked_at);
create index if not exists sync_events_user_status_idx on public.sync_events(user_id, status, created_at);

alter table public.drink_modules enable row level security;
alter table public.workout_days enable row level security;
alter table public.exercise_library enable row level security;
alter table public.body_metrics enable row level security;
alter table public.achievements enable row level security;
alter table public.leaderboard_profiles enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists "drink modules owner access" on public.drink_modules;
create policy "drink modules owner access" on public.drink_modules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workout days owner access" on public.workout_days;
create policy "workout days owner access" on public.workout_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "exercise library owner or built in read" on public.exercise_library;
create policy "exercise library owner or built in read" on public.exercise_library for select using (built_in or auth.uid() = user_id);
drop policy if exists "exercise library owner write" on public.exercise_library;
create policy "exercise library owner write" on public.exercise_library for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routine exercises owner access" on public.routine_exercises;
create policy "routine exercises owner access" on public.routine_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "body metrics owner access" on public.body_metrics;
create policy "body metrics owner access" on public.body_metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "achievements owner access" on public.achievements;
create policy "achievements owner access" on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "leaderboard profiles public read" on public.leaderboard_profiles;
create policy "leaderboard profiles public read" on public.leaderboard_profiles for select using (is_public or auth.uid() = user_id);
drop policy if exists "leaderboard profiles owner write" on public.leaderboard_profiles;
create policy "leaderboard profiles owner write" on public.leaderboard_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push subscriptions owner access" on public.push_subscriptions;
create policy "push subscriptions owner access" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sync events owner access" on public.sync_events;
create policy "sync events owner access" on public.sync_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
