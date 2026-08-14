# EvolveFit - Viec Can Lam Tiep Theo De Hoan Thien Du An

Cap nhat: 2026-08-14

Muc tieu cua file nay la tach ro viec co the lam ngay trong code/UI ma khong can them key, va viec can cau hinh moi truong/key se de o cuoi file.

## 0. Tien Do Thuc Hien

Cap nhat sau commit dang thuc hien:

- Da them `npm run dev:5173` va `npm run check`.
- Da them `/api/health`, API logging helper, `error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`.
- Da kiem tra runtime local: `/`, `/api/health`, `/api/integrations/status` deu tra `200`.
- Da them sync status tren header: Offline, Pending sync, Sync failed, Synced.
- Da them onboarding validation, progress label, goi y water target theo can nang/ngay tap, goi y template theo so ngay tap, va nut mo lai onboarding trong Settings.
- Da them drink type picker khi log nuoc va quan ly quick amounts pin/delete local.
- Da chuan hoa supplement log theo `supplementId`, them multi-schedule local bang `scheduleHours`, active toggle, taken/skipped.
- Da them exercise edit form day du hon: name, muscle group, sets, reps min/max, weight, rest seconds, last session.
- Da them body metrics form day du hon: weight, body fat, waist, chest, arm, thigh, note.
- Da them offline retry local khi online, preview/clear queue trong Settings.
- Da them CSV export theo dataset, JSON import va reset local co confirm.
- Da them auth session cookie helpers va `/api/auth/callback` cho Supabase session token callback.
- Da chay `npm run check` pass: 42 tests, lint pass, build pass.

## 1. Uu Tien Cao - Khong Can Them Key


### 1.2. Sua va nang cap UX/UI tong the

Van de hien tai:

- UI da co mobile-first nhung nhieu card con day thong tin, control nho, layout supplement/workout chua that su muot.
- Chua co visual hierarchy ro giua quick actions, status va phan cau hinh.
- Mot so text tieng Viet can audit encoding/hien thi trong terminal va browser.

Viec can lam:

- Rasoat lai tung tab bang mobile viewport 390x844 va desktop 1024x768.
- Tach Today thanh cac section gon hon: hydration hero, quick actions, supplement status, workout today, recent activity.
- Giam so control hien cung luc trong supplement list; dua edit nang cao vao expandable row hoac modal/bottom sheet.
- Them loading, empty, error state cho tung tab.
- Them sync status ro tren header: `Offline`, `Pending sync`, `Synced`, `Sync failed`.
- Chuan hoa icon buttons bang lucide thay cho text nhu `-g`, `+g`, `On/Off` neu co icon phu hop.
- Them focus state, disabled state, hover/active state nhat quan.
- Kiem tra text khong bi tran tren nut/card o mobile.

### 1.3. Onboarding hoan chinh local-first

Da co:

- Wizard local-first cho account/units, body/water/timezone, workout template/ngay tap, wake-sleep/creatine.
- Hoan tat onboarding tao body metric ban dau va enqueue sync.

Can lam tiep:

- Them validation tung buoc: email hop le, water target trong nguong, wake/sleep hour hop le, it nhat 1 workout day.
- Goi y water target theo can nang.
- Goi y template theo so ngay tap da chon.
- Cho user skip auth va tiep tuc local mode ro rang.
- Them progress label 1/4, 2/4 thay vi chi dung dot so.
- Them nut quay lai onboarding trong Settings.

### 1.4. Hydration tracking

Da co:

- Quick log, slider, pin quick amount, undo, sua/xoa log trong timeline.
- Route `/hydration` co filter va chart theo gio local-first.

Can lam tiep:

- Them drink type picker khi log: water, coffee, tea, other.
- Quan ly quick amounts day du: pin/unpin, sap xep, xoa preset.
- Them chart 7/30 ngay va average intake.
- Them hydration goal suggestion theo can nang, wake/sleep, workout day.
- Them hydration detail richer analytics: gio hay thieu nuoc, streak, missed target reason.

### 1.5. Supplement tracking

Da co:

- Creatine default, custom supplements, edit nhanh, reminder hour rieng, active toggle, taken/skipped.

Can lam tiep:

- Tach creatine khoi custom list hoac gom thanh mot model nhat quan.
- Them multi-schedule cho supplement: mot hoac nhieu gio nhac trong ngay.
- Them status `pending/taken/skipped` tinh theo tung supplement trong ngay, khong dua tren ten neu user doi ten.
- Them ly do skipped optional va analytics bo qua lien tiep.
- Them reminder suggestion: neu skip 3 lan lien tiep, goi y doi gio nhac.
- Them API/local adapter test cho supplement status va reminder schedule.

### 1.6. Workout planner va live workout

Da co:

- Routine templates, exercise library local, them/xoa/sap xep, live set logging, rest timer, Wake Lock.

Can lam tiep:

- Form edit exercise day du: name, muscle group, equipment, sets, reps min/max, weight, rest seconds.
- Routine builder day du: tao/sua/xoa routine, gan ngay tap, chon active routine.
- Drag/drop hoac reorder gesture mobile-friendly.
- Finish workout flow: summary, duration, total volume, PRs, note.
- Skip exercise, replace exercise, deload marker.
- Workout history theo ngay/buoi, khong chi la list sets tong.
- Rest timer notification local va action quick resume.
- Plate calculator va warm-up calculator.

### 1.7. Body metrics va progress

Da co:

- Body metrics local cho weight/body fat, sua nhanh, xoa, timeline co ban.

Can lam tiep:

- Form metric day du: weight, body fat, waist, chest, arm, thigh, note.
- Chart body weight va body fat 7/30/90 ngay.
- PR list workout: max weight, max reps, estimated 1RM theo exercise.
- Volume theo muscle group/tuan.
- Consistency calendar/heatmap.
- Correlation hydration vs workout performance.
- Export progress report tuan cho PT.

### 1.8. Offline sync va data layer

Da co:

- localStorage, service worker cache co ban, sync queue local.

Can lam tiep:

- Retry worker cho pending queue khi online tro lai.
- Idempotency key cho moi mutation sync.
- Conflict resolution: last-write-wins cho log don gian, merge strategy cho routines.
- Sync queue UI co retry tung item, clear failed, xem payload tom tat.
- Chuyen cac mutation UI sang API client/data adapter nhat quan.
- Test offline/online transition bang unit/integration tests.

### 1.9. Data export va privacy

Can lam:

- Export JSON hien co can tach theo dataset va version schema.
- Them CSV export cho hydration, supplements, workouts, body metrics.
- Them import JSON de restore local data.
- Them delete local data co confirm.
- Them privacy copy ro cho leaderboard opt-in va AI data usage.

### 1.10. Test coverage va quality gates

Can lam:

- Them component tests cho onboarding wizard, supplement taken/skipped, Settings notification toggles.
- Them API tests cho auth/session, integration status, supplement log.
- Them Playwright smoke tests: `/`, `/hydration`, tab navigation, quick log, complete set.
- Them visual smoke screenshots mobile/desktop de bat loi layout.
- Them script `npm run check` gom lint, test, build.

## 2. Uu Tien Trung Binh - Khong Can Them Key

- Them `src/app/loading.tsx`, skeleton loading cho cac route.
- Them `not-found.tsx` va empty state tot hon.
- Chuan hoa Vietnamese UI copy va encoding.
- Chuan hoa domain model supplement de khong match log bang `name`.
- Tach core logic thanh package/folder reusable cho mobile sau nay.
- Them feature flags local cho AI/push/backend sync.
- Them changelog/release notes trong docs.

## 3. Viec Can Ban Cau Hinh Moi Truong Hoac Lay Key

Dat nhom nay sau cung vi can thao tac ngoai codebase hoac lay secret tu provider.

### 3.1. Supabase production

Ban can cau hinh/cung cap:

- Supabase project URL tren moi truong deploy.
- Supabase anon key tren moi truong deploy.
- Supabase service role key tren moi truong server-only.
<!-- - Chay migration `supabase/migrations/0001_initial_schema.sql` tren Supabase project. --> "đã chạy rồi"
- Cau hinh Auth providers: Email/password, Google OAuth.
- Cau hinh Site URL va Redirect URLs cho deployment URL.

Sau khi co:

- Hoan thien OAuth callback route va session cookie production.
- Chuyen data adapter sang Supabase persistence that.
- Test RLS owner access voi user that.

### 3.2. Web Push production

Ban can cau hinh/cung cap:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- Deployment HTTPS URL

Sau khi co:

- Test notification tren Chrome Android.
- Test iOS Home Screen PWA neu thiet bi ho tro.
- Them unsubscribe/re-subscribe handling that.

### 3.3. AI provider production

Ban can cau hinh/cung cap it nhat mot provider:

- `GEMINI_API_KEY`
- Hoac `OPENAI_API_KEY`

Sau khi co:

- Hoan thien JSON schema/prompt cho AI coach.
- Them guardrail khong tu dong thay doi lich neu user chua accept.
- Them audit trail cho input/output AI.

### 3.4. Vercel/Cron/deployment

Ban can cau hinh/cung cap:

- `CRON_SECRET` tren deployment.
- Tat ca env vars production tu `.env.example`.
- Domain/URL production.
- Access vao logs neu can debug 500 production.

Sau khi co:

- Kiem tra cron hydration, creatine, monthly achievements.
- Kiem tra route `/api/integrations/status` tren production.
- Kiem tra server logs cho loi 500 thuc te.

### 3.5. Mobile/native sau MVP

Can quyet dinh sau:

- Expo project setup.
- Apple Developer/Google Play accounts neu publish.
- HealthKit/Google Fit permissions va app registration.
- Push provider strategy cho native app.

## 4. Thu Tu Lam De Hop Ly

1. Sua dev workflow va them error boundary/health endpoint.
2. Rasoat UI mobile va sua cac layout xau nhat tren Today/Workout/Settings.
3. Hoan thien onboarding validation va Settings quay lai onboarding.
4. Hoan thien supplement model/status theo id, multi-schedule local.
5. Hoan thien exercise/body metric edit forms.
6. Them offline retry worker va sync queue controls.
7. Them CSV/JSON import-export.
8. Them Playwright smoke tests.
9. Khi ban cau hinh xong Supabase/Web Push/AI/deploy env, bat dau gan production backend.
