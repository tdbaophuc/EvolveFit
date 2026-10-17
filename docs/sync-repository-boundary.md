# EvolveFit repository and sync boundary

Updated: 2026-09-27

## Production persistence rule

Backend mutations must not persist by replacing the full `AppState`. Route handlers still load an `AppState` view for compatibility, but every write records one or more `ResourceMutation` entries. `withDataContext` flushes those mutations through `AppRepository.applyResourceMutations`.

Supabase persistence is resource-scoped:

- profile and leaderboard profile: upsert by `user_id`
- hydration logs, supplement logs, exercise library, workout sessions, workout sets, body metrics, recommendations: upsert/delete by resource id plus `user_id`
- routines: upsert one routine, replace only that routine's `workout_days` children, then upsert its exercises
- push subscriptions and cron locks keep their dedicated repository methods
- sync events remain unique by `(user_id, idempotency_key)`

`saveUserState` remains available for memory/local compatibility and snapshot seeding, but production mutation routes should not rely on it as the write path.

## Sync batch semantics

`/api/sync/batch` checks `sync_events` before applying each item. If the idempotency key already has a stored result, the API returns the cached result unless the payload explicitly confirms a conflict.

For new items, the API applies one item at a time:

1. record resource mutations while updating the request-local state
2. write those resource mutations to the repository
3. save the sync event result
4. continue with the next item

This makes retries safe for duplicate idempotency keys and avoids returning a cached success before the resource write has been attempted.

## Conflict handling

Routine updates compare `baseUpdatedAt` against the server routine `updatedAt`. A stale update returns `status: "conflict"` with local and remote previews. Sending the same item with `conflictResolution: "confirm"` bypasses the cached conflict and persists the confirmed routine update.

Workout sets, hydration logs, supplement logs, and body metrics use last-write-wins based on their timestamp fields.

## Staging checklist

- Apply migrations through `supabase db push` or the hosted migration runner.
- Verify migration `0005_sync_resource_safety.sql` exists in staging.
- Run authenticated smoke:
  - log hydration from web
  - replay the same hydration sync item with the same idempotency key
  - create and update a routine from two browser sessions, then confirm a conflict
  - start, pause, resume, reorder, and finish a workout session
  - create, patch, and delete a workout set
- Check `sync_events` has one row per idempotency key and resource tables do not lose unrelated rows.

## Remaining production risks

- Notification settings and some social/share state still live primarily in `AppState` and need dedicated tables before those features are production-critical.
- Sync events and resource writes are ordered but not wrapped in a database transaction through PostgREST. A future RPC can make item persistence and sync event recording atomic.
- Routine child replacement is scoped to one routine, but very high concurrent edits to the same routine should eventually use version preconditions in SQL/RPC.
