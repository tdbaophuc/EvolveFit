# Workout Intelligence V2

## Scope

Workout Intelligence V2 is rule-first. The app may use AI copy later for explanation, but the core decisions come from deterministic rules in `packages/shared/src/core.ts`.

## Exercise Library Metadata

`ExerciseDefinition` now supports advanced metadata:

- `primaryMuscles`, `secondaryMuscles`
- `cues`, `commonMistakes`
- `substitutions`, `equipmentAlternatives`
- `mediaUrl`, `difficulty`, `unilateral`, `tags`

Supabase migration `0006_workout_intelligence_exercise_library.sql` adds these fields to `exercise_library`.

## Planner

`buildWorkoutPlannerPreview` generates an editable routine preview from:

- goal
- days per week
- available equipment
- experience level
- session length
- muscle priority
- recovery constraints placeholder

The API endpoint is `POST /api/workouts/planner/preview`. The web app also has a local-first preview/apply path in the Workout tab.

## Coach V2

`coachV2Recommendation` detects:

- plateau from stable e1RM range
- weekly volume spikes
- low readiness
- missed workout blocks
- missing equipment and substitutions

Actions are `increase`, `decrease`, `hold`, or `deload`. Recommendations include `dataBasis`, `detectedSignals`, and optional `substituteExerciseIds`.
