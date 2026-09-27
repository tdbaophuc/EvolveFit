alter table public.hydration_logs add column if not exists updated_at timestamptz not null default now();
alter table public.supplements add column if not exists updated_at timestamptz not null default now();
alter table public.supplement_logs add column if not exists updated_at timestamptz not null default now();
alter table public.exercise_library add column if not exists updated_at timestamptz not null default now();
alter table public.workout_days add column if not exists updated_at timestamptz not null default now();
alter table public.workout_sessions add column if not exists updated_at timestamptz not null default now();
alter table public.workout_sets add column if not exists updated_at timestamptz not null default now();
alter table public.body_metrics add column if not exists updated_at timestamptz not null default now();
alter table public.progression_recommendations add column if not exists updated_at timestamptz not null default now();

alter table public.sync_events add column if not exists conflict_metadata jsonb;
alter table public.sync_events add column if not exists retry_count integer not null default 0;

create index if not exists supplements_user_updated_idx on public.supplements(user_id, updated_at desc);
create index if not exists supplement_logs_user_logged_idx on public.supplement_logs(user_id, logged_at desc);
create index if not exists exercise_library_user_updated_idx on public.exercise_library(user_id, updated_at desc);
create index if not exists workout_sets_user_completed_idx on public.workout_sets(user_id, completed_at desc);
create index if not exists body_metrics_user_measured_idx on public.body_metrics(user_id, measured_at desc);
create index if not exists progression_recommendations_user_created_idx on public.progression_recommendations(user_id, created_at desc);
create index if not exists sync_events_user_idempotency_status_idx on public.sync_events(user_id, idempotency_key, status);
