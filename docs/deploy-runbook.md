# EvolveFit Backend/Frontend Deploy Runbook

## Local run

1. Install dependencies from repo root:

```bash
npm ci
```

2. Configure backend env from `apps/api/.env.example`.

Required for production-like Supabase mode:
- `API_DATA_MODE=supabase`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_CORS_ORIGIN=http://localhost:3000`
- `CRON_SECRET`
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
- `GET /api/ready`: readiness. In memory mode it returns ready. In Supabase mode it verifies required Supabase env and production tables through service-role access.
- `GET /api/docs/openapi`: serves the backend OpenAPI contract from `docs/api-v1.openapi.json`.

Use `/api/health` for container liveness and `/api/ready` for load balancer readiness.

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

Container option:

```bash
docker build -f apps/api/Dockerfile -t evolvefit-api .
docker build -f apps/web/Dockerfile -t evolvefit-web .
```

Run API with backend secrets only. Run web with public vars only.

Hosted option:
- Web: Vercel, Netlify, or any Next.js host. Set `NEXT_PUBLIC_API_BASE_URL` to the API origin.
- API: Fly.io, Render, Railway, or VPS/container host. Set `API_CORS_ORIGIN` to the web origin and configure backend secrets there.

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

- CORS errors: verify `API_CORS_ORIGIN` exactly matches the browser origin, including scheme and port.
- Auth returns 401 in Supabase mode: ensure frontend sends Supabase bearer token or backend session cookie is present.
- Cron returns 401: check `Authorization: Bearer` or `X-Cron-Secret`.
- Cron returns 503: set `CRON_SECRET`.
- Readiness returns 503: verify Supabase URL, anon key, service-role key, migrations, and table access.
- Push config shows `configured=false`: set VAPID public/private/subject on API and public key on web.
- Test notification returns fallback: there are no active subscriptions, VAPID is missing, or push delivery failed.
