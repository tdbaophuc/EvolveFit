alter table public.supplement_logs drop constraint if exists supplement_logs_amount_check;
alter table public.supplement_logs add constraint supplement_logs_amount_check check (amount >= 0);
alter table public.supplement_logs add column if not exists skipped_reason text;

alter table public.routines add column if not exists updated_at timestamptz not null default now();

alter table public.routine_exercises add column if not exists name text;
alter table public.routine_exercises add column if not exists muscle_group text;

alter table public.push_subscriptions add column if not exists local_profile_id text;
