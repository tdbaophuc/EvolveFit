# API hardening contract

Updated: 2026-09-27

## Response envelope

All JSON API errors use:

```json
{
  "ok": false,
  "error": "Validation failed",
  "errorCode": "validation_failed",
  "details": [{ "field": "body.amountMl", "message": "must be at least 1" }],
  "requestId": "req_..."
}
```

Successful responses keep `{ "ok": true, "data": ..., "requestId": "req_..." }`.

## Validation surface

Route validation runs before handlers and covers:

- path params: `:id` must be a bounded non-empty string
- query: observability `requestId`, notification `localProfileId`
- auth: email/password/redirect/token fields
- hydration, supplements, routines, exercises, workouts, progression, sync, coach feedback, notifications, and client-error bodies

Validation failures return HTTP `400`, `errorCode=validation_failed`, and field-level details.

## Security controls

- CORS is allowlist-based when `API_CORS_ORIGIN` is set. In production with no allowlist, browser origins are not allowed.
- Request body size defaults to `API_BODY_LIMIT_BYTES` or 1 MiB.
- Request text input is sanitized by removing control characters, trimming, and capping strings at 4000 characters before validation.
- Internal 500 errors return `Unexpected API error`; stack traces and raw exception messages are not exposed.
- Manual auth/cron/OAuth/account errors return the same error envelope.
- Cookie sessions are httpOnly, SameSite=Lax by default, and Secure when `NODE_ENV=production`.

## Rate limit groups

The API has grouped in-memory rate limits in addition to Fastify's registered rate-limit plugin:

- `auth`: `/api/auth/*`, default 30/min
- `cron`: `/api/cron/*`, default 20/min
- `sync`: `/api/sync/batch`, default 120/min
- `write`: non-GET `/api/*`, default 180/min
- `public`: other requests, default 600/min

Each group can be overridden with `API_RATE_LIMIT_<GROUP>_MAX` and `API_RATE_LIMIT_<GROUP>_WINDOW_MS`.

## Current English Error Messages

The API keeps existing English public messages for backward compatibility. Stable codes are available for client branching. Known user-facing messages include `Unauthorized`, `Validation failed`, `Rate limit exceeded`, `CRON_SECRET is not configured`, `Supabase OAuth env is missing`, and domain validation messages such as `routine not found`.
