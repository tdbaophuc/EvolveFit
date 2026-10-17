# Goal commands tach backend Node.js va frontend EvolveFit

Tai lieu nay chua cac lenh goal co the dung tuan tu de tach EvolveFit tu Next.js monolith thanh backend Node.js rieng va frontend rieng. Moi goal duoc gom thanh mot khoi viec lon, co audit, sua code, test va cap nhat tai lieu lien quan. Khong nen chay song song cac goal vi moi goal phu thuoc vao trang thai sau goal truoc.

Nguon tham chieu chinh:

- `docs/backend-frontend-split-plan.md`
- `docs/api-v1.openapi.json`
- `docs/final-audit-matrix.md`
- `docs/final-gap-report.md`
- `package.json`
- `src/app/api/**/route.ts`
- `src/lib/**`
- `supabase/migrations/**`

## Goal 1 - Dong bang contract API va baseline truoc khi tach

```text
/goal Audit va dong bang contract API hien tai truoc khi tach backend/frontend EvolveFit.

Doc `docs/backend-frontend-split-plan.md`, `docs/api-v1.openapi.json`, `docs/final-audit-matrix.md`, `docs/final-gap-report.md`, `package.json`, toan bo `src/app/api/**/route.ts`, cac module server/client trong `src/lib/**`, va cac migration trong `supabase/migrations/**` neu can de hieu contract hien tai. Lap danh sach day du endpoint dang co theo nhom auth, hydration, supplements, routines, exercises, workouts, sync, achievements, leaderboards, coach, notifications, cron, integrations, observability, docs va supabase verify.

Chay baseline `npm run lint`, `npm test`, `npm run build`, va `npm run openapi` neu script kha dung. Neu co loi, phan biet loi baseline da ton tai voi loi do thay doi cua goal nay. Cap nhat hoac tao tai lieu audit trong `docs` ghi ro endpoint, method, handler hien tai, service/lib dang dung, loai persistence dang dung, env/secret lien quan, response shape quan trong, test hien co, va gap test can bo sung.

Bo sung regression test tap trung cho cac endpoint co rui ro cao neu contract dang mong: auth session/sign-in/sign-out, hydration today/log, supplements, routines/exercises, workout sessions/sets, sync batch, notification subscribe/unsubscribe/status, cron auth va health. Khong rewrite kien truc trong goal nay. Ket thuc goal khi contract OpenAPI va test baseline dang phan anh dung hanh vi hien tai, co tai lieu ro de dung lam checklist port sang backend rieng.
```

## Goal 2 - Chuyen sang npm workspaces va tach shared package khong doi hanh vi

```text
/goal Chuan bi monorepo EvolveFit voi `apps/web` va `packages/shared` ma khong thay doi hanh vi nguoi dung.

Bat dau tu ket qua audit o goal truoc. Sua root `package.json` thanh npm workspaces, giu cac script root tien dung de goi check/test/build cho workspace moi. Tao `apps/web` va di chuyen Next.js frontend hien co vao do gom `src/app/**`, `public/**`, `next.config.ts`, `next-env.d.ts`, `middleware.ts` neu con can trong giai doan chuyen tiep, file config Next/ESLint/TS can thiet, va test frontend lien quan. Tao `packages/shared` voi TypeScript build/test rieng.

Phan loai `src/lib/**`: move cac type, constants, pure function va data khong phu thuoc Next/Node/browser sang `packages/shared/src` nhu `core.ts`, `app-data.ts` va phan type/fixture an toan tu `seed.ts` neu phu hop. Khong dua `window`, `localStorage`, `next/*`, cookie runtime, `process.env`, Web Push, Supabase REST adapter, observability server hoac response helper server vao shared. Cap nhat import sang `@evolvefit/shared` va thiet lap `tsconfig` paths/package exports de web tiep tuc build duoc.

Giu behavior cu: UI Next van chay, API routes Next tam thoi van hoat dong trong `apps/web` neu backend rieng chua port xong. Cap nhat script dev/build/test/lint cho workspace, sua duong dan trong script OpenAPI/smoke neu bi anh huong, va cap nhat docs neu cau truc moi khac voi plan. Chay `npm run lint`, `npm test`, `npm run build` hoac script workspace tuong duong; sua loi import/module resolution phat sinh. Ket thuc goal khi repo co `apps/web`, `packages/shared`, UI/API Next cu van pass check, va shared package khong chua dependency server/browser sai boundary.
```

## Goal 3 - Tao `apps/api` Node.js Fastify va port endpoint theo contract

```text
/goal Tao backend Node.js rieng trong `apps/api` bang Fastify va port API tu Next routes sang backend doc lap theo contract hien co.

Dung ket qua goal 1 va cau truc workspace goal 2. Tao `apps/api` TypeScript voi Fastify, script dev/build/test/start, cau hinh tsconfig/eslint/vitest phu hop workspace. Cai cac dependency backend can thiet nhu `fastify`, `@fastify/cors`, `@fastify/cookie`, `@fastify/rate-limit`, validation library neu can, va giu cac package server hien co nhu `web-push` neu dang dung.

Move hoac port server-only modules sang `apps/api/src`: service layer tu `api.ts`, `auth.ts`, `data-adapter.ts`, `integrations.ts`, `push.ts`, `observability.ts`, `server-response.ts`, `rate-limit.ts`, cron auth va cac helper env/URL server. Backend khong duoc import Next/React/browser API. Shared domain/type phai import tu `@evolvefit/shared`.

Tao Fastify plugins/hooks cho request id, access log/observability, CORS theo `API_CORS_ORIGIN`, cookie neu auth can, rate limit, error envelope `{ ok: false, error, requestId }`, va response helpers tuong thich voi contract cu. Port cac route theo thu tu it rui ro den cao: health/docs/integrations/supabase verify, auth, hydration/supplements, routines/exercises, workouts/sets/sessions/progression, sync batch, achievements/leaderboards/coach, notifications va cron. Giu response shape, status code va validation loi quan trong khop OpenAPI/test cu tru khi co ly do ro va cap nhat contract.

Viet route tests cho `apps/api` khong phu thuoc Next runtime. Chay `npm run test -w apps/api`, `npm run build -w apps/api`, va cac check workspace lien quan. Ket thuc goal khi `apps/api` co the chay doc lap tren mot port rieng, `/api/health` va toan bo nhom endpoint chinh tra response khop contract, route tests backend pass, va docs ghi ro cach chay backend local.
```

## Goal 4 - Noi frontend Next sang backend rieng va go bo phu thuoc Next API routes

```text
/goal Chuyen `apps/web` sang goi backend `apps/api` qua base URL rieng va loai bo phu thuoc vao Next API routes.

Kiem tra moi noi frontend dang `fetch("/api/...")`, import server-only lib, hoac phu thuoc API route Next trong `apps/web`. Chuan hoa `EvolveFitApiClient` de nhan base URL tu `NEXT_PUBLIC_API_BASE_URL`, co xu ly credentials/header phu hop voi quyet dinh auth hien tai, va giu offline/local-first behavior dang co. Doi cac call truc tiep trong UI, hooks, storage/sync queue, notification settings, auth flow, coach, hydration, supplement, workout, routines, achievements va leaderboards sang API client hoac mot helper fetch tap trung.

Trong giai doan chuyen tiep, cau hinh Next rewrite `/api/:path*` sang `${NEXT_PUBLIC_API_BASE_URL}/api/:path*` neu can de giam rui ro, nhung muc tieu cuoi goal la frontend khong can import hay chay handler `src/app/api/**`. Them/cap nhat `.env.example` cho `NEXT_PUBLIC_API_BASE_URL`, `API_CORS_ORIGIN`, port web/api local va cac secret chi nam o backend. Dam bao frontend khong leak cron secret, Supabase service role, VAPID private key, hoac server env nao qua `NEXT_PUBLIC_*`.

Xoa hoac tach khoi `apps/web` cac Next API routes da duoc port khi frontend khong con can. Cap nhat tests frontend/API client de verify base URL, error envelope, auth/session flow, sync batch, notification flows va offline fallback. Chay web va api cung luc neu can, kiem tra smoke luong chinh: mo app, hydration today/log, tao/sua routine, start/finish workout session, sync queue, notification status, auth session va health. Ket thuc goal khi `apps/web` build/chay voi backend port khac, khong con import server modules, va `apps/web` khong can Next API routes de dung app.
```

## Goal 5 - Production hoa persistence, auth va sync boundary trong backend

```text
/goal Refactor backend `apps/api` de dung repository + Supabase/Postgres lam source of truth production, dong thoi tach ro auth va offline sync.

Doc `supabase/migrations/**`, service/data adapter hien co va cac test contract lien quan. Thiet ke repository layer trong `apps/api` cho user, hydration, supplements, routines, exercises/custom exercises, workouts/sessions/sets, sync operations, notifications/subscriptions, achievements/leaderboards va coach feedback neu dang luu state. Loai bo viec dung `serverState = structuredClone(initialState)` lam source of truth production; neu can giu demo memory adapter thi dat sau interface ro rang va chi bat bang env/test mode.

Map repository sang Supabase/Postgres dua tren schema/RLS hien co. Moi record user-owned phai co boundary `user_id`; query/update/delete phai scope theo user hien tai. Auth backend phai verify Supabase JWT tu `Authorization: Bearer <token>` hoac cookie httpOnly theo quyet dinh ro rang; frontend khong duoc tu parse hay tin cookie server ngoai contract. Sua CORS/credentials/SameSite/Secure cho local va production domain.

Refactor `/api/sync/batch` de idempotency, conflict handling va retry state duoc luu DB thay vi `Map`/memory. Tach seed/demo fixtures khoi production data path. Cap nhat OpenAPI/tests cho cac truong hop auth required, unauthorized, forbidden, conflict, duplicate idempotency key, restart backend khong mat data, va multi-user khong thay du lieu nhau. Chay unit/integration tests voi mock Supabase va, neu co env staging, them script/test tuy chon cho Supabase that. Ket thuc goal khi backend restart khong mat data production, multi-user isolation duoc test, sync batch idempotent qua DB, va memory state chi con dung cho demo/test duoc kiem soat.
```

## Goal 6 - Hoan thien cron, notification, CI va deployment tach rieng

```text
/goal Hoan thien backend/frontend tach rieng cho cron, Web Push, health readiness, Docker/CI va tai lieu deploy.

Chuyen cac `/api/cron/**` sang scheduled jobs backend ro rang, co the van expose HTTP endpoint duoc bao ve bang secret header rieng cho scheduler ben ngoai. Dam bao cron secret chi doc trong `apps/api`, khong xuat hien o frontend. Them DB lock/idempotency cho hydration reminders, creatine reminders va monthly achievements de tranh chay trung khi co nhieu instance. Luu Web Push subscriptions vao repository/DB, test subscribe/unsubscribe/status/test notification theo user va xu ly VAPID config thieu/sai.

Them hoac hoan thien health endpoints backend: `/api/health` cho liveness, `/api/ready` cho readiness phu thuoc DB/env can thiet, va `/api/docs/openapi` lay contract moi. Cap nhat script OpenAPI de chay trong monorepo va phan anh backend Fastify. Neu scope repo can deploy container, tao `apps/api/Dockerfile` va `apps/web/Dockerfile`; neu dung hosting khac thi cap nhat tai lieu deploy tuong ung cho Vercel/Netlify web va Fly.io/Render/Railway/VPS API.

Cap nhat CI de chay lint/test/build cho `packages/shared`, `apps/api`, `apps/web`, kem smoke/contract test can thiet. Tao hoac cap nhat docs runbook trong `docs`: cach chay local hai app, bien moi truong, deploy, rollback rieng tung phan, cron scheduler setup, secret checklist, va troubleshooting CORS/auth/push. Chay full verification `npm run lint`, `npm test`, `npm run build`, OpenAPI generation, backend readiness test va smoke web->api neu moi truong cho phep. Ket thuc goal khi frontend va backend san sang deploy doc lap, cron/push co secret va persistence dung backend, CI pass, va docs du de nguoi khac van hanh.
```

## Thu tu su dung de giam rui ro

1. Chay Goal 1 truoc moi thay doi cau truc.
2. Chay Goal 2 va dam bao check pass truoc khi tao backend rieng.
3. Chay Goal 3 den khi backend co route tests rieng va khop contract.
4. Chay Goal 4 de cat frontend sang backend rieng.
5. Chay Goal 5 sau khi boundary API da on dinh.
6. Chay Goal 6 de chot van hanh/deploy.

Neu mot goal phat hien contract cu dang sai hoac thieu, cap nhat tai lieu audit va OpenAPI trong cung goal do truoc khi tiep tuc goal tiep theo.
