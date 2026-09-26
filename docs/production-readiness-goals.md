# EvolveFit - Goal commands dua san pham len production

Cap nhat: 2026-09-27

Tai lieu nay gom cac goal lon de bien EvolveFit tu nen local-first PWA + API hien tai thanh mot san pham production co the van hanh that. Moi goal duoc viet nhu mot lenh `/goal` doc lap, nhung nen chay tuan tu vi cac goal sau phu thuoc vao contract, staging va persistence cua goal truoc.

Quy tac chung:

- Moi goal phai ket thuc bang audit thay doi, test phu hop, cap nhat docs va commit rieng neu co code/doc thay doi.
- Khong commit thay doi dang do cua nguoi khac. Chi stage nhung file thuoc goal dang lam.
- Neu goal can dich vu ben ngoai, doc phan "Can thao tac thu cong" ngay tren goal truoc khi chay.
- Uu tien giu local-first cho workflow hang ngay, nhung backend production phai la source of truth khi user da dang nhap.
- Tat ca copy UI moi phai la tieng Viet, tru ten bai tap.

## Thu tu de xuat

1. Goal 1 - Production audit va staging readiness.
2. Goal 2 - Auth/account lifecycle va merge du lieu local sau dang nhap.
3. Goal 3 - Persistence theo resource va sync production.
4. Goal 4 - API hardening, validation, security va error contract.
5. Goal 5 - Frontend modularization va UX production cho onboarding/workout.
6. Goal 6 - Workout intelligence: planner, exercise library nang cao, coach V2.
7. Goal 7 - Progress photos va privacy/data controls.
8. Goal 8 - Nutrition tracking nhe.
9. Goal 9 - Observability, CI/CD, staging smoke va deploy runbook.
10. Goal 10 - Native/health platform decision va bridge plan.

## Goal 1 - Production audit va staging readiness

Can thao tac thu cong:

- Tao Supabase staging project neu chua co.
- Cau hinh env staging cho API: `API_DATA_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, VAPID keys neu muon test push.
- Tao it nhat 2 user test that trong staging de kiem tra RLS/multi-user isolation.

```text
/goal Audit toan bo EvolveFit de xac dinh trang thai production readiness va lap staging proof dau tien.

Doc cau truc monorepo, `package.json`, `apps/web`, `apps/api`, `packages/shared`, `supabase/migrations`, `docs/deploy-runbook.md`, `docs/final-audit-matrix.md`, `docs/final-gap-report.md`, `docs/api-v1.openapi.json` va cac test hien co. Lap ma tran hien trang theo nhom: auth, profile, hydration, supplements, routines, exercises, workout sessions/sets, progress/body metrics, recommendations/coach, sync queue, push, cron, health integration, import/export/delete data, observability, deployment va CI.

Chay baseline `npm run lint`, `npm test`, `npm run build`, `npm run openapi` va `npm run smoke` neu moi truong cho phep. Neu co loi, phan loai thanh loi baseline, loi thieu env, loi staging hoac loi code. Khong sua lan man ngoai pham vi audit, nhung neu phat hien loi nho chan verification thi sua kem test toi thieu.

Voi Supabase staging, chay migrations tren staging, verify `/api/health`, `/api/ready`, `/api/supabase/verify`, auth sign-up/sign-in/session, RLS voi 2 user, va mot smoke path web-to-api gom log nuoc, tao routine, start/finish workout, sync batch. Neu khong co env staging trong may, tao checklist lenh va ket qua mong doi de nguoi van hanh chay lai.

Cap nhat hoac tao docs production audit trong `docs`, ghi ro: trang thai tung subsystem, env can thiet, endpoint can test, risk production, viec can lam tiep, va bang uu tien P0/P1/P2. Ket thuc goal khi co tai lieu audit moi, baseline test duoc ghi lai, va cac blocker production dau tien duoc sap xep ro rang.
```

## Goal 2 - Auth, account lifecycle va merge du lieu local sau dang nhap

Can thao tac thu cong:

- Kiem tra Supabase Auth settings: email confirmation, password reset redirect URL, Google OAuth redirect URL neu dung Google login.
- Chon domain web/API staging va production de cau hinh cookie/CORS/redirect.

```text
/goal Hoan thien auth va account lifecycle cua EvolveFit de user that co the dang ky, dang nhap, khoi phuc tai khoan va mang du lieu local len cloud an toan.

Audit `apps/api/src/lib/auth.ts`, route auth trong `apps/api/src/routes/api-routes.ts`, API client trong `apps/web/src/lib/api-client.ts`, state profile trong `packages/shared/src/seed.ts`, import/export trong `packages/shared/src/app-data.ts`, va UI settings/onboarding trong `apps/web/src/app/page.tsx`. Xac dinh ro contract auth hien tai: local, email, Google, cookie httpOnly, bearer token, session expiry va refresh behavior.

Them hoac hoan thien cac luong production: sign-up voi email/password, email verification state neu Supabase bat confirmation, sign-in, sign-out, forgot password, reset password, Google OAuth callback, refresh/re-auth khi token het han, xoa tai khoan server-side, export data va delete personal data ca local lan cloud. Dam bao secrets khong bao gio nam trong frontend env public.

Thiet ke va implement UX merge du lieu local sau dang nhap: khi user co du lieu tren may va dang nhap vao account cloud, hien lua chon merge, replace local bang cloud, hoac keep local. Luong merge phai co preview so luong hydration logs, workout sets, routines, body metrics, supplements va conflict can xu ly. Queue sync phai dung idempotency key de tranh tao trung.

Cap nhat OpenAPI, API client tests, auth route tests va frontend tests cho cac truong hop: unauthorized, invalid credentials, session restored, sign-out clears state/cookie, merge local-to-cloud, replace cloud-to-local, delete account/data. Chay `npm run lint`, `npm test`, `npm run build`, va smoke auth staging neu env co san. Cap nhat docs runbook ve auth redirects, cookie/CORS va account deletion.
```

## Goal 3 - Persistence theo resource va sync production

Can thao tac thu cong:

- Backup Supabase staging truoc khi chay migration thay doi schema lon.
- Neu can test multi-device, dang nhap cung mot account tren hai browser/profile khac nhau.

```text
/goal Refactor backend persistence tu load/save AppState lon sang repository theo resource va lam sync production-safe.

Audit `apps/api/src/lib/repositories.ts`, `apps/api/src/lib/api.ts`, `apps/api/src/lib/api-runtime.ts`, Supabase migrations, sync queue trong shared/web va cac route mutation. Xac dinh moi noi dang save toan bo `AppState`, replace ca bang, hoac co nguy co mat du lieu khi hai thiet bi ghi dong thoi.

Thiet ke repository interfaces theo domain: profile, hydration, supplements, routines, routine days/exercises, exercise library, workout sessions, workout sets, body metrics, recommendations, achievements, push subscriptions va sync events. Moi mutation API chi ghi resource lien quan, co `user_id` boundary, updated_at/version neu can conflict detection, va khong xoa/replace du lieu khong lien quan.

Refactor Supabase repository de dung upsert/insert/update/delete granular. Giu memory repository cho local/test nhung khong de production path phu thuoc vao demo state. Them migration neu can cho `updated_at`, indexes, unique constraints, idempotency keys, soft revoke/delete va conflict metadata.

Nang cap `/api/sync/batch` de idempotent qua DB, co retry-safe result, conflict handling cho routines va workout sessions, khong tao ban ghi trung khi client gui lai. Bo sung tests cho duplicate idempotency key, concurrent update, backend restart, multi-user isolation, partial failure va conflict confirm. Chay unit/integration tests, build, va staging smoke neu env co san. Cap nhat docs ve sync semantics va repository boundary.
```

## Goal 4 - API hardening, validation, security va error contract

Can thao tac thu cong:

- Quyet dinh chinh sach CORS production: web origin nao duoc phep goi API.
- Quyet dinh ngon ngu loi API public: tieng Viet cho client hay ma loi on dinh + message localize o frontend.

```text
/goal Production-hardening API EvolveFit bang validation, security controls, rate limits va error contract on dinh.

Audit toan bo routes trong `apps/api/src/routes/api-routes.ts`, service functions trong `apps/api/src/lib/api.ts`, auth, rate-limit, server-response, observability va OpenAPI. Liet ke request body/query/params cua tung endpoint va cac error message dang tra ve, dac biet cac loi tieng Anh con sot lai.

Them schema validation co cau truc cho route params, query va body. Co the dung library phu hop voi Fastify/TypeScript neu repo chua co, nhung phai cap nhat tests va khong lam phinh dependency vo ich. Moi endpoint phai tra envelope nhat quan `{ ok, data/error, requestId }`, status code dung, va error code/message on dinh. Neu localize message tieng Viet, cap nhat OpenAPI/client tests de tranh phu thuoc chuoi cu.

Hardening security: rate limit theo nhom endpoint, auth required ro rang cho data routes, cron secret check chat, cookie `Secure`/`SameSite`/domain theo env, CORS allowlist, request body size limit, input sanitization cho text fields, khong leak stack/secrets, log redaction cho token/email neu can. Them tests unauthorized/forbidden/bad request/rate limit/cron auth/CORS preflight neu co the.

Cap nhat `docs/api-v1.openapi.json`, docs contract, va runbook troubleshooting. Chay `npm run lint`, `npm test`, `npm run build`, `npm run openapi` va smoke cac endpoint chinh. Ket thuc goal khi API co validation ro, loi on dinh, va cac surface production da duoc test.
```

## Goal 5 - Frontend modularization va UX production cho onboarding/workout

Can thao tac thu cong:

- Chot tone/copy cua onboarding: doi tuong nguoi dung, muc tieu chinh, va mac dinh lich tap.
- Neu co thiet ke rieng, cung cap file/screenshot truoc khi chay goal.

```text
/goal Tach frontend EvolveFit thanh cac module de bao tri duoc va nang UX onboarding/workout len muc production.

Audit `apps/web/src/app/page.tsx`, `globals.css`, storage, api-client va cac test frontend. Lap ban do component hien tai theo tab: Today, Hydration, Workout, Progress, Settings, dialogs, forms, toasts, sync queue, notification settings. Xac dinh state nao nen tach thanh custom hooks, component con, helper UI va module domain.

Refactor frontend theo tung mien ma khong doi hanh vi: tao components/hooks/lib noi bo cho hydration, workout live session, routine editor, progress dashboard, body metrics, settings, auth/onboarding, sync status va notifications. Giu test pass sau moi nhom lon. Khong rewrite design toan bo neu khong can, nhung giam kich thuoc file page, bo duplication, va lam code de test hon.

Nang cap onboarding production: muc tieu tap luyen, so buoi/tuon, kinh nghiem, thiet bi co san, can nang/chieu cao, muc tieu nuoc, creatine/supplement, notification consent, local-first vs account sync. Them empty states/loading/error states cho du lieu cloud, offline, sync conflict, no routine, no progress va auth required.

Toi uu live workout mobile: controls lon, nhap set nhanh, rest timer ro, pause/resume/finish an toan, undo thao tac nguy hiem, PR toast khong che nut, wake lock fallback, va layout khong bi tran text. Kiem tra responsive desktop/mobile bang test/screenshot neu tooling co san. Chay lint/test/build va cap nhat docs UI notes neu can.
```

## Goal 6 - Workout intelligence: planner, exercise library nang cao va Coach V2

Can thao tac thu cong:

- Chot pham vi fitness advice: app khong thay the bac si/HLV ca nhan; can copy disclaimer neu dua ra goi y suc khoe.
- Neu muon AI provider that, cau hinh API key staging/production va quyet dinh budget/guardrails.

```text
/goal Xay dung lop workout intelligence cho EvolveFit gom planner, exercise library nang cao va Coach V2 rule-first.

Audit cac ham workout/progression trong `packages/shared/src/core.ts`, recommendation history, routine templates, exercise library, coach endpoints va UI progress/workout. Xac dinh du lieu can bo sung de tao goi y tot: muc tieu user, equipment, experience level, primary/secondary muscles, movement pattern, recent volume, e1RM, RPE, readiness, missed workouts va plateau.

Mo rong data model va migrations cho exercise library nang cao: primary muscles, secondary muscles, cues, common mistakes, substitutions, media URL optional, difficulty, unilateral flag, equipment alternatives va tags. Cap nhat import/export, validation, API, UI filter/search va tests.

Them workout planner: tao routine theo goal, days/week, equipment, experience, thoi luong moi buoi, muscle priority va recovery constraints. Planner phai sinh routine co ngay tap, exercise order, sets/reps/rest, va co preview/chinh sua truoc khi ap dung. Bo sung templates an toan cho full-body, upper/lower, PPL va home/bodyweight.

Nang Coach V2 theo huong rule-first: detect plateau, goi y tang/giam/giu/deload, canh bao volume tang qua nhanh, goi y bai thay the khi thieu equipment, goi y tuan deload, va giai thich dua tren data nao. Neu AI env co san, chi dung AI de dien giai/ca nhan hoa trong guardrail, con quyet dinh cot loi van do rules. Them feedback loop accepted/rejected va tests cho cases quan trong. Cap nhat OpenAPI, docs va UI copy.
```

## Goal 7 - Progress photos va privacy/data controls

Can thao tac thu cong:

- Chon noi luu anh production: Supabase Storage bucket rieng tu, Cloudflare R2, S3 hoac provider khac.
- Cau hinh storage bucket private, CORS upload, signed URL policy va retention/delete policy.

```text
/goal Them progress photos rieng tu va nang data privacy controls cho EvolveFit.

Audit body metrics/progress UI, export/delete data, Supabase schema, repository va privacy/social sharing hien co. Thiet ke model `progress_photos` gom user_id, storage path, captured_at, pose/type optional, note, linked body metric optional, created_at, deleted_at va metadata khong nhay cam qua muc can thiet.

Implement backend storage abstraction cho upload/list/download signed URL/delete. Dam bao anh rieng tu theo user, khong public URL mac dinh, co size/type validation, virus-scan hook placeholder neu provider ho tro, va delete that su khi user xoa data/account. Them Supabase/R2/S3 config docs theo provider da chon.

Them UI progress photos: upload tu file/camera, xem timeline, compare before/after, gan note, xoa anh, va empty state ro ve privacy. Khong dua anh vao social share tru khi user explicit opt-in. Cap nhat export/delete data de bao gom metadata va xoa file storage.

Viet tests cho storage service mock, auth boundary, delete behavior, signed URL expiry va UI flows co the test. Chay lint/test/build va cap nhat runbook ve storage secrets, backup va privacy.
```

## Goal 8 - Nutrition tracking nhe

Can thao tac thu cong:

- Quyet dinh MVP nutrition: calorie/protein only hay day du carb/fat.
- Neu dung food database/barcode provider, can dang ky API key va xac nhan dieu khoan su dung.

```text
/goal Them nutrition tracking nhe, khong lam loang core workout cua EvolveFit.

Viet decision doc ngan trong `docs` ve nutrition MVP: muc tieu, non-goals, data model, privacy, UX va tieu chi thanh cong. Mac dinh uu tien calorie/protein, log nhanh va meal notes truoc khi tich hop database lon.

Mo rong shared types, Supabase migrations, repository, API routes va OpenAPI cho nutrition goals, meal logs, food items custom, serving amount, calories, protein, carbs/fat optional, logged_at va source. Dam bao export/import/delete data ho tro nutrition.

Them UI nutrition vao Today/Progress/Settings theo cach gon: muc tieu ngay, log nhanh protein/calories, danh sach bua an, progress 7/30 ngay, va goi y lien ket voi workout/recovery neu co. Khong bat user nhap qua nhieu truong trong MVP.

Neu co food provider, tao abstraction rieng va fallback custom food local. Them validation, tests API/client/shared va cap nhat docs. Chay lint/test/build. Ket thuc goal khi nutrition MVP dung duoc offline/local-first va sync duoc khi dang nhap.
```

## Goal 9 - Observability, CI/CD, staging smoke va deploy runbook

Can thao tac thu cong:

- Chon hosting production cho web va API.
- Chon observability provider neu can: Sentry, Logtail, Datadog, Grafana/Prometheus hoac provider tu hosting.
- Tao secrets CI/CD cho staging/production.

```text
/goal Hoan thien observability, CI/CD, smoke tests va runbook van hanh production cho EvolveFit.

Audit `.github/workflows` neu co, scripts root, Dockerfiles, deploy runbook, observability module, client error reporting va smoke scripts. Xac dinh pipeline mong muon cho pull request, staging deploy va production deploy.

Them hoac cap nhat CI de chay `npm ci`, lint, test, build, OpenAPI generation check, smoke API/web co env mock, va optional staging smoke khi secrets co san. Dam bao CI khong can secrets production de pass basic checks. Neu OpenAPI generated thay doi, pipeline phai phat hien diff.

Nang observability: structured request logs, requestId propagation tu API den frontend error report, redaction, client error capture, cron/push/sync metrics, readiness alerts, va dashboard/runbook troubleshooting. Neu dung provider ngoai, cau hinh qua env va fallback no-op local.

Cap nhat deploy runbook: env matrix web/API, secrets checklist, migration order, deploy/rollback rieng web va API, cron scheduler setup, storage setup neu co, health checks, smoke commands, incident checklist va backup/restore. Chay full verification local va staging neu env san sang. Commit docs/config/test thay doi thanh commit rieng.
```

## Goal 10 - Native/health platform decision va bridge plan

Can thao tac thu cong:

- Quyet dinh co lam native app hay khong. Neu co, chon Expo/React Native hoac native Swift/Kotlin.
- Can Apple Developer/Google Play Console neu dua len store hoac test HealthKit/Health Connect day du.

```text
/goal Ra quyet dinh va lap plan native/health bridge cho EvolveFit dua tren nen production web hien co.

Audit health integration contracts trong shared/web/docs, PWA limitations, notification limitations, offline-first sync va cac flow can native: Health Connect, Apple Health, watch quick log, background sync, camera progress photo, widgets va push reliability.

Viet decision record trong `docs`: tiep tuc PWA-only trong V1, hay tao native companion. So sanh Expo/React Native, native Swift/Kotlin, Capacitor va PWA-only theo cost, capability, store requirement, data sync, auth, health permissions va maintenance.

Neu quyet dinh native companion, tao technical plan gom package/app moi, shared API client, auth token strategy, health permission UX, sync mapping, watch/widget roadmap, build/deploy, test devices va privacy review. Neu chua implement, khong tao app rong vo ich; chi tao scaffolding khi co quyet dinh ro va co gia tri ngay.

Cap nhat health platform docs, product roadmap va gap report. Ket thuc goal khi doi phat trien co quyet dinh ro ve native, biet viec nao lam truoc, va khong tiep tuc hien thi health sync nhu da production neu chua co bridge that.
```

## Goi y commit/push

- Moi goal nen la mot branch hoac it nhat mot cum commit rieng tren `breakthrough`.
- Commit docs audit rieng voi code thay doi.
- Commit migration/schema rieng truoc repository/API code neu migration lon.
- Commit frontend refactor theo tung module de de review.
- Push sau moi goal pass verification de tranh mat tien do va giup review som.
