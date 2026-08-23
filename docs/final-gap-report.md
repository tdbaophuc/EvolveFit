# EvolveFit Final Gap Report

Audit date: 2026-08-23

The final audit found that EvolveFit is buildable, testable, and has a broad implemented product surface, but the whole roadmap is not fully complete. The remaining gaps are large enough that they should remain documented rather than be patched opportunistically during the audit.

## Large Gaps

| Gap | Status | Why it remains open | Recommended next artifact |
|---|---|---|---|
| Native mobile/watch decision | missing | The plan still calls for a PWA sufficiency decision, React Native/Expo option, shared domain logic plan, and watch quick actions. No `docs/native-watch-decision.md` or native scaffold exists. | Create `docs/native-watch-decision.md` and decide whether to scaffold Expo after reviewing PWA constraints. |
| Progress photos | missing | No schema, local/private storage abstraction, compare view, export/delete flow, or storage-provider decision exists in code. | Implement a local-only photo metadata/storage contract first, then decide whether Supabase Storage/R2 is needed. |
| Nutrition tracking decision | missing | The product docs say nutrition should not dilute hydration/workout core, but there is no final decision doc or lightweight diary/macro contract. | Create a nutrition decision doc and optionally add a non-nav lightweight model if needed. |
| Expanded exercise library richness | partial | Exercise library supports built-in/custom, equipment, movement pattern, search/filter, and CRUD; it does not yet include richer instructions, primary/secondary muscles, cues, or custom library import/export. | Add richer exercise definition fields and focused tests if this becomes part of V1.1. |
| Supabase auth local-data merge | partial | Supabase Auth routes and tests exist, but the UI does not yet provide a fully proven local/demo data merge-or-replace flow after login. | Add merge/replace UX and tests before treating auth as production-complete. |
| Production sync proof | partial | Sync queue, idempotency, retry, and conflict contracts exist, but the audit did not prove deployed Supabase-backed retry behavior end-to-end. | Add integration tests against a provisioned Supabase test project or a contract test harness. |
| Production push/cron proof | partial | Web Push contract, service worker, subscribe/unsubscribe APIs, and UI exist; local runtime reports `cronSecret: missing-env`, and real push delivery is environment/device dependent. | Verify VAPID/cron in staging with real browser subscription and cron secret. |
| Dedicated Coach tab | product divergence | The UI/UX spec mentions a separate Coach tab, but the current app uses five tabs requested by this audit: Today, Water, Workout, Progress, Settings. Coach is embedded in Progress. | Decide whether Coach remains embedded or becomes a sixth/alternate tab. |

## Small Fix Applied During Audit

- Fixed obvious mojibake in user-visible labels/toasts in `src/app/page.tsx` for Today, Water, Workout, and Settings strings such as creatine status, water labels, workout set toasts, and reminder toggles.

## Current Verification Summary

Final command verification is recorded in the commit that adds this report:

- `npm run build`
- `npm test`
- `npm run smoke`

Runtime UI/API checks performed before final command verification:

- `/` returned `200`.
- `/hydration` returned `200`.
- `/api/health` returned `200`.
- `/api/integrations/status` returned `200`.
- Headless Chrome DOM confirmed the current five-tab shell: Today, Water, Workout, Progress, Settings.

