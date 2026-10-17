# Routine Template Marketplace

## Scope

Routine templates are public, versioned workout plans that users can preview and copy into their own routines. Applying a template must create a user-owned `routine`; it must never mutate the source template.

## Template Model

Each template includes:

- Creator/source/license metadata.
- Target goal, days per week, minutes per session, experience level, required equipment, tags, visibility, status and version.
- Template days with weekday, order, estimated minutes, warmup and cooldown notes.
- Exercise slots with exercise id, set/rep/rest prescription, optional tempo/RPE, notes and substitutions.

Published public/admin-curated templates are readable by normal users. Draft/archive and admin mutation flows should stay admin-only.

## API Surface

- `GET /api/routine-templates`: search/filter/sort/paginate published templates.
- `GET /api/routine-templates/:id`: detail plus compatibility score.
- `POST /api/routine-templates/:id/preview`: preview the user-owned routine that would be created.
- `POST /api/routine-templates/:id/apply`: create a user-owned routine. Supports `idempotencyKey`.
- `POST /api/routine-templates/:id/clone`: return a custom routine draft without persisting.
- `POST /api/routine-templates/:id/feedback`: accepted/rejected feedback and bookmark signal.

## Seed And Publish Process

1. Add template definitions in shared seed data first.
2. Mirror the template into Supabase `routine_templates`, `routine_template_days` and `routine_template_exercise_slots`.
3. Keep `slug` stable and increment `version` when prescriptions change.
4. Publish only templates with clear source/license text.
5. Archive outdated templates instead of deleting them.

## Staging Smoke

1. Run migrations through `0008_routine_template_marketplace.sql`.
2. Verify public read:
   - `GET /api/routine-templates?goal=strength&equipment=barbell`
   - `GET /api/routine-templates/upper-lower-strength-4d`
3. Verify apply idempotency:
   - `POST /api/routine-templates/upper-lower-strength-4d/apply` with the same `idempotencyKey` twice.
   - Confirm the second response returns the existing routine.
4. Verify UI:
   - Open Workout tab.
   - Search/filter marketplace templates.
   - Preview a template, apply it, then start a workout from the copied routine.

## Product Notes

- Template cards should show goal, weekly frequency, session duration, experience and compatibility score.
- Missing equipment warnings should appear before apply.
- Apply should be reversible via normal routine editing/deletion.
- Celebrity or creator templates require explicit license/source fields before publication.
