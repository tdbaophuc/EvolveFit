# Phân tích sản phẩm và hệ chức năng EvolveFit

Cập nhật: 2026-08-19  
Vai trò phân tích: Senior Developer + Business Analyst

## 1. Tóm tắt định vị sản phẩm

EvolveFit nên được định vị là một webapp/PWA hỗ trợ người tập gym quản lý các thói quen cốt lõi hằng ngày:

- Uống nước và supplement cơ bản, trong đó nước là hành vi chính.
- Tập luyện theo routine, log từng set, rest timer và theo dõi tiến độ.
- Body metrics, thành tựu, leaderboard private-first.
- Offline-first local state, có sync queue để sẵn sàng mở rộng backend.

Điểm khác biệt nên theo đuổi: EvolveFit không nên cố trở thành app nutrition lớn như MyFitnessPal, cũng không nên trở thành mạng xã hội fitness nặng như Hevy ở giai đoạn đầu. EvolveFit nên là một daily fitness cockpit: mở app là biết hôm nay cần uống gì, tập gì, đã hoàn thành đến đâu, và thao tác log phải nhanh.

## 2. Sản phẩm thực tế tham chiếu

### 2.1. Hevy

Hevy là sản phẩm gần nhất cho mảng workout tracking. Các điểm đáng học:

- Workout logging là trung tâm: set, reps, weight, RPE, rest timer, previous performance.
- Routine builder rõ ràng, có template và custom routine.
- Progress tracking có PR, estimated 1RM, volume, muscle group chart, consistency.
- Có exercise library, custom exercise, social/leaderboard, multi-device.

Nguồn tham chiếu:

- https://www.hevyapp.com/features/
- https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2025-Features-Guide

### 2.2. WaterMinder

WaterMinder là sản phẩm tham chiếu tốt cho hydration:

- Nước là đối tượng chính, không bị lẫn với các thứ khác.
- Có daily goal, quick log, custom cup/amount, reminders, history, achievements.
- Có biểu đồ theo thời gian, layout có thể cá nhân hóa, widget/watch giúp log nhanh.
- Nhấn mạnh habit loop: reminder -> drink -> tap to log -> progress feedback.

Nguồn tham chiếu:

- https://waterminder.com/
- https://blog.waterminder.com/tips/20-features-that-will-make-you-fall-in-love-with-the-waterminder-app/

### 2.3. MyFitnessPal

MyFitnessPal là tham chiếu về app health lớn, đặc biệt ở cách gom hành vi hằng ngày vào Today:

- Today tab đưa các hành vi quan trọng ra trước.
- Có goal theo ngày, streak, diary, water/exercise/steps trong healthy habits.
- Premium có tùy biến mục tiêu theo gram/percentage, different goals by day.

Nguồn tham chiếu:

- https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Introducing-the-brand-new-Today-tab
- https://support.myfitnesspal.com/hc/en-us/articles/360032625951-What-are-the-features-of-MyFitnessPal-Premium

## 3. Nguyên tắc sản phẩm cho EvolveFit

### 3.1. Nguyên tắc trải nghiệm

- Today chỉ là overview ngắn, không chứa toàn bộ chức năng.
- Hydration và Workout phải là hai khu vực riêng.
- Tác vụ log lặp lại phải hoàn thành trong 1-2 chạm.
- Khi người dùng đang tập, UI phải chuyển sang focus mode.
- Các tính năng optional phải tắt được và khi tắt thì không làm rối UI.
- Offline-first: mọi log quan trọng phải lưu local trước, sync sau.
- Dữ liệu cá nhân như cân nặng/body fat/workout detail mặc định private.

### 3.2. Nguyên tắc kỹ thuật

- Local state/localStorage là lớp hoạt động tối thiểu.
- Sync queue dùng idempotency key để chống ghi trùng.
- API contract nên tồn tại song song với local flow để sau này thay data adapter dễ.
- Data model phải tách rõ: hydration log, supplement log, workout set, routine, body metric.
- UI không nên phụ thuộc backend online để thao tác hằng ngày.

## 4. Bản đồ chức năng tổng thể

Các trạng thái trong bảng:

- Đang có: đã xuất hiện trong code/app hiện tại.
- Sẽ có: cần hoàn thiện để đạt V1 chuyên nghiệp.
- Nên có: nên đưa vào V1.1/V2 hoặc backlog chất lượng cao.

## 5. Account, profile và onboarding

### Đang có

- Profile local gồm name, email, authMode, timezone, unitWeight, unitVolume.
- Onboarding nhiều bước: thông tin cơ bản, unit, body, water target, creatine, lịch tập.
- Validation cơ bản: email, water target, giờ ngủ/dậy, số ngày tập.
- Có local/demo mode, email mode, google mode ở mức UI/contract.

### Sẽ có

- Luồng auth thật bằng Supabase email/password.
- Google OAuth thật khi Supabase Auth sẵn sàng.
- Profile edit đầy đủ trong Settings, không chỉ một vài field.
- Re-run onboarding có kiểm soát: không mất dữ liệu đã log.
- Gợi ý water target và routine theo profile phải hiển thị giải thích rõ.

### Nên có

- Multi-profile hoặc household mode không cần thiết ở V1.
- Export profile setting riêng.
- Account deletion flow có xác nhận nhiều bước.
- Audit log thay đổi các field nhạy cảm.

### UX/UI chuẩn

- Onboarding nên có progress indicator 1/5, 2/5.
- Các bước phải ngắn, mỗi màn chỉ hỏi một nhóm thông tin.
- Settings không nên biến thành form dài; nên chia thành card: Profile, Goals, Notifications, Privacy, Data.

## 6. Hydration và hệ đồ uống

Đây là phần cần thiết kế kỹ vì người dùng nêu đúng vấn đề: nước là thức uống chính, còn creatine và các đồ uống khác là optional.

### 6.1. Mô hình phân loại đồ uống

Nên chia thành 3 tầng:

1. Primary drink: Water
2. Active supplements/drinks: Creatine, electrolyte, coffee, tea, protein shake nếu user bật
3. Archived/disabled drinks: không hiển thị trong flow chính

Water phải luôn xuất hiện vì đây là core habit. Creatine mặc định có thể bật trong onboarding, nhưng người dùng phải có quyền tắt. Khi tắt creatine:

- Không hiện card creatine ở Today.
- Không hiện reminder creatine.
- Không hiện quick log creatine.
- Không tính creatine consistency trong progress.
- Không hiện badge creatine hoặc chuyển badge sang trạng thái disabled/hidden.
- Dữ liệu cũ vẫn lưu trong history/export.

### 6.2. Đang có

- Hydration total, percent, expected progress by wake/sleep hour.
- Quick amount tối đa 3 theo usage/pinned.
- Custom amount bằng slider/stepper.
- Log nước, sửa +/-50ml, xóa log, undo.
- Hydration detail screen và tab Water đã có layout giống UI mẫu: hero, ring, quick log, custom modal, chart theo giờ, history, reminder toggle, goal row.
- Creatine log, amount, reminder config cơ bản, trạng thái đã log/chưa log/bỏ qua.
- Supplement list có active flag, default amount, schedule hours.

### 6.3. Sẽ có

- Drink settings riêng:
  - Water: daily target, quick amounts, reminder schedule.
  - Creatine: enabled/disabled, target dose, reminder time, skip state.
  - Other drinks: optional, chỉ bật khi user cần.
- Drink visibility rule:
  - `active = false`: không hiện ở Today, Water screen quick action, reminders, progress cards.
  - `active = true`: hiện trong khu vực phù hợp.
- Drink contribution rule:
  - Water luôn tính vào hydration target.
  - Coffee/tea/electrolyte có thể có hydration factor nếu mở rộng.
  - Creatine không tính ml, chỉ tính gram supplement.
- Reminder rule:
  - Không nhắc nếu disabled.
  - Không nhắc nếu quiet hours.
  - Không nhắc nếu vừa log gần đây.
  - Không nhắc creatine lại nếu hôm nay đã taken/skipped.

### 6.4. Nên có

- Custom drink type với icon, màu, unit, goal, reminder riêng.
- Hydration factor cho từng loại đồ uống.
- Weather-based water target.
- Weekly hydration calendar.
- Smart suggestion: nếu thiếu nước buổi chiều, gợi ý lượng vừa đủ để bắt kịp.

### 6.5. UX/UI đề xuất chi tiết cho đồ uống

#### Today overview

Today chỉ nên hiện:

- Card Water lớn nhất hoặc action card đầu tiên.
- Card Creatine nhỏ chỉ khi creatine enabled.
- Nếu có nhiều optional drink, Today không hiện hết; chỉ hiện alert/action cần làm hôm nay.

Cấu trúc:

- Water action: `1,500 / 2,500 ml`, ring/percentage, nút `+250ml`.
- Creatine action: `Chưa log hôm nay`, nút `Log 5g`, chỉ hiện nếu active.
- Nếu user tắt creatine: card biến mất, layout tự co lại.

#### Water screen

Water screen nên có thứ tự:

1. Hero progress: tổng nước hôm nay, target, % và trạng thái pace.
2. Quick log: tối đa 3 amount + Custom.
3. Chart theo giờ.
4. History hôm nay với edit/delete.
5. Settings card: target, reminder, quick amount manager.

Không nên để supplement custom chen lên trên phần water history, vì làm loãng mục tiêu chính.

#### Drink/Supplement settings

Nên có card `Thức uống & supplement`:

| Item | Toggle | Unit | Goal | Hiển thị |
|---|---|---:|---:|---|
| Water | Luôn bật | ml | cài đặt ban đầu( có thể sửa trong cài đặt)/day | Today + Water |
| Creatine | User bật/tắt | g | 5/day | cài đặt ban đầu( có thể sửa trong cài đặt)/day |
| Coffee | User bật/tắt | ml/cup | optional | chỉ history nếu bật |
| Electrolyte | User bật/tắt | ml | optional | chỉ khi bật |

Khi toggle off:

- Ẩn quick actions.
- Ẩn reminder.
- Ẩn progress card.
- Giữ history trong `Archived logs`.

#### Visual hierarchy

- Water dùng màu chính ổn định: xanh lá/xanh nước.
- Creatine dùng màu supplement nhẹ: vàng/amber.
- Coffee/tea dùng màu trung tính, không cạnh tranh với water.
- Không dùng cùng kích thước card cho mọi loại; water phải lớn hơn.

## 7. Routine, exercise library và import lịch tập

### Đang có

- Routine templates: PPL, Upper/Lower, Full Body, Custom.
- Routine editor: thêm/sửa/xóa/sắp xếp bài.
- Mỗi bài có sets, reps min/max, target weight, rest, muscle group, last session.
- Import CSV/XLSX có preview, validation dòng/cột, append/replace.
- Export CSV theo dataset đã có ở Settings.

### Sẽ có

- File mẫu CSV/XLSX cho routine import.
- Parser nên nhận các cột V1: session, day/weekday, exercise, muscle group, sets, reps min, reps max, weight, rest seconds, note.
- Data model nên tách routine -> workout day/session -> exercises.
- Exercise library cơ bản với default muscle group, equipment, movement pattern.
- Custom exercise có phân biệt với built-in exercise.

### Nên có

- Duplicate routine.
- Routine folders.
- Import mapping screen nếu file có tên cột khác chuẩn.
- Detect lỗi nâng cao: duplicate exercise, rest quá thấp, reps min > reps max.
- Warm-up set calculator, plate calculator.

### UX/UI chuẩn

- Routine editor không nên xuất hiện trong Live Workout focus mode nếu không cần.
- Plan mode: chỉnh routine.
- Live mode: chỉ thao tác tập.
- Import flow nên là 3 bước: chọn file -> preview/validation -> append/replace.

## 8. Live Workout

### Đang có

- Start workout, finish workout, finished screen.
- Active exercise theo routine.
- Log set với weight, reps, RPE.
- Auto rest timer sau mỗi set.
- Timer có pause/resume, +/-15s, reset, notification khi hết giờ nếu permission granted.
- Skip exercise.
- Skip set.
- Edit/delete set đã ghi.
- Workout queue cho phép chọn bài khác trong lúc tập.
- Wake lock khi ở tab workout nếu browser hỗ trợ.

### Sẽ có

- Session object riêng: startAt, endAt, duration, status.
- Skip exercise không chỉ tăng index mà nên đưa bài vào cuối queue tạm thời.
- Reorder trong session không làm thay đổi routine gốc, trừ khi user chọn lưu thứ tự mới.
- Edit last set nên có UI nhanh hơn, không chỉ ở history.
- Pause/resume toàn workout session.

### Nên có

- Warm-up sets, drop sets, failure sets.
- Superset.
- Live PR notification.
- Plate calculator.
- Exercise note trong session.
- RPE optional default hidden nếu user không dùng.

### UX/UI chuẩn

- Live screen cần sticky header: thoát, tên buổi, bài hiện tại, progress bar.
- Card chính chỉ hiển thị bài hiện tại và last performance.
- Stepper weight/reps phải lớn, dễ bấm bằng ngón cái.
- Rest timer phải rõ ràng, không nằm lẫn trong card dài.
- Nút `Hoàn thành set` luôn sticky dưới cùng.

## 9. Progress dashboard

### Đang có

- Tổng nước hôm nay.
- Workout volume.
- e1RM tốt nhất.
- Body metrics timeline.
- Badge monthly cơ bản.
- Chart volume/training và body metric cơ bản.

### Sẽ có

- Hydration average 7/30 ngày.
- Tỷ lệ đạt mục tiêu nước.
- Creatine consistency nếu creatine enabled.
- Workout count tuần/tháng.
- Volume theo tuần.
- Volume theo muscle group.
- PR list theo exercise.
- e1RM trend theo bài chính.

### Nên có

- Calendar heatmap.
- Insight engine rule-based trước AI.
- Compare current week vs previous week.
- Export progress report PDF.

### UX/UI chuẩn

- Progress là nơi xem xu hướng, không phải nơi log nhanh.
- Mỗi card phải có câu trả lời rõ: “Tôi đang tốt lên ở đâu?”.
- Nếu chưa đủ dữ liệu, hiển thị empty state có hành động: “Log 3 buổi để mở trend”.

## 10. Body metrics

### Đang có

- Weight, height, body fat, waist, chest, arm, thigh, note.
- Add, edit, delete metric.
- Timeline cơ bản.

### Sẽ có

- Chart 7/30/90 ngày cho weight.
- Chart body fat nếu có dữ liệu.
- Measurement unit conversion kg/lb.
- Validation từng field.

### Nên có

- Progress photo không thuộc V1 chính, chỉ nên chuẩn bị schema sau.
- Trend smoothing.
- Goal weight/body fat.

## 11. Achievements và leaderboard

### Đang có

- Monthly achievements cơ bản.
- Leaderboard visibility mặc định false.
- Privacy copy nói chỉ hiển thị dữ liệu tối thiểu.

### Sẽ có

- Badge trạng thái active/locked/lost.
- Điều kiện badge minh bạch.
- Leaderboard opt-in thật qua API.
- Score không dựa trên dữ liệu nhạy cảm.

### Nên có

- Friend leaderboard.
- Challenge theo tháng.
- Anti-abuse nếu có public leaderboard lớn.

### UX/UI chuẩn

- Badge locked không nên làm user thấy thất bại; nên hiển thị progress còn thiếu.
- Leaderboard phải luôn có copy: “Không chia sẻ cân nặng, body fat, chi tiết bài tập”.

## 12. Notifications

### Đang có

- Request notification permission.
- Hydration reminder rule.
- Creatine reminder rule.
- Rest timer notification.
- Service worker và API subscription contract.
- Quiet hours flag.

### Sẽ có

- Subscribe/unsubscribe Web Push thật.
- Snooze UI và snooze state rõ.
- Reminder schedule nhiều thời điểm trong ngày.
- Lặp mỗi N giờ.
- In-app fallback nếu push chưa khả dụng.

### Nên có

- Notification center trong app.
- Per-drink reminder.
- Smart reminders theo hành vi log thực tế.

## 13. Offline, sync và dữ liệu

### Đang có

- Local-first state.
- LocalStorage.
- Sync queue pending/synced/failed.
- Retry/mark synced, mark failed, clear queue.
- Các mutation chính enqueue sync.

### Sẽ có

- Idempotency key hiển thị rõ trong queue item.
- Retry API thật khi online.
- Conflict resolution:
  - logs dùng last-write-wins.
  - routine conflict dùng preview/confirm.
- Sync status per item.

### Nên có

- Background sync nếu browser hỗ trợ.
- Retry exponential backoff.
- Local database IndexedDB thay vì chỉ localStorage khi dữ liệu lớn.

## 14. Import/export và privacy

### Đang có

- Export JSON toàn bộ state.
- Import JSON restore state.
- Export CSV theo dataset: hydration, creatine, workouts, body metrics.
- Reset local data có confirm.

### Sẽ có

- Xóa dữ liệu cá nhân có confirm riêng với copy rõ hơn reset demo.
- Import JSON cần schema validation.
- Export metadata: app version, exportedAt, user id/local profile.
- Routine sample CSV/XLSX.

### Nên có

- Selective restore.
- Password-protected export không cần ở V1.
- PDF progress report.

## 15. Backend và API

### Đang có

- API routes cho health, auth/session, hydration, supplements, workouts, achievements, leaderboard, notifications, progression, integrations.
- Supabase adapter/integration contract.
- Cron route contract.
- Tests cho API/core/integrations/push.

### Sẽ có

- Supabase Auth thật.
- PostgreSQL tables + RLS.
- User chỉ đọc/ghi dữ liệu của chính mình.
- Service role chỉ server-side.
- Cron secret validation production-ready.
- API cho routine CRUD/session start-finish/reorder.

### Nên có

- OpenAPI spec.
- Request id / structured logs.
- Rate limit public endpoints.
- Observability dashboard.

## 16. Ma trận ưu tiên triển khai

### P0 - bắt buộc để app dùng được hằng ngày

- Hydration screen chuẩn UI mẫu.
- Water quick log/custom log/edit/delete/undo.
- Creatine enable/disable và log/skip.
- Routine template/editor.
- Live workout set logging + rest timer.
- Offline-first + sync queue.
- Export/import JSON.

### P1 - để đạt V1 chuyên nghiệp

- Drink visibility settings.
- Routine sample CSV/XLSX.
- Workout session model riêng.
- Session queue reorder không phá routine gốc.
- Progress dashboard 7/30 ngày.
- Body metric charts.
- Web Push subscribe/unsubscribe thật.
- Dataset CSV export.

### P2 - tăng độ cạnh tranh

- PR list, live PR notification.
- Exercise library giàu dữ liệu hơn.
- Plate calculator.
- Hydration factor theo drink type.
- Weekly/monthly reports.
- Challenge/badge nâng cao.

### P3 - sau V1

- AI coach đầy đủ.
- Social feed.
- Health Connect/Apple Health.
- Native mobile/watch app.
- Progress photos.
- Nutrition tracking đầy đủ.

## 17. Acceptance criteria cho webapp chuyên nghiệp

EvolveFit có thể xem là đạt chuẩn V1 khi:

- Người dùng mới onboard xong trong dưới 3 phút.
- Log nước phổ biến trong 1 chạm, custom log trong tối đa 3 chạm.
- Nếu creatine disabled, không còn UI/reminder/progress liên quan xuất hiện ở flow chính.
- Người dùng import routine CSV/XLSX, xem preview lỗi, append/replace được.
- Người dùng bắt đầu workout, log set, sửa set, skip set, skip bài, dùng rest timer.
- Rest timer có pause/resume, +/-15s, notification khi hết giờ nếu được cấp quyền.
- Progress dashboard trả lời được: hydration, creatine, workout, body metrics đang tiến triển thế nào.
- Offline vẫn log được nước, creatine và workout set.
- Sync queue thể hiện pending/synced/failed và có thao tác retry/clear.
- Export/import dữ liệu cá nhân hoạt động.
- Leaderboard mặc định private và chỉ bật khi user opt-in.

## 18. Kết luận BA + DEV

EvolveFit nên tập trung vào một sản phẩm hẹp nhưng hoàn thiện: hydration + supplement tối giản + workout logging. Cạnh tranh thực tế không nằm ở việc có thật nhiều module, mà nằm ở việc mỗi thao tác hằng ngày nhanh, rõ, không gây nhiễu.

Đề xuất quan trọng nhất cho UX đồ uống: Water là primary, creatine và các đồ uống khác là optional modules. Mọi optional module phải có toggle active/inactive; khi inactive, toàn bộ quick action, reminder, progress card và badge liên quan phải biến mất khỏi main flow nhưng dữ liệu lịch sử vẫn được giữ để export hoặc xem lại.

