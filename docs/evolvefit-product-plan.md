# EvolveFit - Product & Technical Plan

## 1. Dinh vi san pham

EvolveFit la mot ung dung PWA mobile-first giup nguoi tap gym ghi nhan nhanh 3 nhom du lieu quan trong: hydration/supplement, workout, va chi so co the. Diem khac biet chinh la tri ly "1-cham": moi thao tac lap lai hang ngay phai hoan thanh trong 1-2 cham, phu hop luc dang tap, tay mo hoi, hoac vua uong nuoc xong.

San pham khong nen bat dau nhu mot app fitness tong hop qua lon. Huong toi phien ban dau nen la "hydration + workout logger cuc nhanh", sau do mo rong thanh he thong training intelligence: nhac dung luc, goi y progressive overload, phat hien stall, va dieu chinh lich dua tren RPE/recovery.

## 2. Nguoi dung muc tieu

### Primary user

Nguoi tap gym 3-6 buoi/tuần, co lich tap ca nhan, muon tang co/giam mo, can log nuoc, creatine, set/rep/weight nhanh ma khong muon mo spreadsheet.

### Secondary user

Nguoi moi bat dau xay thoi quen suc khoe, can nhac uong nuoc, theo doi can nang, va lam quen voi lich tap co cau truc.

### Nguyen tac UX

- Mobile-first, thumb-friendly, nut lon, khong yeu cau go ban phim cho tac vu pho bien.
- Dashboard dau tien la man hinh hanh dong, khong phai landing page.
- Offline-tolerant: log nhanh vao local cache truoc, sync sau.
- Moi reminder phai co ngu canh va hanh dong nhanh, tranh spam.
- Du lieu cua user phai export duoc.

## 3. Tham khao tu cac app tuong tu

Nhung pattern nen hoc:

- WaterMinder, Waterllama, Hydro Coach: muc tieu nuoc ca nhan hoa theo can nang/hoat dong, custom cup size, beverage type, smart reminders, widgets, health sync.
- Plant Nanny, Waterllama: gamification nhe bang streak, challenge, collectible/visual progress, nhung khong de game lam cham thao tac log.
- Strong, StrongLifts, Badger: workout template, log set cuc nhanh, rest timer tu dong, xem lai set tuan truoc, PR/e1RM, volume chart, body measurement.
- StrongLifts/Nishaana-style progression: neu dat target thi tu dong tang rep/weight; neu fail lap lai thi deload hoac giu muc.
- Cac app moi tap trung vao lock-screen/watch/widget actions. Voi PWA, nen thiet ke API va data model san sang cho mobile app/native widget sau nay.

Ghi chu ky thuat: web push tren iOS chi kha thi tot khi app duoc Add to Home Screen va iOS tu 16.4 tro len. PWA nen co fallback reminder trong app/email/SMS tuy theo giai doan.

## 4. Pham vi san pham

## 4.1. Trang thai trien khai hien tai

Cap nhat sau commit `88bbe02 - Build EvolveFit PWA MVP` tren nhanh `breakthrough`.

### Da lam

- Khoi tao ung dung Next.js App Router, TypeScript, ESLint, Vitest.
- Cai dat giao dien PWA mobile-first theo light mode:
  - Top app bar 56px.
  - Bottom tab bar 5 tab: Hom nay, Tap luyen, Tien do, HLV, Cai dat.
  - Layout card-based, padding 16px, card radius 8px, button radius 12px.
  - Mau semantic: Hydration sky blue, Training lime, Supplement amber, Coach violet.
- Man hinh Today:
  - Onboarding nhanh local-first cho profile, water target, wake/sleep time.
  - Hydration progress ring.
  - Quick buttons log nuoc.
  - Slider chon luong nuoc custom.
  - Pin & log amount thanh quick button.
  - Hydration detail timeline voi sua amount +/-50ml va xoa log.
  - Creatine row voi slider amount va quick button.
  - Supplement custom list, them supplement moi va log supplement trong ngay.
  - Xoa supplement custom.
  - Workout today card.
  - Readiness chips.
  - Monthly badge preview.
  - Recent hydration logs.
- Man hinh Workout / Live Workout:
  - Push Day demo routine.
  - Template selector: PPL, Upper/Lower, Full Body, Custom.
  - Routine builder compact va exercise library local.
  - Them exercise custom vao routine.
  - Xoa va sap xep exercise trong routine.
  - Chinh nhanh target weight/reps cua exercise.
  - Exercise hien tai, target sets/reps/weight.
  - Last session comparison.
  - Set table target/actual.
  - Stepper cho weight, reps, RPE.
  - Nut "Hoan thanh set".
  - Rest timer auto-start sau khi complete set.
  - Workout history local cho cac set da ghi.
- Man hinh Progress:
  - Summary cards cho hydration, workout volume, e1RM, total sets.
  - Bar chart 7 ngay dang UI.
  - Body metrics CRUD local cho weight/body fat.
  - Weight delta va body metrics timeline.
  - Chinh nhanh body weight trong timeline.
  - Xoa body metric.
  - Badge list.
  - Export JSON local.
- Man hinh Coach:
  - Rule-based recommendation card.
  - Recovery check-in editable: energy, sleep, soreness, stress, note.
  - Readiness score.
  - Accept/reject recommendation va audit trail local.
  - Leaderboard preview.
- Man hinh Settings:
  - Auth/session UI local fallback: local/email/google mode.
  - Chinh water target.
  - Chinh gio uong creatine.
  - Chinh so phut nhac truoc.
  - Toggle leaderboard opt-in.
  - Notification permission UI.
  - Backend readiness panel.
  - Reset du lieu mau.
- Logic local-first:
  - Luu state vao `localStorage`.
  - Hydration total, percent, expected progress theo gio thuc/day.
  - Hydration reminder rule, co quiet hours.
  - Creatine reminder rule theo gio co dinh va remind-before.
  - Quick amount upsert, pin, sort theo tan suat dung.
  - Undo cho water, creatine, complete set.
  - Progressive overload recommendation: increase / hold / deload.
  - Estimated 1RM.
  - Latest body metric, body weight delta.
  - Export app data JSON.
  - Monthly achievement calculation.
- PWA:
  - `manifest.webmanifest`.
  - App icon SVG.
  - Service worker cache co ban.
- Backend/API contracts:
  - Route Handlers cho hydration today/log/patch/delete.
  - Route Handlers cho supplements list/create/log/reminder.
  - Route Handlers cho workouts today/log set.
  - Route Handler cho progression recalculate.
  - Route Handler cho coach recommend.
  - Route Handlers cho cron hydration/creatine reminders.
  - Route Handlers cho notification subscribe/unsubscribe.
  - Route Handlers cho achievements/leaderboards.
  - Route Handler `POST /api/achievements/recalculate`.
  - Route Handler `PATCH /api/leaderboards/visibility`.
  - Route Handler `POST /api/cron/monthly-achievements`.
  - Route Handler `/api/integrations/status` de kiem tra Supabase/AI/Web Push/Cron env readiness.
  - Server memory adapter trong `src/lib/api.ts`, san sang thay bang Supabase adapter.
- Integration adapters:
  - `.env.example` cho Supabase, Gemini/OpenAI, VAPID, Cron secret.
  - `src/lib/integrations.ts` cho Supabase REST request contract.
  - `src/lib/data-adapter.ts` gom `MemoryDataAdapter`, `SupabaseRestAdapter`, va factory fallback theo env.
  - AI coach adapter goi Gemini/OpenAI provider that khi co API key, fallback rule-based khi thieu key/loi provider.
  - Typed API client `src/lib/api-client.ts` cho web/mobile dung chung API contract.
- Supabase:
  - Migration SQL `supabase/migrations/0001_initial_schema.sql`.
  - Bang core theo data model: profiles, hydration, supplements, routines, workouts, body metrics, notifications, achievements, leaderboard.
  - RLS policies owner access/public read can thiet.
- Automation:
  - `vercel.json` cron cho hydration reminders moi 2 gio.
  - `vercel.json` cron cho creatine reminders moi 15 phut.
  - `vercel.json` cron cho monthly achievements vao dau thang.
  - Service worker push event handler.
  - Service worker notification action handler: `log-water-250`, `log-creatine`, `snooze`.
  - Web Push sender `src/lib/push.ts` dung VAPID env va fallback `missing-env` khi chua cau hinh.
  - Cron hydration/creatine routes da noi vao Web Push sender.
- Test/build:
  - `npm run lint` pass.
  - `npm test` pass: 30 tests.
  - `npm run build` pass.
- Git:
  - Da commit va push len GitHub nhanh `breakthrough`.

### Da lam mot phan / dang gia lap

- Auth/profile:
  - Da co onboarding/profile local va auth/session UI fallback cho local/email/google mode.
  - Chua co dang ky/dang nhap OAuth that.
- Supabase:
  - Da co database migration/RLS artifact.
  - Da co env contract va Supabase REST request helper.
  - Da co Supabase REST adapter fallback qua `createDataAdapter`.
  - Chua co Supabase Auth/session UI that vi chua co credentials.
- Hydration history:
  - Co log, recent logs, timeline local va sua/xoa amount nhanh.
  - Co route `/hydration` rieng voi filter va chart theo gio local-first.
- Supplement:
  - Co creatine local, slider va reminder rule.
  - Co them/xoa supplement custom va log trong ngay.
  - Chua co edit supplement va schedule rule rieng cho tung supplement.
- Workout planner:
  - Co routine demo, live workout, exercise library local, them/xoa/sap xep exercise custom.
  - Co template selector PPL/Upper-Lower/Full Body/Custom.
  - Co chinh nhanh target weight/reps cua exercise.
  - Chua co form edit exercise day du va drag reorder bang gesture.
- Notifications:
  - Co rule tinh nen nhac, notification subscribe/unsubscribe contract, cron routes, notification permission UI va service worker action handler.
  - Co Web Push sender that qua VAPID; can VAPID credentials de gui that tren deployment.
- AI Coach:
  - Hien la rule-based recommendation.
  - Co coach API contract va AI adapter mode Gemini/OpenAI/rule fallback.
  - Co recovery check-in editable, readiness score va accept/reject audit trail local.
  - Co provider call Gemini/OpenAI that; can API key de dung tren deployment.
- Achievements/Leaderboard:
  - Co badge calculation, leaderboard preview, recalculate API, visibility API va monthly cron route.
  - Chua co public profile/ranking backend/anti-cheat that.
- Offline:
  - Co localStorage va service worker cache co ban.
  - Chua co offline queue/sync conflict handling voi backend.
- Body metrics:
  - Co body metrics local cho weight/body fat, timeline, chinh nhanh weight va xoa metric.
  - Chua co form edit metric day du va chart body fat/weight nang cao.

### Chua lam

- Dang ky/dang nhap email/Google OAuth that.
- Onboarding flow 5 buoc day du voi template selection.
- Supabase Auth/client session integration voi project credentials.
- Supabase Auth/session UI that voi project credentials.
- VAPID/FCM credentials tren deployment de bat Web Push production.
- Hydration detail nang cao voi richer analytics va backend sync.
- Exercise library/routine builder nang cao voi edit va drag-drop.
- Data export CSV va export JSON backend-safe.
- Gemini/OpenAI API key tren deployment de bat AI production.
- Health sync, native mobile app, widgets, watch app.
- Nutrition tracking, progress photos, social sharing.

### MVP - Ban dung duoc hang ngay

Muc tieu: user co the cai PWA len dien thoai, log nuoc/creatine, tap theo lich, xem tien do hom nay va lich su co ban.

Chuc nang:

- Dang ky/dang nhap bang email, Google OAuth.
- Onboarding nhanh:
  - Don vi: kg/lb, ml/oz.
  - Can nang, chieu cao, gio thuc-day/di-ngu.
  - Muc tieu nuoc mac dinh.
  - Lich tap trong tuan.
- Home dashboard:
  - Progress ring nuoc trong ngay.
  - Nut `+250ml`, `+500ml`, va cac quick button tu dong tao tu lan log gan day.
  - Slider chon nhanh luong nuoc khi khong dung preset; sau khi log, amount do co the duoc pin thanh quick button.
  - Nut `+5g creatine` va quick button theo luong creatine user hay dung.
  - Card "Workout hom nay" voi nut bat dau.
  - Streak va trang thai hom nay.
- Hydration tracking:
  - Log intake theo amount, drink type, timestamp.
  - Undo trong 5-10 giay sau khi log sai.
  - Sua/xoa log trong lich su ngay.
  - Reset theo timezone user, khong hard-code 0:00 server.
  - Quan ly quick amounts: pin/unpin/sap xep `250ml`, `500ml`, `750ml`, custom.
- Supplement tracking:
  - Creatine default 5g/ngay.
  - Slider chon luong creatine/supplement khi log custom amount.
  - Cai dat gio uong creatine co dinh va nhac truoc gio do.
  - Cho them supplement tuy chinh: whey, omega-3, vitamin D, pre-workout.
  - Trang thai: chua dung / da dung / bo qua.
- Workout planner:
  - Tao routine: Push/Pull/Legs, Upper/Lower, Full body, custom.
  - Exercise library co muscle group, equipment, default rest time.
  - Them exercise custom.
- Live Workout Mode:
  - Hien bai tap hien tai, set muc tieu, weight/reps lan truoc.
  - Nut to: hoan thanh set.
  - Nut `-`/`+` cho reps va weight.
  - Rest timer auto-start sau moi set.
  - RPE/RIR quick selector sau exercise hoac cuoi buoi.
  - Wake Lock API neu trinh duyet ho tro.
- Body metrics:
  - Can nang, body fat %, waist, chest, arm, thigh.
  - Chart can nang/body fat theo thoi gian.
- Basic analytics:
  - Nuoc trung binh 7 ngay.
  - Workout completion theo tuan.
  - Volume moi exercise.
  - PR don gian: max weight, max reps, estimated 1RM.
- PWA:
  - Manifest, icons, installable.
  - Service worker cache app shell.
  - Offline log queue.

### V1 - Ban san pham nen co de giu user

Muc tieu: app bat dau "thong minh" va giam viec user phai tu tinh.

Chuc nang:

- Smart hydration goal:
  - Cong thuc theo can nang.
  - Dieu chinh theo workout day, thoi tiet/nhiet do neu co API sau nay.
  - Dieu chinh theo caffeine/alcohol neu user log.
- Smart reminders:
  - Nhac theo khoang gio thuc-day/di-ngu.
  - Khong nhac neu vua log gan day.
  - Nhac manh hon neu den moc gio ma progress qua thap.
  - Quiet hours.
  - Snooze 15/30/60 phut.
- Notification actions:
  - Quick action `Log 250ml`.
  - Quick action `Snooze`.
  - Workout rest timer notification.
- Progressive overload engine:
  - Rule theo exercise/program:
    - Double progression: dat top reps tat ca set thi tang weight.
    - Linear progression: dat target thi tang weight lan sau.
    - Deload: fail 2-3 lan lien tiep thi giam 5-10%.
  - Tu dong tao target cho buoi sau.
  - Ghi ly do dieu chinh de user tin duoc.
- Program templates:
  - PPL 3/6 ngay.
  - Upper/Lower 4 ngay.
  - Full Body 3 ngay.
  - StrongLifts 5x5-inspired.
  - Custom template.
- Recovery check-in:
  - Sleep quality, soreness, stress, energy.
  - Readiness score 0-100.
  - Goi y giu/tang/giam intensity.
- AI Coach v1:
  - Khong tu y thay doi lich ngay lap tuc.
  - Chi tao recommendation co giai thich va nut accept.
  - Input: lich su workout, RPE, sleep, soreness, missed sessions.
  - Output: doi ngay tap, deload, giam volume, thay exercise tuong duong.
- Advanced analytics:
  - Volume theo muscle group/tuần.
  - e1RM trend.
  - Consistency calendar/heatmap.
  - Hydration vs workout performance correlation.
- Data export:
  - CSV/JSON export hydration, supplements, workouts, body metrics.
- Lightweight gamification:
  - Monthly hydration badge neu dat du muc tieu nuoc theo nguong ngay trong thang.
  - Monthly training volume badge neu volume tang tien hop ly so voi thang truoc.
  - Badge co hieu luc theo thang; thang sau khong dat thi mat trang thai active nhung van luu lich su.
  - Private mode mac dinh, user tu chon tham gia leaderboard.

### V2 - Mo rong thanh he sinh thai

Muc tieu: san sang mobile app va tinh nang premium/long-term.

Chuc nang:

- Native mobile app bang React Native/Expo dung chung backend Supabase.
- Apple Health / Google Health Connect integration.
- Apple Watch / WearOS companion sau khi co native app.
- Home screen widgets / lock screen widgets native.
- Barcode/manual nutrition lite: protein, calories, macros.
- Photo progress va comparison.
- Social/private sharing:
  - Share PR card.
  - Share routine.
  - Coach view/read-only.
- Leaderboard:
  - Vinh danh user duy tri badge lau nhat.
  - Bang xep hang theo hydration consistency, training progression, va all-around consistency.
  - Anti-cheat/rate-limit co ban de tranh spam log ao.
- Import tu CSV/Strong/Hevy neu kha thi.
- Multi-language: Vietnamese/English.
- Premium features:
  - AI coach nang cao.
  - Unlimited custom supplement.
  - Advanced analytics.
  - Health sync/native widgets.

## 5. Man hinh chinh can thiet

### 1. Home

Noi dung:

- Today hydration ring.
- Quick add buttons.
- Supplement status chips.
- Workout today.
- Readiness mini check-in.
- Streak/summary nho.

Hanh dong chinh:

- Log water.
- Chon amount bang slider khi can.
- Pin amount vua chon thanh quick button.
- Log creatine/supplement.
- Start workout.
- Undo last log.

### 2. Hydration

Noi dung:

- Timeline hom nay.
- Progress theo gio.
- Drink types.
- Goal setting.
- Reminder setting.
- Quick amount presets.

Hanh dong:

- Add custom drink.
- Sua/xoa log.
- Cau hinh cup size.
- Pin/unpin quick amount.

### 3. Workout

Noi dung:

- Lich tap tuan.
- Routine templates.
- Exercise library.
- Workout history.

Hanh dong:

- Start session.
- Edit routine.
- Add exercise.

### 4. Live Workout

Noi dung:

- Exercise hien tai.
- Set list voi target va actual.
- Last session comparison.
- Rest timer.
- RPE/RIR.

Hanh dong:

- Complete set.
- Adjust reps/weight.
- Skip set/exercise.
- Finish workout.

### 5. Progress

Noi dung:

- Body metrics chart.
- Workout consistency.
- Volume/e1RM.
- Hydration trend.
- PR list.

### 6. Coach

Noi dung:

- Recommendation queue.
- Giai thich rule/AI.
- Recovery insights.

Hanh dong:

- Accept recommendation.
- Reject with reason.
- Ask AI.

### 7. Achievements

Noi dung:

- Badge hydration thang hien tai.
- Badge training volume thang hien tai.
- Badge history.
- Leaderboard opt-in status.
- Ranking neu user da opt-in.

Hanh dong:

- Xem dieu kien badge.
- Bat/tat tham gia leaderboard.
- Share badge/PR card.

### 8. Settings

Noi dung:

- Profile, units, timezone.
- Notification permission.
- Quiet hours.
- Creatine/supplement reminder time.
- Quick amount management.
- Data export/delete.
- Privacy.

## 6. Data model de xuat

### Core tables

- `profiles`
  - `id`, `user_id`, `display_name`, `timezone`, `unit_weight`, `unit_volume`, `created_at`
- `user_body_metrics`
  - `id`, `user_id`, `measured_at`, `weight_kg`, `height_cm`, `body_fat_percent`, `waist_cm`, `notes`
- `hydration_goals`
  - `id`, `user_id`, `date`, `target_ml`, `source`, `created_at`
- `hydration_logs`
  - `id`, `user_id`, `logged_at`, `amount_ml`, `drink_type`, `hydration_factor`, `source`, `note`
- `user_quick_amounts`
  - `id`, `user_id`, `category`, `label`, `amount`, `unit`, `sort_order`, `pinned`, `last_used_at`
- `supplements`
  - `id`, `user_id`, `name`, `default_amount`, `unit`, `schedule_rule`, `reminder_time`, `remind_before_minutes`, `active`
- `supplement_logs`
  - `id`, `user_id`, `supplement_id`, `logged_at`, `amount`, `unit`, `status`
- `exercises`
  - `id`, `user_id nullable`, `name`, `muscle_group`, `equipment`, `exercise_type`, `is_public`
- `routines`
  - `id`, `user_id`, `name`, `days_per_week`, `active`
- `routine_days`
  - `id`, `routine_id`, `day_index`, `name`
- `routine_exercises`
  - `id`, `routine_day_id`, `exercise_id`, `order_index`, `target_sets`, `target_reps_min`, `target_reps_max`, `target_weight_kg`, `rest_seconds`, `progression_rule`
- `workout_sessions`
  - `id`, `user_id`, `routine_day_id`, `started_at`, `finished_at`, `status`, `readiness_score`, `notes`
- `workout_sets`
  - `id`, `session_id`, `exercise_id`, `set_index`, `target_weight_kg`, `target_reps`, `actual_weight_kg`, `actual_reps`, `rpe`, `rir`, `set_type`, `completed_at`
- `progression_recommendations`
  - `id`, `user_id`, `exercise_id`, `source`, `recommendation_json`, `reason`, `status`, `created_at`, `applied_at`
- `notification_subscriptions`
  - `id`, `user_id`, `endpoint`, `p256dh`, `auth`, `platform`, `created_at`, `revoked_at`
- `notification_events`
  - `id`, `user_id`, `type`, `scheduled_for`, `sent_at`, `status`, `payload_json`
- `ai_requests`
  - `id`, `user_id`, `request_type`, `input_summary`, `output_json`, `model`, `created_at`
- `achievement_definitions`
  - `id`, `code`, `name`, `description`, `category`, `rule_json`, `active`
- `user_achievements`
  - `id`, `user_id`, `achievement_id`, `period_start`, `period_end`, `status`, `earned_at`, `lost_at`, `streak_months`
- `leaderboard_entries`
  - `id`, `user_id`, `period`, `category`, `score`, `rank`, `is_public`, `computed_at`

### Nguyen tac du lieu

- Moi bang user-owned bat buoc co Row Level Security.
- Luu amount canonical bang metric (`ml`, `kg`) roi convert tren UI.
- Khong xoa cung log quan trong; uu tien soft delete neu can audit.
- AI chi nhan summary can thiet, khong gui thua PII.

## 7. API / server actions de xuat

Hydration:

- `POST /api/hydration/log`
- `PATCH /api/hydration/log/:id`
- `DELETE /api/hydration/log/:id`
- `GET /api/hydration/today`
- `POST /api/hydration/recalculate-goal`
- `GET /api/quick-amounts?category=hydration`
- `POST /api/quick-amounts`
- `PATCH /api/quick-amounts/:id`

Supplements:

- `GET /api/supplements`
- `POST /api/supplements/log`
- `POST /api/supplements`
- `PATCH /api/supplements/:id/reminder`
- `GET /api/quick-amounts?category=supplement`

Workout:

- `GET /api/workouts/today`
- `POST /api/workouts/start`
- `POST /api/workouts/:sessionId/sets`
- `PATCH /api/workouts/:sessionId/sets/:setId`
- `POST /api/workouts/:sessionId/finish`
- `POST /api/progression/recalculate`

Notifications:

- `POST /api/notifications/subscribe`
- `POST /api/notifications/unsubscribe`
- `POST /api/cron/hydration-reminders`
- `POST /api/cron/workout-reminders`

AI:

- `POST /api/coach/recommend`
- `POST /api/coach/recommendations/:id/apply`
- `POST /api/coach/recommendations/:id/reject`

Achievements:

- `GET /api/achievements/me`
- `POST /api/achievements/recalculate`
- `GET /api/leaderboards?category=hydration|training|overall`
- `PATCH /api/leaderboards/visibility`

## 8. Tech stack de xuat

### Web/PWA

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui hoac component system nhe, tuy bien de nut lon va mobile-first.
- Zustand hoac TanStack Query cho client state/cache.
- React Hook Form + Zod cho forms.
- Recharts hoac Tremor/Recharts cho charts.
- next-pwa/Serwist cho service worker.

### Backend

- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Row Level Security.
- Supabase Storage cho progress photos sau nay.
- Next.js Route Handlers/Server Actions cho API.

### Notifications

- Web Push standard voi VAPID.
- FCM co the dung neu can Android/browser support va mobile app sau nay.
- Vercel Cron cho job dinh ky.
- Fallback in-app reminders neu push permission bi tu choi.

### AI

- Gemini API hoac OpenAI API tuy budget.
- Prompt theo structured JSON schema.
- Luu recommendation va cho user accept, tranh auto-update lich am tham.

### Mobile future

- React Native/Expo.
- Shared package:
  - `packages/core`: progression engine, calculators, validation schemas.
  - `packages/api-client`: typed API client.
  - `packages/ui-tokens`: colors, spacing, typography.
- Backend giu nguyen Supabase/Next API.

## 9. Progressive overload rules

### Double progression

Ap dung cho hypertrophy 6-12 reps:

- Neu user dat `target_reps_max` cho tat ca working sets trong 2 buoi lien tiep, tang weight lan sau.
- Neu chi dat trong mot so set, giu weight va co gang tang reps.
- Neu fail duoi `target_reps_min` qua 2 buoi lien tiep, giam weight 5-10% hoac giam 1 set.

### Linear progression

Ap dung cho beginner compound lifts:

- Neu hoan thanh target 5x5, tang weight lan sau.
- Neu fail, lap lai weight.
- Fail 3 lan: deload 10%.

### RPE/RIR adjustment

- RPE <= 7 va dat target: tang nhe hon muc mac dinh neu exercise nho, tang binh thuong neu compound.
- RPE 8-9: giu progression binh thuong.
- RPE 10 hoac dau bat thuong: de xuat giu/giam load.

### AI layer

AI khong thay the rule engine. AI chi dung khi co ngu canh phuc tap:

- Mat ngu, dau co, stress cao.
- Miss workout.
- Plateau nhieu tuan.
- User hoi "hom nay nen tap gi?".

## 10. Reminder logic

### Hydration reminder

Input:

- Wake/sleep time.
- Target daily ml.
- Current logged ml.
- Last log time.
- Workout today.
- Quiet hours.

Logic de xuat:

- Chia target theo so gio con thuc.
- Moi lan cron chay, tinh expected progress tai thoi diem hien tai.
- Neu current < expected - threshold va last_log > 60-90 phut, tao reminder.
- Neu user snooze, khong gui lai truoc snooze_until.
- Neu user thuong bo qua khung gio nao, giam tan suat khung do.

### Workout reminder

- Nhac truoc gio tap quen thuoc.
- Neu da miss 1 buoi, goi y reschedule.
- Khong nhac neu user da bat dau/hoan thanh workout hom do.

### Creatine/supplement reminder

- Cho user cai mot hoac nhieu khung gio uong co dinh.
- Gui reminder truoc `remind_before_minutes` neu hom do chua log.
- Neu da log creatine trong ngay, khong gui reminder nua.
- Neu user bo qua lien tiep, hien goi y doi gio nhac.

## 11. Tinh nang hay nen them

- Adaptive cup buttons: app tu dua 3 nut log hay dung nhat cua user len dau.
- Slider-to-quick-button: sau khi user keo slider chon amount moi, app hoi nhe co pin amount do thanh nut nhanh khong.
- Bathroom/output signal optional: user co the log restroom 1 cham de nhan biet hydration pattern ma khong can log tung ly.
- Bottle mode: user chon binh 750ml/1L, app hien "con lai trong binh" va nut refill.
- Gym mode lock screen: trong mobile native sau nay, hien rest timer va next set tren lock screen.
- Plate calculator: tinh dia ta cho barbell theo muc weight.
- Warm-up calculator: goi y warm-up sets dua tren working weight.
- PR share card: tao anh chia se PR.
- Exercise substitution: khi may tap ban, goi y bai thay the cung muscle group/equipment.
- Recovery-based deload: neu sleep/RPE/soreness xau nhieu ngay, goi y giam volume.
- Consistency score: diem 0-100 gom hydration, workout, supplement, sleep/recovery.
- Monthly badges: huy hieu nuoc, creatine, workout consistency, volume progression; active theo thang de tao dong luc duy tri.
- Leaderboard opt-in: chi nguoi dung dong y moi hien tren bang xep hang.
- Private coach export: xuat report tuan cho PT.

## 12. Roadmap trien khai

### Phase 0 - Foundation

Trang thai: Partial / foundation va schema da co, con thieu ket noi Supabase that.

- Khoi tao Next.js + TypeScript + Tailwind.
- Cau hinh Supabase Auth va database migrations.
- Thiet ke design tokens mobile-first.
- Cai PWA manifest/icons/service worker co ban.

Da lam:

- Next.js + TypeScript da khoi tao.
- ESLint/Vitest da cau hinh.
- Design tokens light mode da implement trong CSS.
- PWA manifest, icon, service worker co ban da co.
- Supabase migration SQL va RLS policies da co.
- API Route Handlers theo contract da co.
- Vercel cron config da co.
- `.env.example`, integration status API, Supabase REST request helper da co.
- Data adapter factory voi Supabase REST adapter va memory fallback da co.
- Auth/session UI fallback local/email/google mode da co.

Con lai:

- Chua dung Tailwind; hien dang dung CSS thuan theo design docs.
- Chua cau hinh Supabase Auth/OAuth flow voi credentials that.

Exit criteria:

- User dang nhap duoc.
- App installable tren mobile.
- Co layout shell: Home, Workout, Progress, Settings.

### Phase 1 - Hydration & supplement MVP

Trang thai: Mostly done local-first / con thieu backend sync va mot so CRUD nang cao.

- Hydration goal va quick log.
- Slider chon amount va quick amount presets.
- Creatine/supplement log.
- Creatine reminder time.
- Undo/sua/xoa log.
- Daily progress ring.
- Local optimistic update + sync.

Da lam:

- Hydration goal local va quick log da co.
- Slider amount va pin quick button da co.
- Creatine log, slider amount, quick amount da co.
- Creatine reminder time va reminder rule da co.
- Undo sau khi log da co.
- Hydration timeline local co sua amount +/-50ml va xoa log.
- Hydration detail route `/hydration` voi filter va chart theo gio da co.
- Them supplement custom va log supplement trong ngay da co.
- Daily progress ring da co.
- Local optimistic update qua React state/localStorage da co.

Con lai:

- Chua co sync backend.
- Chua co edit supplement.
- Chua co notification that gui ve may.

Exit criteria:

- Log nuoc duoi 1 giay tren mobile.
- Du lieu reset dung theo timezone.
- Hoat dong duoc khi offline ngan han.

### Phase 2 - Workout MVP

Trang thai: Partial / live workout va builder local da dung duoc, planner nang cao chua day du.

- Exercise library.
- Routine builder don gian.
- Live workout mode.
- Rest timer.
- Workout history.
- Body metrics.

Da lam:

- Live workout mode da co.
- Routine builder compact da co.
- Exercise library local va them exercise custom da co.
- Template selector PPL/Upper-Lower/Full Body/Custom da co.
- Chinh nhanh target weight/reps cua exercise da co.
- Exercise target, last session comparison da co du lieu mau.
- Stepper weight/reps/RPE da co.
- Complete set va rest timer da co.
- Workout sets duoc luu localStorage.
- e1RM va volume summary da co trong Progress.
- Workout history local cho sets da co.

Con lai:

- Chua co form edit exercise day du va drag-drop reorder bang gesture.
- Body metrics local da co, nhung chua co form edit day du/chart nang cao.
- Wake Lock API chua implement.

Exit criteria:

- User tao duoc lich tap va log tron mot buoi.
- Buoi sau thay duoc so lieu lan truoc.
- Chart co ban hien dung.

### Phase 3 - Automation

Trang thai: Mostly done / Web Push sender da co, can VAPID credentials de gui production.

- Progressive overload engine.
- Smart hydration reminders.
- Web push subscription.
- Vercel Cron jobs.
- Notification settings.

Da lam:

- Progressive overload rule engine da co va co test.
- Hydration reminder rule da co va co test.
- Creatine reminder rule da co va co test.
- Settings co chinh reminder time/remind-before.
- Notification subscribe/unsubscribe API da co.
- Cron routes va `vercel.json` da co.
- Monthly achievements cron route da co.
- Notification permission UI da co.
- Service worker push/action handler da co.
- Web Push sender da co va cron routes da noi vao sender.

Con lai:

- Chua co VAPID/FCM credentials tren deployment.
- Chua co notification settings UI nang cao nhu quiet hours/snooze history tren Settings.

Exit criteria:

- He thong goi y target buoi sau dung rule.
- Reminder khong spam va ton trong quiet hours.
- Push hoat dong tren Chrome Android va iOS Home Screen neu du dieu kien.

### Phase 4 - AI Coach

Trang thai: Mostly done / AI provider call da co, can API key de dung production.

- Recovery check-in.
- AI recommendation JSON.
- Review/accept/reject flow.
- Luu audit trail.
- Achievement engine co ban cho monthly badges.

Da lam:

- Coach recommendation card da co.
- Recommendation hien dua tren rule engine.
- Coach recommend API contract da co.
- AI adapter Gemini/OpenAI/rule fallback da co.
- Gemini/OpenAI provider call da co qua fetch.
- Recovery check-in editable da co.
- Accept/reject recommendation audit trail local da co.
- Readiness score UI da co.
- Achievement engine co ban cho monthly badges da co va co test.
- Badge preview da hien trong Today/Progress.
- Achievement recalculate API, leaderboard visibility API va monthly cron route da co.

Con lai:

- Chua co Gemini/OpenAI API key tren deployment.
- Chua co JSON schema/prompt nang cao cho production.
- Chua co ranking backend/anti-cheat that.

Exit criteria:

- AI dua goi y co giai thich.
- User co quyen chap nhan tu thay doi lich.
- Co fallback rule-based khi AI loi.
- User dat/mat monthly badge theo rule minh bach.

### Phase 5 - Mobile-ready

Trang thai: Not started / moi chuan bi mot phan qua PWA va core logic tach rieng.

- Tach core logic thanh package rieng.
- Chuan hoa API client.
- Health sync strategy.
- Expo prototype.
- Leaderboard opt-in va public profile toi thieu.

Da lam:

- Core logic da tach o `src/lib/core.ts`, co the tiep tuc tach thanh package sau.
- UI da mobile-first va PWA-installable ve mat manifest.
- Leaderboard opt-in da co toggle local.
- Typed API client `src/lib/api-client.ts` da co.

Con lai:

- Chua co monorepo/package shared.
- Chua co Health sync strategy implement.
- Chua co Expo prototype.
- Chua co public profile/leaderboard backend.

Exit criteria:

- Phan progression/calculator dung lai duoc ngoai Next.js.
- Mobile app co the dung chung auth/backend.

## 13. RLS va bao mat

- Bat RLS cho tat ca bang co `user_id`.
- Policy: user chi doc/ghi du lieu cua minh.
- API cron phai co secret header.
- Notification endpoint ma hoa/bao ve, khong expose key private.
- Rate limit API AI va notification.
- Export/delete data theo user request.
- Khong dua advice y te nguy hiem; AI coach can noi ro day la goi y tap luyen, khong thay the chuyen gia y te.

## 14. Metrics thanh cong

### Product metrics

- Time to log water: < 1 giay.
- Time to complete set: < 2 giay.
- D1/D7 retention.
- So ngay log hydration/tuan.
- So workout completed/tuan.
- Reminder open/action rate.
- Ty le user tat notification.

### Technical metrics

- First load mobile < 3 giay tren 4G.
- API quick log p95 < 300ms neu warm.
- Offline queue sync success > 99%.
- Error rate < 1%.

## 15. Thu tu uu tien neu thoi gian han che

Lam truoc:

1. Auth + profile/timezone/units.
2. Hydration quick log + progress ring.
3. Slider amount + quick button tu amount hay dung.
4. Creatine log + reminder time.
5. Workout live logging + rest timer.
6. Workout history + previous set display.
7. Progressive overload rule engine.
8. Smart reminders.
9. Monthly badges.
10. AI coach.
11. Leaderboard opt-in.
12. Mobile/native app.

Khong lam qua som:

- Social feed.
- Marketplace routine.
- Nutrition tracking day du.
- Wearable integration phuc tap.
- AI chat tu do khong co cau truc.

## 16. Tai lieu tham khao

- Apple Developer - Web Push for web apps and browsers: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- Waterllama feature patterns: https://waterllama.com/
- Strong Workout Tracker App Store feature list: https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577
- StrongLifts app feature patterns: https://stronglifts.com/app/
- Badger workout tracker feature patterns: https://badger.fit/
- Nishaana progressive overload/product pattern: https://nishaana.com/features/
- Water tracker app comparison notes: https://www.healthappinsider.com/en/guides/best-water-tracking-apps-2026
