# Audit contract API truoc khi tach backend/frontend

Cap nhat: 2026-09-04

Cap nhat sau Phase 1 monorepo:

- API route Next hien da move tu `src/app/api/**/route.ts` sang `apps/web/src/app/api/**/route.ts`.
- Server/client lib hien da move tu `src/lib/**` sang `apps/web/src/lib/**`, tru cac module pure da move sang `packages/shared/src/**`.
- Shared package hien export `core.ts`, `app-data.ts`, `seed.ts` qua `@evolvefit/shared`; package nay khong duoc chua `window`, `localStorage`, `next/*`, cookie runtime, `process.env`, Web Push, Supabase REST adapter, observability server hoac response helper server.
- OpenAPI validator hien doi chieu `docs/api-v1.openapi.json` voi route files trong `apps/web/src/app/api`.

Cap nhat sau Phase 2 backend:

- Backend Node.js/Fastify doc lap nam trong `apps/api`.
- Route registry backend nam o `apps/api/src/routes/api-routes.ts` va port toan bo nhom endpoint chinh theo contract hien co.
- Server-only modules duoc port sang `apps/api/src/lib/**`; cac module nay import domain/type tu `@evolvefit/shared` va khong import Next/React/browser runtime.
- Backend chay local bang `npm run dev:api` hoac `npm run dev -w @evolvefit/api`, mac dinh `PORT=4000`.
- Backend route tests chay bang `npm run test -w @evolvefit/api`; TypeScript build chay bang `npm run build -w @evolvefit/api`.

Cap nhat sau Phase 3 frontend -> backend:

- `apps/web` khong con chua `src/app/api/**`, `middleware.ts`, hoac cac module server-only `api.ts`, `auth.ts`, `data-adapter.ts`, `integrations.ts`, `push.ts`, `observability.ts`, `server-response.ts`, `rate-limit.ts`.
- Frontend goi API qua `apps/web/src/lib/api-client.ts`; client lay base URL tu `NEXT_PUBLIC_API_BASE_URL` va gui `credentials: "include"` cho auth cookie.
- `apps/web/next.config.ts` co rewrite chuyen tiep `/api/:path*` sang `${NEXT_PUBLIC_API_BASE_URL}/api/:path*`, nhung UI khong con import/chay Next API handlers.
- OpenAPI validator hien doi chieu `docs/api-v1.openapi.json` voi Fastify route registry `apps/api/src/routes/api-routes.ts`.

Cap nhat sau Phase 4 repository/auth:

- Backend co `AppRepository` voi memory adapter cho demo/test va Supabase adapter cho production khi `API_DATA_MODE=supabase`.
- Data endpoints chay trong request context; Supabase mode require Supabase JWT qua `Authorization: Bearer <token>` hoac cookie session co `accessToken`.
- Moi read/write Supabase duoc scope theo `user_id`; route tests va repository tests cover unauthorized, multi-user memory isolation, Supabase request scoping va sync idempotency.
- `/api/sync/batch` khong con dung module-global `Map`; idempotency di qua repository va production luu vao `sync_events`.
- Push subscriptions production di qua `push_subscriptions`; memory subscription store chi dung trong memory adapter.

Pham vi audit:

- Doc `docs/backend-frontend-split-plan.md`, `docs/api-v1.openapi.json`, `docs/final-audit-matrix.md`, `docs/final-gap-report.md`, `package.json`.
- Doc danh sach route trong `src/app/api/**/route.ts`.
- Doc cac module lien quan trong `src/lib/**`.
- Doc schema Supabase trong `supabase/migrations/0001_initial_schema.sql` va `supabase/migrations/0002_epic_19_20_auth_schema_rls.sql`.
- Chay baseline `npm run lint`, `npm test`, `npm run build`, `npm run openapi`.

## Ket qua baseline

| Lenh | Ket qua | Ghi chu |
|---|---:|---|
| `npm run lint` | Pass | ESLint khong bao loi. |
| `npm run openapi` | Pass | OpenAPI V1 hien co 46 paths va validator doi chieu 54 Fastify route operations tu `apps/api/src/routes/api-routes.ts`. |
| `npm run build` | Pass | Build shared, api va web thanh cong; web khong con route API Next. |
| `npm test` | Pass | 84 tests pass sau khi Next API route tests duoc thay bang Fastify route tests va API client tests. |
| `npm run test -w @evolvefit/api` | Pass | Fastify route tests cover contract chinh sau khi Next API routes duoc xoa khoi web. |
| `npm run build -w @evolvefit/shared` | Pass | Shared package build TypeScript rieng. |
| `npm run test -w @evolvefit/shared` | Pass | Shared package test rieng. |

## Tong quan contract hien tai

EvolveFit hien la monorepo co Next.js web app va backend Fastify doc lap. API handlers nam trong `apps/api/src/routes/api-routes.ts`, goi service layer `apps/api/src/lib/api.ts` va cac module server-only trong `apps/api/src/lib/**`. Frontend `apps/web` chi goi API qua `EvolveFitApiClient`.

Contract thuc te dang co 46 path API trong Next build. `docs/api-v1.openapi.json` da duoc cap nhat de bao phu du 46 paths, bao gom cac path truoc do bi thieu:

- `/api/achievements/me`
- `/api/achievements/recalculate`
- `/api/auth/callback`
- `/api/auth/oauth/google`
- `/api/cron/creatine-reminders`
- `/api/cron/hydration-reminders`
- `/api/cron/monthly-achievements`
- `/api/leaderboards`
- `/api/leaderboards/visibility`
- `/api/notifications/config`
- `/api/notifications/status`
- `/api/notifications/subscribe`
- `/api/notifications/test`
- `/api/notifications/unsubscribe`
- `/api/progression/recalculate`
- `/api/supabase/verify`
- `/api/supplements/{id}/reminder`
- `/api/workouts/today`

Ngoai ra, OpenAPI truoc day khai bao `ApiError.requestId` la bat buoc, nhung nhieu route cu tra truc tiep `{ ok, data }` hoac `{ ok, error }` tu `src/lib/api.ts` bang `NextResponse.json(result)` va khong co `requestId`. Spec da duoc sua de `requestId` la optional, khop behavior hien tai. Khi port sang backend Node.js rieng, co the chuan hoa request id cho toan bo API trong mot thay doi rieng.

## Module boundary hien tai

| Module | Vai tro | Boundary khi tach | Persistence/env |
|---|---|---|---|
| `packages/shared/src/core.ts` | Type domain, pure calculation, workout/session logic, reminders, reports, sync queue helpers, coach guardrails. | Shared giua web va backend sau nay. | Pure, khong dung runtime server/browser. |
| `packages/shared/src/app-data.ts` | Export/import/restore app data, schema version. | Shared; caller truyen app version tu runtime rieng. | Pure, khong doc `process.env`. |
| `apps/web/src/lib/storage.ts` | LocalStorage cho PWA local-first. | Frontend only. | Dung `window.localStorage`. |
| `apps/web/src/lib/api-client.ts` | Client goi `/api/**` tren backend rieng. | Frontend client package/web lib. | Doc `NEXT_PUBLIC_API_BASE_URL`; dung `credentials: "include"`. |
| `apps/api/src/lib/api.ts` | Service layer backend: CRUD, sync, coach, notification, achievements. | Backend only. | Dung request-local `AppState` tu repository context; memory chi dung khi `API_DATA_MODE=memory`. |
| `apps/api/src/lib/repositories.ts` | Repository boundary cho production/demo persistence. | Backend only. | Supabase REST adapter scope theo `user_id`; memory adapter cho demo/test. |
| `apps/api/src/lib/api-runtime.ts` | Request context cho user/repository/state. | Backend only. | AsyncLocalStorage, khong la production source of truth. |
| `apps/api/src/lib/auth.ts` | Local session, Supabase email auth, OAuth URL/PKCE/cookie payload. | Backend auth service + mot phan shared type. | Dung local module state va Supabase anon env. |
| `apps/api/src/lib/data-adapter.ts` | Memory adapter va Supabase REST adapter generic. | Backend repository/adapters. | Chon Supabase khi co `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, fallback memory. |
| `apps/api/src/lib/integrations.ts` | Integration status, Supabase REST/service role request, Supabase verify, AI coach provider. | Backend only tru mot so type status. | Dung Supabase env, service role, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`. |
| `apps/api/src/lib/push.ts` | Web Push VAPID/send. | Backend only. | Dung `NEXT_PUBLIC_VAPID_PUBLIC_KEY` hoac `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. |
| `apps/api/src/lib/observability.ts` | Request id, request logs, client errors, snapshot. | Backend observability service. | Memory logs/client errors. |
| `apps/api/src/lib/server-response.ts` | `jsonOk`, `jsonFail`, error handling va request id header. | Backend HTTP adapter/hook pattern. | Fastify reply/request. |
| `apps/api/src/lib/rate-limit.ts` | Memory rate limit buckets. | Backend plugin/hook hoac thay bang `@fastify/rate-limit`. | Memory `Map`. |
| `packages/shared/src/seed.ts` | `initialState`, fixtures, templates. | Shared fixture/test/demo only; khong lam production source of truth. | Duoc clone vao memory serverState. |

## Endpoint inventory

### Auth

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/auth/session` | GET | `src/app/api/auth/session/route.ts` | `getAuthSession`, `parseSessionCookieValue`, observability headers | `localSession` memory hoac cookie `evolvefit_session` | Cookie header | `{ ok: true, data: AuthSession, requestId }`; covered by `contract-routes.test.ts`. |
| `/api/auth/sign-in` | POST | `src/app/api/auth/sign-in/route.ts` | `readJson`, `signIn`, cookie helpers | `localSession` memory; optional Supabase Auth REST | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NODE_ENV` | 200 ok + optional httpOnly cookie; 401 error + requestId; covered by route regression and auth unit tests. |
| `/api/auth/sign-up` | POST | `src/app/api/auth/sign-up/route.ts` | `signUp`, cookie helpers | `localSession`; optional Supabase Auth REST | Supabase anon env, `NODE_ENV` | 400 missing email/password; 200 ok or 400 Supabase failure. Needs route-level regression for success/error. |
| `/api/auth/sign-out` | POST | `src/app/api/auth/sign-out/route.ts` | `signOut` | Resets `localSession` | Cookie delete | `{ ok: true, data: AuthSession }` without requestId; covered by route regression. |
| `/api/auth/oauth/google` | GET | `src/app/api/auth/oauth/google/route.ts` | OAuth PKCE helpers, `createAppUrl` | OAuth verifier/state cookies | Supabase anon env, `NODE_ENV`, site URL env | 302 redirect to Supabase or 503 missing env. Not in OpenAPI; needs route test. |
| `/api/auth/callback` | GET | `src/app/api/auth/callback/route.ts` | PKCE exchange or token session helpers | Session cookie + `localSession` | Supabase anon env, site URL env, `NODE_ENV` | 302 redirect on success; 400 invalid/missing token/code. Not in OpenAPI; needs route test. |

### Hydration

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/hydration/today` | GET | `hydration/today/route.ts` | `getHydrationToday` | `serverState.hydrationLogs`, profile, drink modules | None | `{ ok, data: { logs,totalMl,targetMl,expectedMl } }`; service tested, OpenAPI covered. |
| `/api/hydration/log` | POST | `hydration/log/route.ts` | `readJson`, `logHydration` | `serverState.hydrationLogs` | None | 200 valid, 400 missing/zero amount; route regression added. |
| `/api/hydration/log/{id}` | PATCH | `hydration/log/[id]/route.ts` | `patchHydrationLog` | `serverState.hydrationLogs` | None | `{ ok, data }` or `{ ok:false,error }`; status is always default 200 currently, even not found/invalid. Route regression covers success. |
| `/api/hydration/log/{id}` | DELETE | `hydration/log/[id]/route.ts` | `deleteHydrationLog` | `serverState.hydrationLogs` | None | `{ ok, data:{id} }` or `{ ok:false,error }`; status is always default 200 currently. Route regression covers success. |

### Supplements

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/supplements` | GET | `supplements/route.ts` | `listSupplements` | `serverState.supplements` | None | `{ ok, data: Supplement[] }`; service/OpenAPI covered. |
| `/api/supplements` | POST | `supplements/route.ts` | `createSupplement` | `serverState.supplements` | None | 200 or 400; service/API client tests cover. |
| `/api/supplements/log` | POST | `supplements/log/route.ts` | `logSupplement` | `serverState.supplementLogs` | None | 200/400 based on result; service covered. |
| `/api/supplements/{id}/reminder` | PATCH | `supplements/[id]/reminder/route.ts` | `updateSupplementReminder` | `serverState.supplements` | None | `{ ok, data/error }`, default status 200; not in OpenAPI. |
| `/api/supplements/{id}/reminder` | PUT | `supplements/[id]/reminder/route.ts` | `updateSupplement` | `serverState.supplements` | None | Full supplement update via same path; client currently calls PATCH for full update, while route exposes PUT. Contract mismatch to resolve. |

### Routines

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/routines` | GET | `routines/route.ts` | `listRoutines` | `serverState.routines` | None | `{ ok, data: Routine[] }`; route regression added. |
| `/api/routines` | POST | `routines/route.ts` | `createRoutine` | `serverState.routines` | None | 200/400; route regression added. |
| `/api/routines/{id}` | PATCH | `routines/[id]/route.ts` | `updateRoutine` | `serverState.routines` | None | 200/400; may return `{ conflict:true,... }` inside ok data. Route regression covers success; service covers conflict. |
| `/api/routines/{id}` | DELETE | `routines/[id]/route.ts` | `deleteRoutine` | `serverState.routines` | None | 200/404; route regression added. |

### Exercises

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/exercises` | GET | `exercises/route.ts` | `listExercises` | `serverState.exerciseLibrary` | None | `{ ok, data: ExerciseDefinition[] }`; route regression added. |
| `/api/exercises` | POST | `exercises/route.ts` | `createExercise` | `serverState.exerciseLibrary` | None | 200/400; route regression added. |
| `/api/exercises/{id}` | PATCH | `exercises/[id]/route.ts` | `updateExercise` | `serverState.exerciseLibrary` | None | 200/400; route regression added. |
| `/api/exercises/{id}` | DELETE | `exercises/[id]/route.ts` | `deleteExercise` | `serverState.exerciseLibrary` | None | 200/404; route regression added. |

### Workouts

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/workouts/today` | GET | `workouts/today/route.ts` | `getWorkoutToday` | `serverState.workoutExercises`, `serverState.workoutSets` | None | `{ ok, data:{routineName,exercises,sets} }`; not in OpenAPI. |
| `/api/workouts/sessions` | POST | `workouts/sessions/route.ts` | `startWorkoutSession` | `serverState.workoutSessions`, active session id | None | 200/400; route regression added. |
| `/api/workouts/sessions/{id}/finish` | POST | `workouts/sessions/[id]/finish/route.ts` | `finishWorkoutSessionById` | `serverState.workoutSessions` | None | 200/404; route regression added. |
| `/api/workouts/sessions/{id}/pause` | POST | `workouts/sessions/[id]/pause/route.ts` | `pauseWorkoutSessionById` | `serverState.workoutSessions` | None | 200/404; route regression added. |
| `/api/workouts/sessions/{id}/resume` | POST | `workouts/sessions/[id]/resume/route.ts` | `resumeWorkoutSessionById` | `serverState.workoutSessions` | None | 200/404; route regression added. |
| `/api/workouts/sessions/{id}/reorder` | POST | `workouts/sessions/[id]/reorder/route.ts` | `reorderWorkoutSession` | `serverState.workoutSessions` | None | 200/400; route regression added. |
| `/api/workouts/sets` | POST | `workouts/sets/route.ts` | `createWorkoutSet` | `serverState.workoutSets` | None | 200/400; service and sync tests cover. |
| `/api/workouts/sets/{id}` | PATCH | `workouts/sets/[id]/route.ts` | `updateWorkoutSet` | `serverState.workoutSets` | None | 200/404; service tests cover. |
| `/api/workouts/sets/{id}` | DELETE | `workouts/sets/[id]/route.ts` | `deleteWorkoutSet` | `serverState.workoutSets` | None | 200/404; service tests cover. |

### Sync/offline

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/sync/batch` | POST | `sync/batch/route.ts` | `syncBatch` | `serverState.*`, `idempotencyResults Map` | None | 200/400; route regression covers validation/idempotency; service covers conflict. Production must move idempotency to DB. |

### Achievements va leaderboards

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/achievements/me` | GET | `achievements/me/route.ts` | `getAchievementsAndLeaderboard` | Derived from `serverState`, `leaderboardVisible` memory | None | `{ ok,data:{achievements,leaderboardVisible,leaderboard} }`; not in OpenAPI. |
| `/api/achievements/recalculate` | POST | `achievements/recalculate/route.ts` | `recalculateAchievements` | Derived memory | None | Same data shape; not in OpenAPI. |
| `/api/leaderboards` | GET | `leaderboards/route.ts` | `getAchievementsAndLeaderboard` | Derived memory | None | Same data shape; not in OpenAPI. |
| `/api/leaderboards/visibility` | PATCH | `leaderboards/visibility/route.ts` | `updateLeaderboardVisibility` | `leaderboardVisible`, `serverState.profile.leaderboardPublic` | None | `{ ok:true,data:{isPublic} }`; not in OpenAPI. |

### Coach va progression

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/progression/recalculate` | POST | `progression/recalculate/route.ts` | `recalculateProgression` | Reads workout state | None | `{ ok,data:Recommendation }` or error; not in OpenAPI. |
| `/api/coach/recommend` | POST | `coach/recommend/route.ts` | `coachRecommend`, `aiCoachRecommendation` | `serverState.recommendationHistory` memory | `GEMINI_API_KEY` or `OPENAI_API_KEY`; fallback rules | Uses `jsonOk/jsonFail` with requestId; OpenAPI covered. Service tests cover fallback. |
| `/api/coach/recommendations/{id}/feedback` | POST | `coach/recommendations/[id]/feedback/route.ts` | `coachRecommendationFeedback` | `serverState.recommendationHistory`, decisions memory | None | 200/400/404 with requestId; OpenAPI covered. |

### Notifications

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/notifications/config` | GET | `notifications/config/route.ts` | `notificationConfig` | None | VAPID env | `{ ok,data:{vapidPublicKey,configured,browserEnv,fallbackMode} }`; not in OpenAPI. |
| `/api/notifications/status` | GET | `notifications/status/route.ts` | `notificationStatus` | `notificationSubscriptions[]` memory | VAPID env | Query `localProfileId`; not in OpenAPI. |
| `/api/notifications/subscribe` | POST | `notifications/subscribe/route.ts` | `subscribeNotifications` | `notificationSubscriptions[]` memory | None | Requires endpoint+p256dh+auth; route test exists. Not in OpenAPI. |
| `/api/notifications/unsubscribe` | POST | `notifications/unsubscribe/route.ts` | `unsubscribeNotifications` | `notificationSubscriptions[]` memory | None | Route test exists. Not in OpenAPI. |
| `/api/notifications/test` | POST | `notifications/test/route.ts` | `sendTestNotification` | Reads memory subscriptions; sends Web Push if configured | VAPID env | Fallback metadata if no subscriptions/env. Not in OpenAPI. |

### Cron

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/cron/hydration-reminders` | POST | `cron/hydration-reminders/route.ts` | `requireCronAuth`, `sendHydrationReminderEvents` | Updates `serverState.notificationSettings.lastHydrationReminderAt`, memory subscriptions | `CRON_SECRET`, VAPID env | 503 missing secret, 401 wrong bearer, 200 ok; route tests exist. Not in OpenAPI. |
| `/api/cron/creatine-reminders` | POST | `cron/creatine-reminders/route.ts` | `sendCreatineReminderEvents` | Updates `lastCreatineReminderAt`, memory subscriptions | `CRON_SECRET`, VAPID env | Same auth contract; route tests exist. Not in OpenAPI. |
| `/api/cron/monthly-achievements` | POST | `cron/monthly-achievements/route.ts` | `sendMonthlyAchievementEvents` | Derived achievements, memory subscriptions | `CRON_SECRET`, VAPID env | Same auth contract; route tests exist. Not in OpenAPI. |

### Integrations, observability, docs, Supabase verify

| Endpoint | Method | Handler | Service/lib | Persistence | Env/secret | Response/test |
|---|---|---|---|---|---|---|
| `/api/health` | GET | `health/route.ts` | `getIntegrationStatus`, `server-response` | None | Supabase/VAPID/AI/cron env status only | `{ ok,true,data:{app,version,runtime,checkedAt,integrations,storageAdapter},requestId }`; OpenAPI covered; route regression added. |
| `/api/integrations/status` | GET | `integrations/status/route.ts` | `getIntegrationStatus`, `server-response` | None | Supabase service role/anon, AI, VAPID, cron env | `{ ok,data:IntegrationStatus,requestId }`; OpenAPI covered. |
| `/api/supabase/verify` | GET | `supabase/verify/route.ts` | `verifySupabaseProduction` | Makes service role read checks | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `{ ok,data:{configured,tables},requestId }`; OpenAPI covered. |
| `/api/docs/openapi` | GET | `docs/openapi/route.ts` | Imports `docs/api-v1.openapi.json` | Static JSON | None | Returns raw OpenAPI spec with `x-request-id`; OpenAPI now describes raw spec response. |
| `/api/observability/logs` | GET | `observability/logs/route.ts` | `listRequestLogs`, `listClientErrors`, `observabilitySnapshot`, `server-response` | In-memory request/client logs | Env status snapshot | Query `requestId`; OpenAPI covered. |
| `/api/client-errors` | POST | `client-errors/route.ts` | `recordClientError`, `server-response` | In-memory client errors | None | 200 with `{requestId,reportedAt}` or 400 `message is required`; OpenAPI covered. |

## Persistence audit

Production source of truth is not yet enforced in API handlers:

- `src/lib/api.ts` clones `initialState` into `serverState` once per process.
- Notification subscriptions live in process memory array `notificationSubscriptions`.
- Sync idempotency lives in process memory `idempotencyResults Map`.
- Auth `localSession` lives in module memory unless cookie/Supabase token path is used.
- Observability request logs/client errors live in process memory.
- `src/lib/data-adapter.ts` has Supabase REST adapter, but current API service layer does not consistently use repository/adapters for domain records.

Supabase migrations already define tables/RLS for production repository work: profiles, hydration logs, drink modules, supplements/logs, routines/days/exercises, exercise library, workout sessions/sets, body metrics, progression recommendations, achievements, leaderboards, push subscriptions, notification events, sync events. Khi tach backend, repository layer can map vao cac table nay va phai scope theo `user_id`.

## Env va secret inventory

| Env | Dang dung o dau | Ghi chu khi tach |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | auth, integrations, data-adapter, health | Ten public phu hop frontend URL, nhung backend nen co alias server-side ro rang neu can. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | auth, integrations, data-adapter | Public anon key ok cho client, backend auth verify can chien luoc Bearer/cookie ro hon. |
| `SUPABASE_SERVICE_ROLE_KEY` | integrations verify | Backend only, khong leak frontend. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push config/status, integrations | Public key co the ra frontend. |
| `VAPID_PUBLIC_KEY` | push fallback public key | Backend env hoac expose qua config endpoint. |
| `VAPID_PRIVATE_KEY` | `sendWebPush` | Backend only. |
| `VAPID_SUBJECT` | `sendWebPush` | Backend only. |
| `CRON_SECRET` | cron auth, integrations status | Backend/scheduler only. |
| `GEMINI_API_KEY` | AI coach | Backend only. |
| `OPENAI_API_KEY` | AI coach | Backend only. |
| `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `NEXT_PUBLIC_APP_URL`, `APP_URL` | OAuth callback URL builder | Khi tach domain, can set web/api redirect URL chinh xac. |
| `NEXT_PUBLIC_APP_VERSION` | app data export | Frontend/shared concern. |
| `NODE_ENV` | cookie secure flag | Backend cookie config khi Fastify. |

## Test coverage hien tai

Da co:

- `src/lib/api.test.ts`: service layer cho hydration, supplements, notifications, coach, routines/exercises, workout sessions/sets, sync conflict/idempotency.
- `src/lib/auth.test.ts`: auth local/Supabase/OAuth helpers.
- `src/lib/integrations.test.ts`: integration status, Supabase request/verify, AI fallback/provider.
- `src/lib/push.test.ts`: VAPID detection/send behavior.
- `src/lib/server-response.test.ts`: request id/error envelope/logging helper.
- `src/app/api/cron/route.test.ts`: cron secret auth va 3 cron handlers.
- `src/app/api/notifications/route.test.ts`: subscribe/unsubscribe route happy path.
- `src/app/api/contract-routes.test.ts`: route-level regression moi cho health, auth session/sign-in/sign-out, hydration create/patch/delete, routines/exercises CRUD, workout session lifecycle/reorder, sync validation/idempotency.

Con mong:

- Route-level tests cho sign-up error/success cookie, OAuth Google redirect/callback PKCE.
- Route-level tests cho supplements reminder `PATCH`/`PUT`, notification config/status/test, Supabase verify missing/configured env.
- Route inventory validation da nam trong `npm run openapi`; nen bo sung test CI gate neu muon bat buoc full check.
- Route status tests cho hydration patch/delete not found; hien handler tra status 200 cho error.
- Route-level test rieng cho `/api/docs/openapi` neu can khoa response raw spec va `x-request-id`.

## Gap can dong bang truoc phase tach tiep theo

1. Can quyet dinh response envelope chuan: giu `{ ok,data/error }` voi `requestId` optional nhu hien tai, hay them `requestId` toan bo API.
2. Can quyet dinh status code cho route cu dang tra 200 khi `{ ok:false }`, nhat la hydration patch/delete va supplements reminder.
3. Can sua mismatch `EvolveFitApiClient.updateSupplement()` dang goi `PATCH /api/supplements/{id}/reminder` trong khi route update full supplement la `PUT`.
4. Can tach production persistence khoi memory state trong goal sau; audit nay chi ghi nhan, chua refactor.
5. Can khong dua server-only env sang frontend khi tach: service role, VAPID private, cron secret, AI keys.
6. `npm test` baseline dang fail do UI onboarding/test expectation, nen truoc khi dung full suite lam gate migration can sua hoac chap nhan baseline nay bang issue rieng.

## Checklist port sang backend Node.js

- Port route theo nhom va giu response/status tu bang endpoint inventory.
- Viet Fastify hooks thay `server-response.ts`: request id, log, error envelope.
- Viet Fastify cron auth thay `src/app/api/cron/auth.ts`.
- Move `src/lib/api.ts` sang service backend nhung tach repository truoc khi production.
- Move `src/lib/auth.ts`, `integrations.ts`, `push.ts`, `observability.ts`, `rate-limit.ts` sang backend; chi de type/pure function trong shared.
- Dung `src/lib/core.ts` lam ung vien chinh cho `packages/shared`.
- Giu `src/lib/storage.ts` va local-first queue o frontend.
- Khi OpenAPI duoc cap nhat, them test route inventory vs spec de khoa contract.
