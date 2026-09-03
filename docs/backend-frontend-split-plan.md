# Plan tach backend va frontend EvolveFit

## Ket luan hien trang

Du an co the tach backend rieng va frontend rieng. Sau Phase 1, repo da duoc chuan bi thanh npm workspaces:

- Web hien nam trong `apps/web` va van giu Next.js UI + Next API routes tam thoi de khong doi hanh vi nguoi dung.
- Shared package hien nam trong `packages/shared`, gom `core.ts`, `app-data.ts`, `seed.ts` va entrypoint `src/index.ts`.
- Root scripts `lint`, `test`, `build`, `openapi`, `smoke`, `check` van la diem goi chinh; `build` build shared truoc web.
- OpenAPI validator doc route tu `apps/web/src/app/api/**/route.ts`.

Truoc Phase 1, EvolveFit la Next.js monolith:

- Frontend: `src/app/page.tsx`, `src/app/globals.css`, `public/`, service worker va manifest.
- Backend API: cac route trong `src/app/api/**/route.ts`, middleware rate limit o `middleware.ts`.
- Shared/domain logic: `src/lib/core.ts`, `src/lib/app-data.ts`, mot phan type trong `src/lib/seed.ts`.
- Server logic: `src/lib/api.ts`, `src/lib/auth.ts`, `src/lib/data-adapter.ts`, `src/lib/integrations.ts`, `src/lib/push.ts`, `src/lib/observability.ts`.
- API client: `src/lib/api-client.ts` da la diem bat dau tot de frontend goi backend bang base URL rieng.
- Database: `supabase/migrations/**`, hien co adapter Supabase REST va fallback memory/local demo.

Muc do kho: trung binh. Ly do khong phai kho ve routing, ma vi state va business logic hien con tron giua client demo, localStorage, server memory state, Supabase adapter va type dung chung.

## Muc tieu kien truc

De toi uu cho bao tri va deploy, nen tach thanh monorepo:

```text
EvolveFit/
  apps/
    web/              # Next.js frontend
    api/              # backend Node.js rieng
  packages/
    shared/           # domain types, pure functions, validation schema
    config/           # eslint/tsconfig shared neu can
  supabase/
    migrations/
  docs/
```

Backend nen chay Node.js API rieng, uu tien Fastify hoac Hono. Fastify phu hop neu can plugin, logging, validation, rate limit ro rang. Hono phu hop neu muon nhe va co the deploy edge/serverless. Voi code hien tai, Fastify la lua chon an toan hon vi co Web Push, cron, middleware va nhieu endpoint stateful.

Frontend nen giu Next.js cho UI/PWA. Neu muon toi uu bundle va don gian client-only app ve sau, co the doi sang Vite React, nhung giai doan dau nen giu Next.js de giam rui ro.

## Nguyen tac tach

1. Tach theo boundary API truoc, khong rewrite UI dong thoi.
2. Dua type va pure business logic vao `packages/shared` de tranh duplicate.
3. Backend khong import React/Next. Frontend khong import server-only modules.
4. Frontend chi goi backend qua `EvolveFitApiClient` va `NEXT_PUBLIC_API_BASE_URL`.
5. Auth, cookie, CORS, rate limit va request id phai duoc chuyen sang backend ro rang.
6. Persistence phai co mot source of truth. Trong production nen dung Supabase/Postgres, khong dung `serverState` memory.

## Phase 0 - Audit va dong bang hop dong API

Muc tieu: biet chinh xac can tach gi truoc khi move file.

Trang thai: da hoan thanh ngay 2026-09-03. Audit nam o `docs/api-contract-audit-before-split.md`; OpenAPI hien co 46 paths va validator doi chieu route thuc te.

Viec can lam:

- Chay `npm run check` de co baseline.
- Cap nhat/kiem tra `docs/api-v1.openapi.json` bang `npm run openapi`.
- Liet ke toan bo endpoint trong `src/app/api/**/route.ts`.
- Danh dau route theo nhom:
  - Auth: `/api/auth/**`
  - Workouts/routines/exercises: `/api/workouts/**`, `/api/routines/**`, `/api/exercises/**`
  - Hydration/supplements: `/api/hydration/**`, `/api/supplements/**`
  - Sync/offline: `/api/sync/batch`
  - Notifications/cron: `/api/notifications/**`, `/api/cron/**`
  - Observability/integrations/docs: `/api/health`, `/api/supabase/verify`, `/api/docs/openapi`, `/api/integrations/status`, `/api/observability/logs`
- Them regression tests cho nhung route quan trong neu test con mong.

Output mong muon:

- API contract on dinh.
- Biet route nao dung memory state, route nao goi Supabase/env.

## Phase 1 - Chuan bi monorepo

Muc tieu: thay doi structure nhung chua doi hanh vi.

Trang thai: da hoan thanh ngay 2026-09-03. Next app da nam trong `apps/web`; `packages/shared` da co TypeScript build/test rieng; cac import pure domain da doi sang `@evolvefit/shared`. Next API routes cu van nam trong `apps/web/src/app/api` trong giai doan chuyen tiep.

Viec can lam:

- Tao npm workspaces trong root `package.json`.
- Tao `apps/web` va move Next.js app vao do:
  - `src/app/**`
  - `public/**`
  - `next.config.ts`
  - `middleware.ts` tam thoi van o web neu API chua tach het
  - `next-env.d.ts`
- Tao `packages/shared`.
- Move cac module pure sang `packages/shared/src`:
  - `core.ts`
  - `app-data.ts`
  - cac type khong phu thuoc Node/Next/browser
- Giu `storage.ts` o frontend vi dung `window.localStorage`.
- Chinh `tsconfig` paths:
  - `@evolvefit/shared`
  - `@evolvefit/web`
- Sua import tu `@/lib/core` sang `@evolvefit/shared` cho code web/backend.

Output mong muon:

- `npm run check` pass tu root.
- `npm run build -w @evolvefit/shared` va `npm run test -w @evolvefit/shared` pass.
- UI van chay nhu cu.
- Chua can backend rieng trong phase nay.

## Phase 2 - Tao backend API rieng

Muc tieu: co app backend doc lap nhung endpoint van tra response nhu cu.

Viec can lam:

- Tao `apps/api` voi TypeScript va Fastify.
- Cai dat packages backend:
  - `fastify`
  - `@fastify/cors`
  - `@fastify/cookie`
  - `@fastify/rate-limit`
  - `zod` hoac `typebox` neu muon validation ro hon
  - giu `web-push`, Supabase REST helper neu dang dung
- Move server modules sang `apps/api/src`:
  - `api.ts` thanh service layer, nen tach tiep thanh `services/*`
  - `auth.ts`
  - `data-adapter.ts`
  - `integrations.ts`
  - `push.ts`
  - `observability.ts`
  - `server-response.ts`
  - `rate-limit.ts` neu khong dung plugin hoan toan
- Tao route Fastify tuong ung voi cac Next route hien tai.
- Chuyen middleware root thanh Fastify hooks:
  - request id
  - access log
  - rate limit
  - error envelope `{ ok: false, error, requestId }`
- Them CORS cho frontend origin:
  - local: `http://localhost:3000`, `http://localhost:5173` neu can
  - production web domain

Output mong muon:

- `apps/api` chay doc lap, vi du `npm run dev -w apps/api`.
- `/api/health` va cac route chinh tra cung shape response nhu cu.
- Route tests chay o backend khong can Next runtime.

## Phase 3 - Noi frontend sang backend rieng

Muc tieu: frontend khong phu thuoc Next API routes.

Viec can lam:

- Sua `EvolveFitApiClient` dung env:

```ts
const api = new EvolveFitApiClient(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
```

- Doi cac `fetch("/api/...")` truc tiep trong `apps/web/src/app/page.tsx` sang `EvolveFitApiClient` hoac helper `apiFetch`.
- Them `.env.example`:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
API_CORS_ORIGIN=http://localhost:3000
```

- Trong giai doan chuyen tiep, co the cau hinh Next rewrite `/api/:path*` sang backend de UI it phai sua:

```ts
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/:path*`
    }
  ];
}
```

- Sau khi da doi het client calls, xoa Next API routes khoi `apps/web`.

Output mong muon:

- Web co the chay khi backend o port khac.
- Khong con import server module trong frontend.
- `apps/web/src/app/api/**` duoc remove hoac chi con proxy tam thoi.

## Phase 4 - Tach persistence va auth that su

Muc tieu: backend co source of truth production.

Viec can lam:

- Loai bo dan `serverState = structuredClone(initialState)` trong backend production.
- Tao repository layer:
  - `RoutineRepository`
  - `WorkoutRepository`
  - `HydrationRepository`
  - `SupplementRepository`
  - `NotificationRepository`
  - `UserRepository`
- Map repository sang Supabase/Postgres bang schema trong `supabase/migrations`.
- Tach demo seed khoi production data. `initialState` chi nen dung cho frontend demo/local mode hoac test fixtures.
- Chuyen auth:
  - Backend verify Supabase JWT tu `Authorization: Bearer <token>` hoac cookie httpOnly.
  - Frontend khong tu parse cookie server.
  - Moi record can co `user_id` va query theo user hien tai.
- Sua offline sync `/api/sync/batch` de idempotency luu DB, khong luu `Map` memory.

Output mong muon:

- Restart backend khong mat data.
- Multi-user khong dung chung memory state.
- Auth boundary ro rang.

## Phase 5 - Cron, notification va deployment

Muc tieu: backend san sang deploy rieng.

Viec can lam:

- Dua `/api/cron/**` thanh scheduled jobs o backend.
- Bao ve cron bang secret header rieng, khong dua secret ra frontend.
- Web Push subscriptions luu DB.
- Them health endpoints:
  - `/api/health`
  - `/api/ready`
  - `/api/docs/openapi`
- Docker hoa tung app neu can:
  - `apps/web/Dockerfile`
  - `apps/api/Dockerfile`
- CI:
  - lint/test/build shared
  - lint/test/build api
  - lint/test/build web
- Deploy:
  - Web: Vercel/Netlify/Static Next hosting.
  - API: Fly.io/Render/Railway/VPS/container.
  - DB/Auth: Supabase.

Output mong muon:

- Frontend va backend deploy doc lap.
- Co rollback rieng tung phan.
- Secrets chi nam o backend/deployment env.

## Thu tu migration de it rui ro nhat

1. Tao `packages/shared`, move pure domain logic.
2. Move Next app vao `apps/web` trong workspace.
3. Tao `apps/api` va port `/api/health`, `/api/auth/session`, `/api/hydration/today` truoc.
4. Port tung nhom endpoint, uu tien nhom it phu thuoc:
   - health/integrations/docs
   - auth
   - hydration/supplements
   - routines/exercises
   - workouts/sync
   - notifications/cron
5. Dung Next rewrite proxy trong giai doan chuyen tiep.
6. Sau khi API backend pass contract tests, doi frontend sang `NEXT_PUBLIC_API_BASE_URL`.
7. Xoa Next API routes.
8. Refactor persistence tu memory sang repository + Supabase.

## Rui ro va cach giam

- Rui ro import vong tron giua web/api/shared: chi de pure types/functions trong `shared`, khong import `window`, `next/*`, `process.env` vao shared.
- Rui ro response API bi lech: dung OpenAPI va tests snapshot response cho cac endpoint chinh.
- Rui ro auth/cookie khac origin: quyet dinh som dung Bearer token hay httpOnly cookie. Neu web va api khac domain, can CORS credentials va SameSite/Secure dung.
- Rui ro mat offline behavior: giu `localStorage` va sync queue o frontend trong phase dau, chi doi endpoint sync sau.
- Rui ro data demo lan production: tach fixture/test seed ra khoi service production.
- Rui ro cron chay nhieu instance: dung DB lock/idempotency cho reminder va monthly achievements.

## Definition of Done

- Co 3 workspace: `apps/web`, `apps/api`, `packages/shared`.
- `apps/web` build khong can `src/app/api`.
- `apps/api` expose day du endpoint tu `docs/api-v1.openapi.json`.
- Frontend chi goi API qua `EvolveFitApiClient`/base URL.
- Backend tests cover route chinh, auth, sync conflict, notification subscribe/unsubscribe.
- Production env khong dung memory state lam source of truth.
- CI pass: lint, test, build cho web/api/shared.

## Uoc luong

- Tach workspace + shared package: 0.5-1 ngay.
- Tao backend rieng va port routes: 1.5-3 ngay.
- Noi frontend sang backend va xoa Next API routes: 0.5-1 ngay.
- Persistence/auth production hoa: 2-4 ngay tuy muc do schema hien tai.
- CI/deploy/cron hardening: 1-2 ngay.

Tong uoc luong thuc te: 5-10 ngay lam viec neu giu scope hien tai va khong redesign UI.
