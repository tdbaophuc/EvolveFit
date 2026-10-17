alter table public.notification_events
  add column if not exists lock_key text,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_until timestamptz;

create unique index if not exists notification_events_user_lock_key_idx
  on public.notification_events(user_id, lock_key)
  where lock_key is not null;

create or replace function public.evolvefit_acquire_notification_event_lock(
  p_user_id uuid,
  p_lock_key text,
  p_type text,
  p_locked_until timestamptz
)
returns table(acquired boolean, event_id uuid, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_event public.notification_events%rowtype;
  next_event_id uuid;
begin
  insert into public.notification_events (
    user_id,
    type,
    lock_key,
    scheduled_for,
    locked_at,
    locked_until,
    status,
    payload_json
  )
  values (
    p_user_id,
    p_type,
    p_lock_key,
    now(),
    now(),
    p_locked_until,
    'processing',
    jsonb_build_object('lockKey', p_lock_key)
  )
  on conflict (user_id, lock_key) where lock_key is not null do nothing
  returning id into next_event_id;

  if next_event_id is not null then
    acquired := true;
    event_id := next_event_id;
    reason := null;
    return next;
    return;
  end if;

  select *
  into existing_event
  from public.notification_events
  where user_id = p_user_id and lock_key = p_lock_key
  for update;

  if existing_event.status = 'sent' then
    acquired := false;
    event_id := existing_event.id;
    reason := 'already-processed';
    return next;
    return;
  end if;

  if existing_event.status = 'processing' and existing_event.locked_until > now() then
    acquired := false;
    event_id := existing_event.id;
    reason := 'locked';
    return next;
    return;
  end if;

  update public.notification_events
  set
    type = p_type,
    locked_at = now(),
    locked_until = p_locked_until,
    status = 'processing',
    payload_json = jsonb_build_object('lockKey', p_lock_key)
  where id = existing_event.id;

  acquired := true;
  event_id := existing_event.id;
  reason := null;
  return next;
end;
$$;
