# EvolveFit Backend/Frontend Deploy Runbook

## Local run

1. Install dependencies from repo root:

```bash
npm ci
```

2. Configure backend env: copy `apps/api/.env.example` to `apps/api/.env`. `apps/api/src/server.ts` loads it automatically; variables already set in the shell or hosting platform win.

`APP_ENV`/`NODE_ENV` of `production` or `staging` run fail-closed: the API refuses to start unless all of these are set (see `apps/api/src/lib/config.ts`):
- `API_DATA_MODE=supabase` (memory mode is local demo only)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET` (>= 32 chars; encrypts the session cookie). Rotate via `SESSION_SECRET_PREVIOUS`.
- `API_CORS_ORIGIN` (exact web origins, comma-separated)
- `APP_BASE_URL` (https web URL, used for auth redirects)
- `CRON_SECRET` >= 32 chars when set

Optional:
- `API_BODY_LIMIT_BYTES`
- optional grouped rate limits such as `API_RATE_LIMIT_AUTH_MAX`, `API_RATE_LIMIT_SYNC_MAX`, and `API_RATE_LIMIT_PUBLIC_WINDOW_MS`
- `COOKIE_SAMESITE` (`lax` default, `none` when web and API are on different sites), `COOKIE_DOMAIN`
- `TRUST_PROXY` (hop count such as `1` behind a load balancer)
- `ADMIN_BOOTSTRAP_EMAILS` (env-bootstrapped super admins)
- `CRON_USER_ID` and optional `CRON_USER_EMAIL` for scheduler-owned cron state

Required for Web Push delivery:
- `VAPID_PUBLIC_KEY` or `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

3. Configure frontend env from `apps/web/.env.example`:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
- public Supabase URL/anon key if auth UI needs it
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

4. Run both apps:

```bash
npm run dev:api
npm run dev
```

Default local ports are API `4000` and web `3000` unless `PORT` is overridden.

## Health Checks

- `GET /api/health`: liveness. It does not require auth and should stay cheap.
- `GET /api/ready`: readiness. Supabase mode verifies env and production tables (including `user_roles` and `admin_audit_logs`) through service-role access; memory mode is never ready in production.
- `GET /api/docs/openapi`: serves `docs/api-v1.openapi.json`. Hidden (404) in production unless `API_PUBLIC_DOCS=true`.
- `GET /api/observability/logs` and `GET /api/supabase/verify` are super-admin only (`ops:read`).

Use `/api/health` as the platform health check. Check `/api/ready` after each deploy, or run the read-only probe locally:

```bash
npm run verify:supabase -w @evolvefit/api -- apps/api/.env.production
```

## API Contract and Hardening

All API errors return `{ ok: false, error, errorCode, requestId }` and may include structured `details`. Validation failures use `errorCode=validation_failed`; rate limits use `errorCode=rate_limit_exceeded`.

Request validation covers params, query, and body for data, auth, cron, notification, sync, and observability endpoints. See `docs/api-hardening-contract.md` for the endpoint groups, rate-limit defaults, body-limit behavior, CORS behavior, and current public error messages.

## Auth and Account Lifecycle

Auth endpoints:
- `GET /api/auth/session`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-up`
- `POST /api/auth/refresh`
- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `POST /api/auth/sign-out`
- `GET /api/auth/oauth/google`
- `GET /api/auth/callback`
- `GET /api/account/export`
- `DELETE /api/auth/account`

Supabase Auth settings to verify per environment:
- Site URL points to the web origin.
- Additional redirect URLs include the API callback origin, for example `https://api.example.com/api/auth/callback`, and the web origin used for password recovery.
- Google OAuth redirect URL in Supabase/provider console matches `/api/auth/callback`.
- Email confirmation can be enabled; sign-up returns `needsEmailVerification=true` when Supabase does not issue an access token immediately.

Session behavior:
- Backend stores Supabase access/refresh tokens in the httpOnly `evolvefit_session` cookie when sign-in, sign-up, refresh, or OAuth succeeds. The cookie is AES-256-GCM sealed with `SESSION_SECRET`; tokens are not returned in JSON unless `AUTH_EXPOSE_TOKENS=true` (native clients).
- Cookie-authenticated `POST/PUT/PATCH/DELETE` requests must send `X-EvolveFit-Client` and come from a trusted origin (CSRF protection). Bearer-token requests are exempt.
- Data endpoints also accept `Authorization: Bearer <Supabase JWT>` for native/API clients.
- `POST /api/auth/refresh` uses the refresh token from the request body or session cookie and rotates the httpOnly cookie.

Local-to-cloud merge after login:
- The web app shows merge choices after email login/sign-up: merge local data to cloud, replace local with cloud export, or keep local data.
- Merge uses `/api/sync/batch` with stable idempotency keys such as `account-merge:<profile>:hydration.log:<id>`.
- Replace uses `GET /api/account/export` and restores the returned schema-versioned app state locally.

Account deletion:
- `DELETE /api/auth/account` deletes repository-owned user data and clears the session cookie.
- In Supabase mode, auth-user deletion also requires `SUPABASE_SERVICE_ROLE_KEY`; without it the route can delete app data but reports `authDeleted=false`.
- Keep service-role credentials only on `apps/api`; never expose them through `NEXT_PUBLIC_*`.

## Repository and Sync Safety

Apply all Supabase migrations (`0001` through `0010`) through `supabase db push` or the SQL editor before enabling `API_DATA_MODE=supabase`. Migration `0010_admin_store_production.sql` is required for admin role grants. Migration `0005_sync_resource_safety.sql` adds sync/resource indexes and metadata used by production-safe replay checks.

Mutation routes persist through resource-scoped repository writes instead of replacing the full `AppState`. `/api/sync/batch` writes each resource mutation before storing its idempotent sync result. See `docs/sync-repository-boundary.md` for the current domain boundary, retry semantics, conflict confirmation flow, and staging checklist.

## Cron Scheduler

Backend exposes protected HTTP cron endpoints for external schedulers:
- `POST /api/cron/hydration-reminders`
- `POST /api/cron/creatine-reminders`
- `POST /api/cron/monthly-achievements`

Send either:
- `Authorization: Bearer <CRON_SECRET>`
- `X-Cron-Secret: <CRON_SECRET>`

Do not configure cron secrets in `apps/web` or any `NEXT_PUBLIC_*` variable.

Cron idempotency:
- Hydration and creatine reminders lock by user and UTC hour.
- Monthly achievements lock by user and UTC month.
- Supabase mode acquires locks with `evolvefit_acquire_notification_event_lock(...)` and stores status in `notification_events.lock_key` with a unique `(user_id, lock_key)` index.
- Memory mode keeps the same interface for local/test only.

For Supabase mode, set `CRON_USER_ID` to a real auth user id if an external scheduler calls with only `CRON_SECRET`.

## Web Push

Subscriptions are owned by the backend repository:
- Memory mode stores subscriptions in-process for local/test.
- Supabase mode stores active subscriptions in `push_subscriptions`, scoped by `user_id`.

Validation endpoints:
- `GET /api/notifications/config`
- `GET /api/notifications/status?localProfileId=<id>`
- `POST /api/notifications/subscribe`
- `POST /api/notifications/unsubscribe`
- `POST /api/notifications/test`

If VAPID is missing or invalid, notification send falls back to in-app metadata and reports `missingEnv`.

## Deploy

Current hosting:
- **API: Render** Web Service, runtime Docker, repo root as build context, `Dockerfile Path=./apps/api/Dockerfile`, health check `/api/health`. Build filters: `apps/api/**`, `packages/shared/**`, `package.json`, `package-lock.json`. Render injects `PORT`; set backend secrets in the service Environment (never commit `apps/api/.env.production`).
- **Web: Vercel**, `Root Directory=apps/web` with files outside the root directory included (needs `packages/shared`). Only public vars: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_APP_VERSION`. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

Cookies across sites:
- API on `*.onrender.com` and web on another domain are different sites: use `COOKIE_SAMESITE=none` and leave `COOKIE_DOMAIN` empty. Safari/third-party-cookie blocking may drop sessions and Google OAuth cannot complete in this setup.
- Preferred: serve the API on a subdomain of the web domain (for example `api.<web-domain>`), then use `COOKIE_SAMESITE=lax` and `COOKIE_DOMAIN=<web-domain>`.

Container build (API only):

```bash
docker build -f apps/api/Dockerfile -t evolvefit-api .
```

## CI

`.github/workflows/ci.yml` runs:
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run openapi`
- `npm run smoke`

Smoke starts API and web on separate ports and verifies web-to-api routing.

## Rollback

Rollback web and API independently:
- Web rollback: redeploy previous web artifact/version. Keep API running if contract remains compatible.
- API rollback: redeploy previous API image/version. Verify `/api/ready` before sending traffic back.
- DB rollback: prefer forward migrations. If a Supabase migration must be reversed, disable scheduler first, apply the DB rollback manually, then redeploy API.

## Troubleshooting

- CORS errors: verify `API_CORS_ORIGIN` exactly matches the browser origin, including scheme and port (no trailing slash).
- 403 `missing-csrf-header` / `untrusted-origin`: the client must send `X-EvolveFit-Client`, and its origin must be in `API_CORS_ORIGIN`, `APP_BASE_URL` or `AUTH_REDIRECT_ORIGINS`.
- API exits with `Invalid API configuration`: the log lists the missing production variables.
- Validation errors: inspect `details[].field` in the API error envelope.
- 429 errors: adjust the matching grouped rate limit env, for example `API_RATE_LIMIT_AUTH_MAX`.
- Payload too large: raise `API_BODY_LIMIT_BYTES` only after confirming the endpoint really needs larger bodies.
- Auth returns 401 in Supabase mode: ensure frontend sends Supabase bearer token or backend session cookie is present.
- Cron returns 401: check `Authorization: Bearer` or `X-Cron-Secret`.
- Cron returns 503: set `CRON_SECRET`.
- Readiness returns 503: verify Supabase URL, anon key, service-role key, migrations, and table access.
- Push config shows `configured=false`: set VAPID public/private/subject on API and public key on web.
- Test notification returns fallback: there are no active subscriptions, VAPID is missing, or push delivery failed.
