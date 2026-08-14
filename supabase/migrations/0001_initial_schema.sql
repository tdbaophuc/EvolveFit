create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Saigon',
  unit_weight text not null default 'kg',
  unit_volume text not null default 'ml',
  water_target_ml integer not null default 2500,
  wake_hour integer not null default 6 check (wake_hour between 0 and 23),
  sleep_hour integer not null default 23 check (sleep_hour between 0 and 23),
  creatine_amount_g numeric not null default 5,
  creatine_hour integer not null default 17 check (creatine_hour between 0 and 23),
  remind_before_minutes integer not null default 15,
  leaderboard_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0),
  drink_type text not null default 'water',
  hydration_factor numeric not null default 1,
  source text not null default 'manual',
  note text
);

create table if not exists public.user_quick_amounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('hydration', 'supplement')),
  label text not null,
  amount numeric not null check (amount > 0),
  unit text not null,
  sort_order integer not null default 0,
  pinned boolean not null default true,
  uses integer not null default 1,
  last_used_at timestamptz
);

create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_amount numeric not null check (default_amount > 0),
  unit text not null default 'g',
  schedule_rule jsonb not null default '{}'::jsonb,
  reminder_time time,
  remind_before_minutes integer not null default 15,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplement_id uuid references public.supplements(id) on delete set null,
  name text not null,
  logged_at timestamptz not null default now(),
  amount numeric not null check (amount > 0),
  unit text not null,
  status text not null default 'taken'
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  equipment text not null default 'custom',
  exercise_type text not null default 'strength',
  is_public boolean not null default false
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  days_per_week integer not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  day_index integer not null,
  name text not null
);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index integer not null default 0,
  target_sets integer not null default 3,
  target_reps_min integer not null default 8,
  target_reps_max integer not null default 10,
  target_weight_kg numeric not null default 0,
  rest_seconds integer not null default 90,
  progression_rule text not null default 'double_progression'
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_day_id uuid references public.routine_days(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'active',
  readiness_score integer,
  notes text
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  set_index integer not null,
  target_weight_kg numeric not null default 0,
  target_reps integer not null default 0,
  actual_weight_kg numeric not null default 0,
  actual_reps integer not null default 0,
  rpe numeric,
  rir numeric,
  set_type text not null default 'working',
  completed_at timestamptz not null default now()
);

create table if not exists public.user_body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric not null,
  height_cm numeric not null,
  body_fat_percent numeric,
  waist_cm numeric,
  notes text
);

create table if not exists public.progression_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  source text not null,
  recommendation_json jsonb not null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create table if not exists public.notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  platform text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  status text not null default 'pending',
  payload_json jsonb not null default '{}'::jsonb
);

create table if not exists public.achievement_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  category text not null,
  rule_json jsonb not null,
  active boolean not null default true
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievement_definitions(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'locked',
  earned_at timestamptz,
  lost_at timestamptz,
  streak_months integer not null default 0
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,
  category text not null,
  score numeric not null default 0,
  rank integer,
  is_public boolean not null default false,
  computed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.hydration_logs enable row level security;
alter table public.user_quick_amounts enable row level security;
alter table public.supplements enable row level security;
alter table public.supplement_logs enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.user_body_metrics enable row level security;
alter table public.progression_recommendations enable row level security;
alter table public.notification_subscriptions enable row level security;
alter table public.notification_events enable row level security;
alter table public.user_achievements enable row level security;
alter table public.leaderboard_entries enable row level security;

create policy "profiles owner access" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "hydration owner access" on public.hydration_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "quick amounts owner access" on public.user_quick_amounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "supplements owner access" on public.supplements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "supplement logs owner access" on public.supplement_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises owner or public read" on public.exercises for select using (is_public or auth.uid() = user_id);
create policy "exercises owner write" on public.exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "routines owner access" on public.routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "body metrics owner access" on public.user_body_metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout sessions owner access" on public.workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout sets owner access" on public.workout_sets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recommendations owner access" on public.progression_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification subscriptions owner access" on public.notification_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification events owner access" on public.notification_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "achievements owner access" on public.user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leaderboard owner or public read" on public.leaderboard_entries for select using (is_public or auth.uid() = user_id);
create policy "leaderboard owner write" on public.leaderboard_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.achievement_definitions (code, name, description, category, rule_json)
values
  ('monthly_hydration', 'Hydration Elite', 'Reach hydration goal for the configured number of days in a month.', 'hydration', '{"targetDays":24}'),
  ('volume_progression', 'Volume Climber', 'Increase monthly training volume by at least 3 percent.', 'training', '{"minimumVolumeIncreasePercent":3}')
on conflict (code) do nothing;
