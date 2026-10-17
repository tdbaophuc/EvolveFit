# EvolveFit - Mo ta chuc nang webapp

Cap nhat: 2026-09-29

Tai lieu nay tom tat cac nhom chuc nang chinh cua webapp EvolveFit theo trang thai hien tai cua du an. EvolveFit la ung dung fitness local-first ket hop API backend, tap trung vao theo doi tap luyen, nuoc, supplement, tien do ca nhan, marketplace bai tap/lich tap va lop quan tri production.

## 1. Onboarding va ho so nguoi dung

EvolveFit co luong thiet lap ban dau de ca nhan hoa trai nghiem tap luyen:

- Thiet lap muc tieu tap luyen, so buoi moi tuan, muc tieu nuoc va thong tin co ban.
- Luu profile nguoi dung local-first va dong bo len cloud khi dang nhap.
- Ho tro cau hinh thiet bi tap luyen, kinh nghiem, can nang/chieu cao va cac tuy chon lien quan den nhac nho.
- Co co che local-first de nguoi dung co the dung app ngay ca khi chua dang nhap.

## 2. Xac thuc, tai khoan va dong bo du lieu

He thong co lop auth va account lifecycle cho nguoi dung that:

- Dang ky, dang nhap, dang xuat bang email/password.
- Ho tro session/cookie httpOnly va luong refresh/re-auth qua API.
- Ho tro forgot password/reset password va contract cho Google OAuth.
- Cho phep export du lieu tai khoan va xoa tai khoan/du lieu ca local lan cloud.
- Khi dang nhap tu may co du lieu local, app co luong merge/replace/keep local de tranh mat du lieu.
- Sync queue dung idempotency key de han che tao trung ban ghi khi retry.

## 3. Dashboard hom nay

Man hinh chinh tong hop cac viec quan trong trong ngay:

- Tong quan muc tieu nuoc, tien do tap luyen va cac thong bao lien quan.
- Nhac nhanh cac viec can lam: uong nuoc, supplement, workout trong ngay.
- Hien thi cac insight ngan gon de nguoi dung biet minh dang dung tien do hay bi cham.
- Uu tien thao tac nhanh, phu hop dung hang ngay tren mobile.

## 4. Theo doi nuoc va do uong

Nhom hydration giup nguoi dung theo doi luong nuoc/uong trong ngay:

- Log nhanh cac muc nuoc pho bien nhu 250ml, 500ml, 750ml.
- Tinh tong nuoc theo ngay, ti le hoan thanh muc tieu va trang thai dung/cham tien do.
- Ho tro drink modules voi he so hydrat hoa khac nhau cho tung loai do uong.
- Cho phep sua/xoa log nuoc.
- Nhac nho uong nuoc theo lich co dinh hoac theo khoang thoi gian.

## 5. Supplement va creatine

App co module supplement co ban, dac biet cho creatine:

- Theo doi supplement dang bat/tat.
- Log trang thai da dung/bo qua cung amount va unit.
- Cau hinh reminder hour hoac schedule hours.
- Tinh consistency cho creatine trong dashboard tien do.
- Ket hop voi notification settings de nhac dung supplement.

## 6. Workout, routine va live session

Day la vung core cua EvolveFit:

- Quan ly routine ca nhan gom nhieu ngay tap va cac bai tap trong tung ngay.
- Tao/sua/xoa routine va bai tap custom.
- Start workout session tu routine/ngay tap.
- Live workout co hang doi bai tap, skip/tam dung/quay lai bai tap.
- Ghi workout set gom reps, weight, RPE va thong tin lien quan.
- Pause/resume/finish session an toan.
- Reorder session exercise queue.
- Ho tro rest timer, PR toast, plate guidance va quick set input.
- Luu lich su workout session va workout sets de tinh tien do.

## 7. Thu vien bai tap va marketplace bai tap

EvolveFit co exercise library nang cao va marketplace bai tap:

- Phan biet built-in exercise, marketplace exercise public va custom exercise cua user.
- Bai tap marketplace co metadata: ten, slug, muscle group, primary/secondary muscles, movement pattern, equipment, difficulty, unilateral flag, tags, cues, common mistakes, substitutions, contraindications/caution, media URL, source/license, status va version.
- Tim kiem, loc va sap xep bai tap theo query, nhom co, equipment, difficulty, tags va status.
- Xem chi tiet bai tap va goi y bai thay the dua tren equipment co san.
- Clone bai tap marketplace thanh custom exercise rieng.
- Them bai tap marketplace vao routine day cua nguoi dung.
- Bai tap archived khong duoc hien nhu noi dung public binh thuong.

## 8. Marketplace lich tap va routine builder

App co marketplace cho routine templates:

- Danh sach routine template public/admin-curated.
- Loc theo muc tieu, so ngay tap moi tuan, thiet bi, kinh nghiem va tags.
- Xem chi tiet template gom weekly layout, ngay tap, bai tap, sets/reps/rest, estimated minutes, warmup/cooldown, progression notes va deload notes.
- Tinh compatibility score dua tren profile nguoi dung va canh bao thiet bi bi thieu.
- Apply template vao routine ca nhan theo co che idempotent, khong sua template goc.
- Ho tro duplicate/customize va feedback accepted/rejected cho template.

## 9. Workout intelligence va Coach V2

EvolveFit co lop goi y rule-first:

- Workout planner tao routine theo goal, so ngay tap moi tuan, equipment, experience level, thoi luong moi buoi va recovery constraints.
- Coach V2 phat hien plateau, volume tang qua nhanh, can deload hoac nen thay doi muc tang/giam/giu.
- Goi y bai thay the khi thieu equipment.
- Giai thich dua tren du lieu nao: recent volume, e1RM, RPE, missed workouts, readiness va lich su tap.
- Co feedback loop accepted/rejected de hoc tu phan ung cua nguoi dung.
- Neu co AI provider, AI chi nen dung de dien giai/ca nhan hoa trong guardrail; quyet dinh cot loi van do rules.

## 10. Tien do, body metrics va thanh tich

Progress dashboard tong hop suc khoe va tap luyen:

- Theo doi hydration 7 ngay/30 ngay.
- Theo doi creatine consistency khi creatine dang bat.
- Theo doi weekly volume, muscle volume va workout count.
- Nhap body metrics nhu can nang va cac chi so co the.
- Chuyen doi range xem chi so co the.
- Tinh achievement theo thang, streak va cac trang thai active/earned.
- Co che private leaderboard/social sharing mac dinh tat, chi hien khi nguoi dung opt-in.

## 11. Notification va push

He thong notification ho tro nhac viec:

- Cau hinh hydration reminders theo fixed times hoac interval.
- Cau hinh creatine/supplement reminders.
- Quiet hours de tranh lam phien.
- In-app fallback neu push/browser notification khong san sang.
- Dang ky/huy push subscription qua API.
- Test notification qua endpoint rieng.

## 12. Health integration

Du an co lop health integration/bridge plan:

- Theo doi trang thai integration.
- Quan ly permission theo data type: weight, workout, hydration.
- Ho tro unit mapping nhu kg/lb, ml/oz, km/mi.
- Co co che privacy accepted va revoked state.
- Hien tai day la nen tang de tich hop native/health platform sau, chua nen xem la full native integration.

## 13. Import, export va data privacy

App co cac cong cu quan ly du lieu ca nhan:

- Export toan bo app data.
- Import/restore du lieu tu file export.
- Xuat CSV theo tung nhom du lieu.
- Xoa du lieu local va xoa account/data server-side.
- Phan biet du lieu public marketplace voi du lieu user-owned trong import/export.
- Luong privacy/social sharing mac dinh an toan: leaderboard va chia se tat mac dinh.

## 14. API backend va persistence

Backend Fastify cung cap API cho webapp:

- Health/readiness endpoints: `/api/health`, `/api/ready`, `/api/supabase/verify`.
- Auth/account endpoints.
- Hydration, supplement, routine, exercise, workout session/set, progress, coach, notification va sync endpoints.
- OpenAPI contract tai `/api/docs/openapi` va file `docs/api-v1.openapi.json`.
- Persistence theo repository/resource, co memory repository cho local/test va Supabase mode cho staging/production.
- API response theo envelope nhat quan `{ ok, data/error, requestId }`.
- Co validation, rate limit, CORS/cookie controls, cron secret va log redaction theo muc production-hardening.

## 15. Admin operations dashboard

Webapp co route `/admin` rieng cho van hanh production:

- Guard dang nhap admin va hien forbidden state neu khong co quyen.
- Role-aware navigation theo permission.
- Overview metrics: marketplace exercises, published exercises, routine templates, pending reports, sync events va audit logs.
- Quan ly marketplace exercises: list/filter, tao draft, publish/archive, license/media/cues metadata.
- Quan ly routine templates: list/filter, tao draft, publish/archive, muc tieu, so ngay tap, thoi luong va summary.
- Support operations: user lookup co redaction va feedback/report count.
- Role management: grant/revoke role cho `super-admin`.
- Audit log viewer theo action/resource/requestId.
- Governance health: repository mode, bootstrap env status va link runbook.
- UI khong hien service-role key, token, secrets hay raw sensitive data; moi action admin di qua `/api/admin/*`.

## 16. Admin API va governance

Admin backend duoc thiet ke deny-by-default:

- Role hien co: `super-admin`, `content-admin`, `support`.
- Permission scopes: dashboard, content read/write, support read, audit read, roles write.
- Bootstrap admin dau tien qua env `ADMIN_BOOTSTRAP_EMAILS`.
- Admin APIs nam duoi `/api/admin/*`.
- Moi mutation admin can validate input, authorize server-side va ghi audit log.
- User lookup cho support phai redacted.
- Khong dua service-role key ra frontend.
- Co runbook rieng tai `docs/admin-governance-runbook.md`.

## 17. Observability, cron va van hanh

He thong co cac thanh phan van hanh co ban:

- Observability logs endpoint.
- Client error reporting endpoint.
- Cron endpoints cho hydration reminders, creatine reminders va monthly achievements.
- Rate limit theo nhom endpoint, bao gom admin.
- Smoke script kiem tra cac endpoint chinh.
- Deploy/runbook va production readiness docs trong thu muc `docs`.

## 18. Cac man hinh/chuc nang chinh theo nguoi dung

Nguoi dung thuong:

- Onboarding va profile.
- Today dashboard.
- Hydration tracking.
- Supplement/creatine tracking.
- Routine builder va live workout.
- Marketplace bai tap.
- Marketplace lich tap/template.
- Progress dashboard, body metrics, achievements.
- Settings, auth/account, import/export/delete data.
- Notification va privacy controls.

Admin/operations:

- Admin overview.
- Content governance cho bai tap va routine template.
- User support lookup co redaction.
- Feedback/report moderation summary.
- Role management.
- Audit review.
- Governance health va runbook shortcuts.

## 19. Trang thai san pham

EvolveFit dang o trang thai san pham webapp co nhieu lop production readiness da duoc xay dung:

- Core fitness workflows da ro: nuoc, supplement, routine, workout, progress, coach.
- Marketplace bai tap va lich tap da co contract/model/API/UI nen tang.
- Admin API va admin dashboard da co de van hanh noi dung va support.
- Van con cac goal production tiep theo trong roadmap nhu progress photos, nutrition tracking nhe, CI/CD/staging automation va native/health bridge quyet dinh cuoi.
