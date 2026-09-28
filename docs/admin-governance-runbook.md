# Admin Governance Runbook

## Bootstrap First Admin

Production admin access is deny-by-default. Set `ADMIN_BOOTSTRAP_EMAILS` on the API runtime with one or more trusted emails, comma-separated.

Example:

```text
ADMIN_BOOTSTRAP_EMAILS=founder@example.com,ops@example.com
```

Only server-side env can bootstrap an admin. Never expose service-role keys or role claims in frontend env.

## Roles

- `super-admin`: role management, content governance, support lookup and audit review.
- `content-admin`: marketplace exercise and routine template governance.
- `support`: redacted user lookup, feedback/report moderation and audit review.

Admin API must be reached through `/api/admin/*`; frontend admin dashboards should call these endpoints only.

## Revoke Access

1. Sign in as a `super-admin`.
2. Call `POST /api/admin/roles` with `{ "email": "...", "role": "...", "revoke": true }`.
3. Review `/api/admin/audit-logs` for recent actions from that actor.
4. If the admin was bootstrapped via env, remove the email from `ADMIN_BOOTSTRAP_EMAILS` and redeploy API.

## Incident Response

1. Rotate affected user/admin sessions if credential compromise is suspected.
2. Remove role assignment or bootstrap env.
3. Review audit logs by `actorEmail`, `resourceType` and `requestId`.
4. Archive suspicious marketplace content instead of deleting until review is complete.
5. Export relevant audit logs for the incident record.

## Staging Smoke

1. Set `ADMIN_BOOTSTRAP_EMAILS` to a staging admin email.
2. Sign in as a normal user and verify `GET /api/admin/dashboard` returns `401`.
3. Sign in as bootstrap admin and verify:
   - `GET /api/admin/dashboard`
   - `GET /api/admin/exercises?pageSize=10`
   - `POST /api/admin/exercises`
   - `PATCH /api/admin/exercises/:id` publish/archive
   - `GET /api/admin/audit-logs`
4. Grant `content-admin` and verify content write works but role write returns `403`.
5. Grant `support` and verify user lookup is redacted and content write returns `403`.
