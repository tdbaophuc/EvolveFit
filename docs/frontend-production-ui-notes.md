# EvolveFit Frontend Production UI Notes

## Current Component Map

- Today: `TodayOverview`, `TodayView`, hydration quick actions, recent activity, supplement quick logs.
- Hydration: hydration totals, drink modules, custom drink settings, log edit/delete, quick amounts.
- Workout: routine editor, exercise library, import preview, live session, rest timer, session queue, set history.
- Progress: progress dashboard, body metric form/charts, coach recommendation, reports, sharing previews.
- Settings: auth/account lifecycle, cloud merge preview, sync queue, notifications, health integration, import/export/delete data.
- Shared UI inside `page.tsx`: metric cards, empty states, steppers, plate calculator, social/report cards.

## Refactor Boundary Added

- `apps/web/src/app/_hooks/use-persistent-app-state.ts` owns local-first state load/save.
- `apps/web/src/app/_components/workout-safety-panel.tsx` owns live workout safety actions, finish confirmation, wake-lock fallback copy and undo visibility.
- `AppState.profile` now has onboarding production preferences: `trainingGoal`, `experienceLevel`, `availableEquipment`, and `syncPreference`.

## Production UX Improvements In This Pass

- Onboarding now captures local-first vs cloud-sync preference, training goal, experience, target body metrics, available equipment, hydration/creatine reminder toggles, and notification permission.
- Onboarding validation now blocks completion when no workout day or equipment is selected.
- Live workout exposes wake-lock status/fallback and requires a second tap to finish an active session.
- The app shell no longer handles localStorage load/save directly; this makes future profile/auth/sync hooks easier to test.

## Next Frontend Split

- Move `TodayView` and hydration helpers into `features/hydration`.
- Move routine editor/import/library into `features/workout/routine-editor`.
- Move live workout session UI, rest timer and set log into `features/workout/live-session`.
- Move body metrics/chart/report/share cards into `features/progress`.
- Move account merge, import/export/delete, notifications and health integration into `features/settings`.
- Extract all label maps from `page.tsx` into a typed `ui-labels.ts` module after fixing the current mixed mojibake strings.
