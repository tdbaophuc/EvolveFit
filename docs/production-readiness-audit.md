# EvolveFit production readiness audit

Cap nhat: 2026-09-27

## Tom tat

EvolveFit hien la monorepo TypeScript gom:

- `apps/web`: Next.js 15 PWA, local-first, luu state vao `localStorage`.
- `apps/api`: Fastify backend rieng, co CORS, cookie, rate limit, request id, auth, Supabase-ready repository, Web Push, cron, observability va OpenAPI.
- `packages/shared`: domain types, seed state, pure business logic, import/export/migration helpers va tests.
- `supabase/migrations`: schema/RLS cho profile, hydration, supplement, routine, workout, body metrics, achievements, leaderboard, push, sync va cron locks.

Trang thai local hien tai tot cho prototype/contract hardening: lint, test, build, OpenAPI parity va smoke deu pass. Trang thai production chua duoc chung minh tren Supabase staging that trong session nay, nen cac muc Supabase/Web Push/cron duoc xep la "co contract, can staging proof".

## Pham vi doc/audit da xem

- Root workspace: `package.json`, `package-lock.json`, `vitest.config.ts`, `eslint.config.mjs`.
- Web: `apps/web/package.json`, `apps/web/src/app/page.tsx`, `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/storage.ts`, tests va PWA assets.
- API: `apps/api/src/app.ts`, `apps/api/src/routes/api-routes.ts`, `apps/api/src/lib/api.ts`, `auth.ts`, `repositories.ts`, `integrations.ts`, `push.ts`, `observability.ts`, tests.
- Shared: `packages/shared/src/core.ts`, `seed.ts`, `app-data.ts`, tests.
- Supabase: `supabase/migrations/0001_initial_schema.sql` den `0004_cron_readiness_deploy.sql`.
- Docs/scripts: `docs/deploy-runbook.md`, `docs/final-audit-matrix.md`, `docs/final-gap-report.md`, `docs/api-v1.openapi.json`, `.github/workflows/ci.yml`, `scripts/openapi.mjs`, `scripts/smoke.mjs`.

## Baseline verification

Chay tren worktree hien tai cua branch `breakthrough`.

Luu y: worktree truoc audit da co thay doi chua commit khong thuoc audit:

- `apps/web/src/app/globals.css`
- `apps/web/src/app/page.tsx`
- `docs/dexuat.md` bi xoa
- `apps/web/public/assets/`
- `docs/TrangChu giao dien.md`

Ket qua:

| Lenh | Ket qua | Ghi chu |
|---|---:|---|
| `npm run lint` | Pass | ESLint pass toan repo. |
| `npm test` | Pass | 6 test files, 88 tests pass. Log 401/503 trong API tests la expected coverage. |
| `npm run build` | Pass | Shared `tsc --noEmit`, API `tsc`, Web `next build` pass. |
| `npm run openapi` | Pass | OpenAPI V1: 47 spec paths, 55 Fastify route operations. |
| `npm run smoke` | Pass | Web/API local smoke pass cho `/`, `/hydration`, health/ready/docs/observability/notifications/auth/hydration/client-errors/coach. |

Staging Supabase that: chua chay trong session nay vi khong co thong tin env/project staging duoc cung cap. Can chay checklist staging ben duoi de chot proof production.

## Ma tran subsystem

| Subsystem | Trang thai | Chung cu hien co | Rui ro production |
|---|---|---|---|
| Auth | Co contract, can hardening | Email/password, Google OAuth PKCE, session cookie, bearer JWT verify voi Supabase; tests local/auth error. | Chua co forgot/reset password, email verification UX, refresh token lifecycle ro, account deletion server-side, merge local data sau dang nhap. |
| Profile | Co schema/basic persistence | `profiles` table, state profile, settings UI, export/import. | Supabase load/save chua map day du mot so field nhu bodyWeight/height/goals/workoutDays/onboarding; can migration/contract ro neu dung cloud profile that. |
| Hydration | Kha san sang local/API | Log/patch/delete, drink modules, target/expected pace, tests, smoke. | API hien chi log `water`; drink type/module changes chu yeu local/sync. Can staging proof RLS va multi-device writes. |
| Supplements | Kha san sang local/API | Supplements, supplement logs, reminders, skipped log, schema/tests. | Validation con thu cong; schedule/reminder persistence can proof voi cron/push staging. |
| Routines | Co core, can conflict proof | CRUD routines, days/exercises, CSV import/export, conflict preview via `baseUpdatedAt`. | Supabase repository replace user rows cho routines/days/exercises; high risk khi multi-device ghi dong thoi. |
| Exercises | Co library co ban | Built-in/custom library, filters, CRUD API, schema. | Built-in/global exercise strategy chua ro; exercise metadata con mong cho production coaching. |
| Workout sessions/sets | Co UX/API tot cho local | Start/pause/resume/finish/reorder, set CRUD, rest timer, PR, plate calculator, tests. | Session queue/order va duration khong duoc hydrate day du tu Supabase row mapping; conflict/offline multi-device can proof. |
| Progress/body metrics | Kha day du local | Dashboard 7/30, e1RM, PRs, body metric validation/chart, reports. | Backend endpoints rieng cho body metrics/progress chua ro; cloud persistence di qua full state save. Chua co progress photos. |
| Recommendations/coach | Co rule fallback va optional AI | `aiCoachRecommendation`, Gemini/OpenAI optional, guardrail, feedback history, tests. | AI provider chua staging proof; coach data context con han che; can safety/product policy truoc production. |
| Sync queue | Co UI/contract, can production proof | Local queue, retry/backoff, `sync_events`, idempotency key, conflict state, tests. | Server apply sync van mutate loaded `AppState`; Supabase save result va state granular chua du, duplicate/concurrent/restart can test sau hon. |
| Web Push | Co contract/UI/backend | VAPID config/status, subscribe/unsubscribe/test, push subscriptions table, tests. | Chua proof real browser subscription + VAPID delivery; service worker production domain can kiem tra them. |
| Cron | Co protected endpoints va DB lock | Hydration/creatine/monthly endpoints, `CRON_SECRET`, `notification_events` lock RPC. | Chua proof scheduler staging/production, `CRON_USER_ID` va per-user fanout strategy can lam ro. |
| Health integration | UX/contract only | Settings, permission status, selected data types, nativeBridgeAvailable guard. | Chua co native bridge. Khong nen coi la sync that trong production web-only. |
| Import/export/delete data | Kha tot local | JSON export with metadata, selective restore, CSV export, local delete, tests. | Delete cloud/account chua co endpoint production; export khong gom server-only artifacts/push/sync events. |
| Observability | Co nen tang local | RequestId, request logs, client error endpoint, observability logs, smoke. | In-memory logs, chua co provider/retention/alerting/redaction policy production. |
| Deployment | Co runbook/Docker/CI | Dockerfiles, deploy runbook, GitHub Actions, smoke script. | Chua co env examples trong repo listing hien tai; staging/prod secrets va migration workflow chua duoc chay that. |
| CI | Tot cho baseline | CI chay lint/test/build/openapi/smoke tren push/PR. | CI khong chay Supabase staging integration; OpenAPI script chi check route/spec parity, khong generate schema tu source. |

## Endpoint groups can verify

Health/docs/ops:

- `GET /api/health`
- `GET /api/ready`
- `GET /api/integrations/status`
- `GET /api/supabase/verify`
- `GET /api/docs/openapi`
- `GET /api/observability/logs`
- `POST /api/client-errors`

Auth:

- `GET /api/auth/session`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-up`
- `POST /api/auth/sign-out`
- `GET /api/auth/oauth/google`
- `GET /api/auth/callback`

Core data:

- Hydration: `GET /api/hydration/today`, `POST /api/hydration/log`, `PATCH/DELETE /api/hydration/log/{id}`
- Supplements: `GET/POST /api/supplements`, `POST /api/supplements/log`, `PATCH/PUT /api/supplements/{id}/reminder`
- Routines: `GET/POST /api/routines`, `PATCH/DELETE /api/routines/{id}`
- Exercises: `GET/POST /api/exercises`, `PATCH/DELETE /api/exercises/{id}`
- Workouts: `GET /api/workouts/today`, session start/finish/pause/resume/reorder, set create/update/delete
- Progress/sync/social: progression recalc, sync batch, achievements, leaderboards, coach recommend/feedback
- Notifications/cron: notification config/status/subscribe/unsubscribe/test, cron hydration/creatine/monthly endpoints

## Env can thiet

API local/prod:

- `PORT`
- `API_DATA_MODE=memory|supabase`
- `API_CORS_ORIGIN`
- `API_RATE_LIMIT_MAX`
- `API_RATE_LIMIT_WINDOW`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `CRON_USER_ID`
- `CRON_USER_EMAIL`
- `VAPID_PUBLIC_KEY` hoac `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `GEMINI_API_KEY` hoac `OPENAI_API_KEY` neu dung AI coach

Web local/prod:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

## Staging proof checklist

Can tao Supabase staging project, apply migrations va co 2 user test.

### 1. Apply migrations

```bash
supabase link --project-ref <staging-project-ref>
supabase db push
```

Expected:

- 4 migration files apply thanh cong.
- Cac bang/RLS/RPC `evolvefit_acquire_notification_event_lock` ton tai.

### 2. API readiness voi Supabase mode

Chay API voi env staging:

```bash
API_DATA_MODE=supabase \
NEXT_PUBLIC_SUPABASE_URL=<staging-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
API_CORS_ORIGIN=http://127.0.0.1:5173 \
CRON_SECRET=<secret> \
npm run dev:api
```

Verify:

```bash
curl -i http://127.0.0.1:4000/api/health
curl -i http://127.0.0.1:4000/api/ready
curl -i http://127.0.0.1:4000/api/supabase/verify
```

Expected:

- `/api/health` 200.
- `/api/ready` 200 voi `mode=supabase`, `storageAdapter=supabase`.
- `/api/supabase/verify` co `ok=true` cho cac tables chinh.

### 3. Auth va RLS voi 2 user

Tao 2 user staging va lay access token bang sign-in:

```bash
curl -s -X POST http://127.0.0.1:4000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"user-a@example.com","password":"<password>","mode":"email"}'

curl -s -X POST http://127.0.0.1:4000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"user-b@example.com","password":"<password>","mode":"email"}'
```

Verify moi user:

```bash
curl -i http://127.0.0.1:4000/api/auth/session -H "Authorization: Bearer <token-a>"
curl -i http://127.0.0.1:4000/api/hydration/today -H "Authorization: Bearer <token-a>"
curl -i http://127.0.0.1:4000/api/hydration/today -H "Authorization: Bearer <token-b>"
```

Expected:

- Khong token: data endpoints 401.
- Token A/B: 200 va user khong thay du lieu nhau.

### 4. Web-to-API smoke staging

Chay web tro den API staging/local:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 npm run dev -w @evolvefit/web
```

Manual flow:

- Dang nhap user A.
- Log nuoc.
- Tao routine.
- Start workout session.
- Finish workout session.
- Goi sync batch tu queue.
- Refresh browser va verify du lieu van con.
- Dang nhap user B va verify khong thay data user A.

Expected:

- Khong mat du lieu sau refresh/backend restart.
- Sync retry khong tao duplicate.
- Conflict routine co preview/confirm.

### 5. Web Push va cron staging

Can VAPID va browser that.

```bash
curl -i http://127.0.0.1:4000/api/notifications/config
curl -i http://127.0.0.1:4000/api/notifications/status?localProfileId=<profile-id> -H "Authorization: Bearer <token>"
curl -i -X POST http://127.0.0.1:4000/api/cron/hydration-reminders -H "Authorization: Bearer <CRON_SECRET>"
curl -i -X POST http://127.0.0.1:4000/api/cron/creatine-reminders -H "Authorization: Bearer <CRON_SECRET>"
curl -i -X POST http://127.0.0.1:4000/api/cron/monthly-achievements -H "Authorization: Bearer <CRON_SECRET>"
```

Expected:

- Notification config configured khi VAPID dung.
- Browser subscribe thanh cong.
- Test notification den browser hoac tra fallback co ly do ro.
- Cron lan 2 cung UTC hour/month bi skip theo lock, khong gui trung.

## P0 blockers truoc production

1. Chung minh Supabase staging end-to-end: migrations, `/api/ready`, `/api/supabase/verify`, auth, RLS 2 user, smoke web-to-api.
2. Refactor hoac it nhat harden persistence cho production: giam full-state replace, them granular writes/version/conflict tests cho multi-device.
3. Hoan thien auth lifecycle: forgot/reset password, email verification UX, token refresh/session expiry, account deletion server-side.
4. Lam UX merge local data sau dang nhap: merge/replace/keep local, preview va idempotent sync.
5. Web Push/cron proof voi VAPID/browser/scheduler staging, gom duplicate-lock behavior.
6. Cloud delete/export data policy: user delete phai xoa server data, push subscriptions va sync artifacts.

## P1 can lam som

1. API schema validation co cau truc cho body/query/params thay vi validation thu cong rai rac.
2. Chuan hoa error contract va localize/codify cac error message con tieng Anh.
3. Tach `apps/web/src/app/page.tsx` thanh components/hooks theo domain de giam rui ro bao tri.
4. Bo sung observability provider/retention/alerting thay vi in-memory logs.
5. Them staging CI job optional khi co secrets, bao gom Supabase integration smoke.
6. Hoan thien env examples cho web/API neu chua co trong repo.
7. Lam ro built-in exercise/global library strategy va metadata nang cao.

## P2 nen dua vao roadmap

1. Progress photos voi private storage.
2. Nutrition MVP nhe.
3. Native/Health Connect/Apple Health bridge decision.
4. Coach V2 voi plateau/deload/equipment substitution.
5. Dashboard retention/product analytics khong xam pham privacy.

## Ket luan

EvolveFit da co nen tang engineering kha tot cho mot PWA fitness local-first: monorepo ro, shared domain logic, backend rieng, Supabase schema/RLS, CI, tests, OpenAPI va smoke. Diem chua production nhat khong nam o viec thieu UI core, ma nam o proof van hanh that: Supabase staging, auth lifecycle, multi-device sync, granular persistence, push/cron delivery va data deletion/export tren cloud.

Khuyen nghi tiep theo: chay staging proof checklist truoc, sau do lam Goal 2 va Goal 3 trong `docs/production-readiness-goals.md`.
