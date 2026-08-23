# EvolveFit Final Audit Matrix

Audit date: 2026-08-23

Scope inspected:

- Product analysis: `docs/phan-tich-san-pham-va-chuc-nang-evolvefit.md`
- Completion plan: `docs/ke-hoach-hoan-thien-evolvefit.md`
- UI/prototype references: `docs/evolvefit-ui-ux-spec.md`, `docs/home-screen-design.md`, `docs/design-rule.md`
- Current code inventory from `rg --files`
- Domain/API/UI/test code under `src/`, `scripts/`, `public/`, and `supabase/`
- Runtime checks against local Next app on `http://localhost:5173`

Status scale:

- `done`: implemented in current repo with direct code evidence and unit/integration/smoke evidence.
- `partial`: implemented as a contract, scaffold, or local/mock flow, but not fully proven as a production/provider-backed feature.
- `missing`: no current user-facing implementation or only a future planning note exists.

## Epic Matrix

| Epic | Status | Evidence | Test evidence |
|---:|---|---|---|
| 1. Drink visibility settings | done | `DrinkModule` model and active flags in `src/lib/core.ts:8`; water forced active in `src/app/page.tsx:697`; Settings drink module card in `src/app/page.tsx:4328`; creatine conditional UI in `src/app/page.tsx:2467` and `src/app/page.tsx:2747` | `src/lib/core.test.ts:112`, `src/lib/core.test.ts:142`, `src/app/page.test.tsx:55` |
| 2. Drink contribution and hydration factor | done | Hydration factors and active filtering in `src/lib/core.ts:575` and `src/lib/core.ts:581`; optional drink settings in `src/app/page.tsx:4336`; drink type selector in `src/app/page.tsx:2701` | `src/lib/core.test.ts:127` |
| 3. Advanced reminder schedule | done | Notification settings model in `src/lib/seed.ts:52`; hydration and creatine reminder rules in `src/lib/core.ts:664` and `src/lib/core.ts:2099`; Settings fixed/interval/snooze UI in `src/app/page.tsx:4599` and `src/app/page.tsx:4708` | `src/lib/core.test.ts:154`, `src/lib/core.test.ts:170`, `src/lib/core.test.ts:956`, `src/lib/core.test.ts:990` |
| 4. Real Web Push | partial | Service worker in `public/sw.js`; subscribe/unsubscribe/test UI in `src/app/page.tsx:1385`, `src/app/page.tsx:1414`, `src/app/page.tsx:1430`; API routes under `src/app/api/notifications/*`; runtime `/api/integrations/status` reports `webPush: configured` in this environment | `src/lib/push.test.ts:5`, `src/lib/api.test.ts:71`, `src/app/api/notifications/route.test.ts:6`, smoke covers notification config |
| 5. Routine sample CSV/XLSX | done | Sample CSV in `public/samples/evolvefit-routine-template.csv`; XLSX download and import parsing in `src/app/page.tsx:816` and `src/app/page.tsx:824`; parser in `src/lib/core.ts:1104`; UI import card in `src/app/page.tsx:3075` | `src/lib/core.test.ts:216`, `src/lib/core.test.ts:248`, `src/lib/core.test.ts:258`, `src/lib/core.test.ts:277` |
| 6. Professional routine data model | done | `Routine`, `WorkoutDay`, `RoutineExercise`, `ExerciseDefinition` in `src/lib/core.ts:159`; migration and selected day logic in `src/lib/core.ts:750` and `src/lib/core.ts:773`; editor in `src/app/page.tsx:2925` | `src/lib/core.test.ts:292`, `src/lib/core.test.ts:313` |
| 7. Basic exercise library | done | Built-in/custom exercise model in `src/lib/core.ts:159`; library filter/custom creation in `src/lib/core.ts:324`; picker and custom UI in `src/app/page.tsx:3007`; exercise API routes under `src/app/api/exercises/*` | `src/lib/core.test.ts:324`, `src/lib/core.test.ts:334`, `src/app/page.test.tsx:12` |
| 8. Workout session model | done | `WorkoutSession` in `src/lib/core.ts:121`; start/finish/pause/resume in `src/lib/core.ts:815`, `src/lib/core.ts:969`, `src/lib/core.ts:979`, `src/lib/core.ts:987`; API session routes under `src/app/api/workouts/sessions/*` | `src/lib/core.test.ts:353`, `src/lib/core.test.ts:362`, `src/lib/api.test.ts:143` |
| 9. Session queue reorder without mutating routine | done | Queue helpers in `src/lib/core.ts:911`, `src/lib/core.ts:919`, `src/lib/core.ts:929`, `src/lib/core.ts:948`; Live queue UI in `src/app/page.tsx:3358`; save-to-routine action in `src/app/page.tsx:1678` | `src/lib/core.test.ts:382`, `src/lib/core.test.ts:423`, `src/lib/core.test.ts:442`, `src/app/page.test.tsx:12` |
| 10. Progress dashboard 7/30 days | done | Dashboard aggregation in `src/lib/core.ts:1641`; Progress UI in `src/app/page.tsx:3522`; hydration 7/30 and charts in `src/app/page.tsx:3674` | `src/lib/core.test.ts:692`, `src/app/page.test.tsx:55`, `src/app/page.test.tsx:78` |
| 11. Body metric charts and validation | done | Validation and conversion helpers in `src/lib/core.ts:1233`; chart dataset in `src/lib/core.ts:1260`; Progress body metric UI in `src/app/page.tsx:3791` | `src/lib/core.test.ts:1243`, `src/lib/core.test.ts:1248`, `src/lib/core.test.ts:1260`, `src/app/page.test.tsx:78` |
| 12. Import/export and privacy | done | Export/import schema handling in `src/lib/app-data.ts:36`, `src/lib/app-data.ts:55`, `src/lib/app-data.ts:88`, `src/lib/app-data.ts:122`; Settings data UI in `src/app/page.tsx:4790` | `src/lib/app-data.test.ts:13`, `src/lib/app-data.test.ts:30`, `src/lib/app-data.test.ts:69`, `src/lib/app-data.test.ts:90`, `src/app/page.test.tsx:133` |
| 13. PR list and live PR notification | done | PR calculation in `src/lib/core.ts:1569` and `src/lib/core.ts:1593`; live PR toast in `src/app/page.tsx:1485`; Progress PR list in `src/app/page.tsx:3769` | `src/lib/core.test.ts:816`, `src/lib/core.test.ts:873`, `src/app/page.test.tsx:34` |
| 14. Plate calculator | done | Plate settings and calculator in `src/lib/core.ts:498` and `src/lib/core.ts:519`; Live Workout plate display in `src/app/page.tsx:3316`; Settings plate card in `src/app/page.tsx:4379` | `src/lib/core.test.ts:923`, `src/app/page.test.tsx:34` |
| 15. Warm-up/drop/failure/superset | done | Set type model in `src/lib/core.ts:81`; warm-up and superset helpers in `src/lib/core.ts:599` and `src/lib/core.ts:608`; Live set type controls in `src/app/page.tsx:3291` | `src/lib/core.test.ts:532`, `src/lib/core.test.ts:599`, `src/lib/core.test.ts:608` |
| 16. Expanded exercise library | partial | Library supports equipment/movement pattern and custom edit/delete in `src/lib/core.ts:159` and `src/app/page.tsx:3007`; no rich instructions/cues or custom library import/export is present | `src/lib/core.test.ts:324`, `src/lib/core.test.ts:334`; no test for cues/instructions/import-export |
| 17. Weekly/monthly reports | done | Report builder in `src/lib/core.ts:1741`; Progress report cards and PDF export in `src/app/page.tsx:3682` and `src/app/page.tsx:1206` | `src/lib/core.test.ts:1084` |
| 18. Advanced challenge and badges | done | Badge states and monthly achievements in `src/lib/core.ts:2038`; disabled-module badge filtering in reports in `src/app/page.tsx:3994` | `src/lib/core.test.ts:1050`, `src/lib/core.test.ts:1066`, `src/lib/core.test.ts:1214` |
| 19. Supabase Auth | partial | Auth service supports local fallback, password auth, Google OAuth URL/callback, and session cookie in `src/lib/auth.ts:27`, `src/lib/auth.ts:67`, `src/lib/auth.ts:176`, `src/app/api/auth/*`; local data merge/replace on login is not fully implemented | `src/lib/auth.test.ts:17`, `src/lib/auth.test.ts:83`, `src/lib/auth.test.ts:107`, `src/lib/auth.test.ts:137`; no merge/replace UI test |
| 20. PostgreSQL schema and RLS | done | Tables, indexes, and owner RLS policies in `supabase/migrations/0001_initial_schema.sql:3` and `supabase/migrations/0002_epic_19_20_auth_schema_rls.sql:3`; service-role request helper in `src/lib/integrations.ts:47` | `src/lib/integrations.test.ts:64`, `src/lib/integrations.test.ts:47` |
| 21. API routine/session/sync | done | Routine/exercise/workout/sync API routes under `src/app/api`; sync batch idempotency and conflict result in `src/lib/api.ts:394`; API client methods in `src/lib/api-client.ts:84` and `src/lib/api-client.ts:160` | `src/lib/api.test.ts:127`, `src/lib/api.test.ts:143`, `src/lib/api.test.ts:158`, `src/lib/api.test.ts:176`, `src/lib/api-client.test.ts:70` |
| 22. Sync retry and conflict resolution | partial | Online auto-retry flow in `src/app/page.tsx:274`; queue retry/confirm UI in `src/app/page.tsx:1832` and `src/app/page.tsx:1848`; backoff/conflict helpers in `src/lib/core.ts:2032`; still uses local/mock API contracts rather than a proven deployed backend sync loop | `src/lib/core.test.ts:1308`, `src/lib/api.test.ts:176`; no deployed/backend retry test |
| 23. OpenAPI, logging, rate limit, observability | done | OpenAPI spec in `docs/api-v1.openapi.json`; request id/logging in `src/lib/server-response.ts:17` and `src/lib/observability.ts:39`; rate limit middleware in `middleware.ts:14`; dashboard route in `src/app/api/health/route.ts:6` | `src/lib/observability.test.ts:7`, `src/lib/observability.test.ts:33`, `src/lib/observability.test.ts:42`, smoke covers `/api/docs/openapi` and `/api/observability/logs` |
| 24. AI Coach | done | Guarded recommendation logic in `src/lib/core.ts:1215`; provider/fallback integration in `src/lib/integrations.ts:101`; Progress coach UI and feedback in `src/app/page.tsx:3578` | `src/lib/integrations.test.ts:101`, `src/lib/integrations.test.ts:149`, `src/lib/integrations.test.ts:167`, `src/app/page.test.tsx:99` |
| 25. Social feed and friend leaderboard | done | Social privacy defaults and share redaction in `src/lib/core.ts:1300`, `src/lib/core.ts:1414`, `src/lib/core.ts:1433`; Settings controls in `src/app/page.tsx:4427`; Progress sharing/leaderboard UI in `src/app/page.tsx:3631` | `src/lib/core.test.ts:1327`, `src/lib/core.test.ts:1347`, `src/lib/core.test.ts:1369`, `src/app/page.test.tsx:162` |
| 26. Health Connect / Apple Health permission UX | done | Web-ready contract in `src/lib/core.ts:267`; native bridge gating in `src/lib/core.ts:1371`; Settings permission UI in `src/app/page.tsx:4466`; plan doc in `docs/health-platform-integration-plan.md` | `src/lib/core.test.ts:1387`, `src/lib/core.test.ts:1401`, `src/lib/core.test.ts:1415`, `src/app/page.test.tsx:199` |
| 27. Native mobile/watch app | missing | `docs/ke-hoach-hoan-thien-evolvefit.md:741` still defines this as a future epic; no `docs/native-watch-decision.md`, Expo/React Native scaffold, or watch flow exists | No direct tests |
| 28. Progress photos | missing | `docs/ke-hoach-hoan-thien-evolvefit.md:756` still defines schema/storage/compare/export-delete work; no photo metadata model, storage abstraction, compare UI, or tests were found | No direct tests |
| 29. Nutrition tracking | missing | `docs/ke-hoach-hoan-thien-evolvefit.md:772` still defines food diary/macros/provider decision work; no nutrition model/UI/API or decision doc exists beyond planning notes | No direct tests |

## UI Against Prototype

| Screen | Status | Prototype expectation | Current evidence | Notes |
|---|---|---|---|---|
| Today | done | Top bar, hydration-first overview, quick action, creatine row, workout card, readiness/progress summary, bottom tabs | Runtime DOM shows top bar, `Hydration today`, `Workout today`, bottom tabs; source in `src/app/page.tsx:2435`; tests cover main flow through app render | Current first load includes onboarding until completed, which is expected from product flow. |
| Water | done | Hydration detail with ring, quick log, custom slider, hourly chart, history, goal/reminder settings, creatine section | `TodayView` source in `src/app/page.tsx:2510`; route `/hydration` returned 200; tests cover hydration/progress flows | The tab label is `Water`, while component name remains `TodayView`. |
| Workout | done | Plan screen plus Live Workout focus mode, large steppers, rest timer, sticky complete, queue/history | `WorkoutView` source in `src/app/page.tsx:2779`; focus UI in `src/app/page.tsx:3134`; sticky complete in `src/app/page.tsx:3467`; tests cover queue and PR | Prototype's dedicated Coach tab is not part of current five-tab nav. |
| Progress | done | Hydration/workout/body metric trends, PR list, badges, leaderboard/coach where applicable | `ProgressView` in `src/app/page.tsx:3522`; report cards in `src/app/page.tsx:3682`; tests cover coach, body metrics, social sharing | Coach is embedded in Progress, not separate navigation. |
| Settings | done | Profile, units, schedule, notifications, hydration/supplements, privacy, data | `SettingsView` in `src/app/page.tsx:4155`; health/social/data/notifications cards in `src/app/page.tsx:4427`, `src/app/page.tsx:4466`, `src/app/page.tsx:4561`, `src/app/page.tsx:4790`; UI tests cover import/social/health | Settings is comprehensive and scroll-heavy but grouped into cards. |

## Runtime Evidence Captured

- `Invoke-WebRequest http://localhost:5173/` returned `200`.
- `Invoke-WebRequest http://localhost:5173/hydration` returned `200`.
- `Invoke-WebRequest http://localhost:5173/api/health` returned `200` with integration payload including Supabase, AI, Web Push, cron, and health platform statuses.
- `Invoke-WebRequest http://localhost:5173/api/integrations/status` returned `200`.
- Headless Chrome DOM dump confirmed the rendered top bar and bottom tab labels: Today, Water, Workout, Progress, Settings.

