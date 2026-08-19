# Goal commands triển khai EvolveFit theo epic

Cập nhật: 2026-08-19  
Nguồn: `docs/ke-hoach-hoan-thien-evolvefit.md`

## Cách dùng

Copy từng goal command bên dưới và gửi cho Codex theo thứ tự. Mỗi goal command đã bao gồm yêu cầu:

- Thực hiện trọn epic hoặc nhóm epic nhỏ.
- Đối chiếu tài liệu product/plan trước khi code.
- Sau khi hoàn thành phải chạy test đầy đủ.
- Nếu test pass thì commit và push lên GitHub trên nhánh hiện tại.
- Nếu cần thao tác thủ công như cấu hình Supabase, deploy, VAPID, OAuth key, domain, secret, hoặc approval ngoài máy local thì dừng ở trạng thái rõ ràng để user resume và cung cấp env/key cần thiết.

## Quy tắc chung cho mọi goal

Mỗi goal phải tuân theo lệnh nền sau:

```text
Bạn đang là senior DEV + BA cho EvolveFit. Trước khi làm, đọc docs/phan-tich-san-pham-va-chuc-nang-evolvefit.md và docs/ke-hoach-hoan-thien-evolvefit.md, sau đó triển khai đúng scope goal này. Không làm lệch UI mẫu trong evolve-fit. Không bỏ qua chức năng V1 hiện có. Sau khi code xong, chạy test đầy đủ: npm run build, npm test, và nếu khả dụng thì npm run smoke. Nếu tất cả pass, kiểm tra git status, commit với message rõ ràng, rồi git push lên nhánh hiện tại. Nếu gặp việc cần tôi làm thủ công như deploy, cấu hình env, OAuth, Supabase, VAPID, GitHub secret, domain hoặc secret production, hãy dừng lại, ghi rõ đang cần gì, lý do, tên env/key cần cung cấp, và trạng thái hiện tại để tôi resume.
```

## Goal 01 - Drink modules và visibility

```text
Goal: Hoàn thành Epic 1 và Epic 2 trong docs/ke-hoach-hoan-thien-evolvefit.md: Drink visibility settings và Drink contribution/hydration factor. Water phải là primary drink luôn bật; Creatine và các đồ uống/supplement khác phải là optional modules có active/enabled. Khi Creatine hoặc optional drink bị tắt, toàn bộ UI, quick action, reminder, progress card, badge liên quan phải biến mất khỏi main flow nhưng history/export vẫn giữ dữ liệu. Thêm hydrationFactor cho optional drinks, đảm bảo Water tính vào hydration target đúng, Creatine không tính ml. Cập nhật UI Settings có card “Thức uống & supplement”, cập nhật Today/Water/Progress để tôn trọng visibility. Thêm test cho visibility selector, reminder disabled rule, hydration factor và filter logs. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 02 - Reminder schedule nâng cao

```text
Goal: Hoàn thành Epic 3 trong docs/ke-hoach-hoan-thien-evolvefit.md: Reminder schedule nâng cao. Mở rộng model reminder cho fixed times, intervalHours, snoozeUntil, quiet hours và in-app fallback. Water reminder không được spam: không nhắc nếu đã đạt target, đang quiet hours, vừa log gần đây, hoặc module disabled. Creatine reminder không nhắc nếu inactive hoặc hôm nay đã taken/skipped. Cập nhật Settings UI để user chỉnh reminder mode, giờ cố định, interval, snooze và quiet hours. Thêm unit tests cho hydration reminder, creatine reminder, snooze và quiet hours. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 03 - Routine sample import và parser nâng cao

```text
Goal: Hoàn thành Epic 5 trong docs/ke-hoach-hoan-thien-evolvefit.md: Routine sample CSV/XLSX. Tạo file mẫu CSV trong public/samples/evolvefit-routine-template.csv với columns session, day, exercise, muscle group, sets, reps min, reps max, weight, rest seconds, note. Cập nhật parser CSV/XLSX để nhận alias tiếng Việt/Anh cho các cột này, hiển thị session/day trong preview, báo lỗi thiếu cột, dữ liệu sai dòng/cột và duplicate exercise trong cùng session nếu có. UI import routine phải có nút Download sample CSV, Choose CSV/XLSX, preview, Append, Replace. Thêm test parser với sample, missing column, invalid rows và duplicate detection. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 04 - Routine model chuyên nghiệp và exercise library cơ bản

```text
Goal: Hoàn thành Epic 6 và Epic 7 trong docs/ke-hoach-hoan-thien-evolvefit.md: Routine data model chuyên nghiệp và Exercise library cơ bản. Tách model routine thành Routine, WorkoutDay, RoutineExercise và ExerciseDefinition. Migration local state từ workoutExercises cũ phải giữ dữ liệu hiện có. Routine editor phải chỉnh được tên routine, số ngày tập, ngày tập, tên buổi, danh sách bài theo từng buổi và thứ tự bài. Thêm exercise library built-in cơ bản theo muscle group/equipment/movement pattern, có search/filter, add custom exercise, edit/delete custom exercise, built-in chỉ copy/customize không xóa. Cập nhật UI Workout plan mode cho rõ Plan mode là chỉnh routine, Live mode là tập. Thêm tests cho migration, selected workout day, library filter và add custom exercise. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 05 - Workout session model và history theo session

```text
Goal: Hoàn thành Epic 8 trong docs/ke-hoach-hoan-thien-evolvefit.md: Workout session model. Thêm WorkoutSession riêng gồm id, routineId, workoutDayId/sessionName, startedAt, endedAt, durationSeconds, status active/paused/finished/cancelled và sessionExerciseOrder. Workout set phải gắn sessionId. Start workout tạo session mới, finish workout cập nhật session, pause/resume toàn workout session. Workout history phải xem theo session, không trộn set của session cũ vào session mới. Giữ tương thích dữ liệu local cũ bằng migration. Thêm tests cho session duration, start/log/finish session và migration. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 06 - Session queue reorder không phá routine gốc

```text
Goal: Hoàn thành Epic 9 trong docs/ke-hoach-hoan-thien-evolvefit.md: Session queue reorder không phá routine gốc. Trong Live Workout, exercise queue phải thuộc session, không mutate routine gốc. Skip exercise đưa bài vào cuối queue hoặc trạng thái parked/skipped temporary. User có thể chọn bài khác trong queue, quay lại bài đã skip, và chỉ khi bấm Save order to routine thì routine gốc mới đổi. UI Live Workout phải thể hiện queue còn lại, completed, parked/skipped. Thêm tests cho queue reorder, skip then return exercise và save order to routine. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 07 - Progress dashboard 7/30 và PR cơ bản

```text
Goal: Hoàn thành Epic 10 và phần PR cơ bản của Epic 13 trong docs/ke-hoach-hoan-thien-evolvefit.md. Progress dashboard phải có hydration average 7/30 ngày, hydration goal hit rate, creatine consistency nếu creatine enabled, workout count tuần/tháng, volume theo tuần, volume theo muscle group, e1RM trend theo bài chính và PR list theo exercise. PR gồm max weight, max reps, estimated 1RM và volume PR; skipped set không tính PR/volume. Empty state phải rõ nếu chưa đủ dữ liệu. Thêm tests cho aggregation, PR/e1RM, hidden creatine card khi disabled. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 08 - Body metrics charts và unit conversion

```text
Goal: Hoàn thành Epic 11 trong docs/ke-hoach-hoan-thien-evolvefit.md: Body metric charts và validation. Thêm chart weight 7/30/90 ngày, chart body fat 7/30/90 nếu có dữ liệu, trend smoothing, goal weight/body fat, unit conversion kg/lb và validation từng field. UI Progress/Body metrics phải có toggle range 7/30/90, empty state và warning input sai. Thêm tests cho conversion, validation và chart dataset. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 09 - Web Push production-ready

```text
Goal: Hoàn thành Epic 4 trong docs/ke-hoach-hoan-thien-evolvefit.md: Web Push thật. Hoàn thiện subscribe/unsubscribe Web Push với VAPID env NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT; service worker nhận push event, hiển thị notification và xử lý action log/snooze; API subscribe/unsubscribe lưu subscription theo user/local profile; Settings có permission status, subscription status và test notification button; cron reminder dùng push khi đủ điều kiện, fallback in-app khi thiếu env/browser support. Nếu cần VAPID key hoặc secret mà chưa có trong env, dừng lại và yêu cầu tôi cung cấp. Sau khi cấu hình xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 10 - Import/export privacy hoàn chỉnh

```text
Goal: Hoàn thành Epic 12 trong docs/ke-hoach-hoan-thien-evolvefit.md: Import/export và privacy hoàn chỉnh. Import JSON phải có schema validation, không làm hỏng state khi file sai. Export JSON phải có metadata appVersion, exportedAt, profile/local id, schemaVersion. Thêm selective restore cho profile, hydration, workouts, body metrics, settings. Tách Delete personal data khỏi Reset demo data, mỗi flow có confirm/copy riêng. Settings privacy copy phải rõ leaderboard và dữ liệu cá nhân. Thêm tests cho import validator, migration, invalid file và selective restore. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 11 - Plate calculator và live PR notification

```text
Goal: Hoàn thành Epic 14 và phần live PR notification của Epic 13 trong docs/ke-hoach-hoan-thien-evolvefit.md. Thêm plate calculator với barbell default 20kg/15kg/custom, plate inventory và hiển thị plate mỗi bên từ target weight trong Live Workout. Khi log set tạo PR mới, hiển thị toast/badge trong Live Workout. Không tính skipped set. Thêm tests cho plate calculation và PR notification rule. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 12 - Advanced workout set types

```text
Goal: Hoàn thành Epic 15 trong docs/ke-hoach-hoan-thien-evolvefit.md: Warm-up sets, drop set, failure set và superset. Thêm set type warmup/working/drop/failure; warm-up set calculator; superset group trong routine; UI Live Workout phải tối giản, không làm chậm thao tác chính. Working volume không bị tính sai khi có warmup/drop/skipped. Thêm tests cho set type volume, warm-up suggestion và superset flow. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 13 - Reports và badge/challenge nâng cao

```text
Goal: Hoàn thành Epic 17 và Epic 18 trong docs/ke-hoach-hoan-thien-evolvefit.md. Thêm weekly/monthly reports gồm hydration average, goal hit rate, workout count, total volume, PRs, badges và trend vs previous period. Thêm badge/challenge nâng cao: hydration streak, workout consistency, volume progression; badge trạng thái active/locked/lost/disabled; badge ẩn nếu module liên quan disabled. Thêm export PDF report cơ bản nếu khả thi bằng dependency phù hợp hoặc browser print-to-PDF fallback. Thêm tests cho report aggregation, badge status và disabled module badge. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 14 - Supabase Auth và database RLS

```text
Goal: Hoàn thành Epic 19 và Epic 20 trong docs/ke-hoach-hoan-thien-evolvefit.md: Supabase Auth thật và PostgreSQL schema/RLS. Triển khai email/password sign up/sign in/sign out, Google OAuth nếu env có, auth callback và session persistence. Thiết kế migrations cho profiles, drink_modules, hydration_logs, supplements, supplement_logs, routines, workout_days, routine_exercises, exercise_library, workout_sessions, workout_sets, body_metrics, achievements, leaderboard_profiles, push_subscriptions, sync_events. Viết RLS để user chỉ đọc/ghi dữ liệu của chính mình. Nếu cần Supabase URL/anon key/service role/OAuth config hoặc thao tác dashboard thủ công, dừng lại và yêu cầu tôi cung cấp. Sau khi local/env sẵn sàng chạy test đầy đủ; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 15 - API sync batch, conflict resolution và retry thật

```text
Goal: Hoàn thành Epic 21 và Epic 22 trong docs/ke-hoach-hoan-thien-evolvefit.md. Thêm Routine CRUD API, Exercise CRUD API, Workout session start/finish/pause/resume, Workout set create/update/delete, Session reorder API, Sync batch API với idempotency key. Local sync queue phải retry thật khi online, exponential backoff, per item status. Conflict resolution: logs dùng last-write-wins, routine conflict dùng preview/confirm. Thêm Sync queue detail screen. Nếu cần backend env hoặc Supabase config chưa có, dừng lại và yêu cầu tôi cung cấp. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 16 - OpenAPI, logging, rate limit, observability

```text
Goal: Hoàn thành Epic 23 trong docs/ke-hoach-hoan-thien-evolvefit.md. Thêm OpenAPI spec cho API V1, request id, structured logs, rate limit public/auth endpoints, health/integration dashboard, error boundary và client error reporting. API docs phải sinh/đọc được từ repo. Logs truy được theo request id. Nếu cần chọn provider observability hoặc env secret, dừng lại và hỏi tôi. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 17 - AI Coach guarded

```text
Goal: Hoàn thành Epic 24 trong docs/ke-hoach-hoan-thien-evolvefit.md: AI Coach đầy đủ nhưng guarded. Rule-based insight phải chạy trước; AI insight chỉ hiện khi có đủ dữ liệu; mỗi insight phải nói rõ dựa trên dữ liệu nào, hành động đề xuất là gì, và không đưa lời khuyên y tế nguy hiểm. Thêm recommendation history, accept/reject feedback và guardrail copy. Nếu cần OpenAI/Gemini API key hoặc chọn provider, dừng lại và yêu cầu tôi cung cấp env. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 18 - Social/friend leaderboard private-first

```text
Goal: Hoàn thành Epic 25 trong docs/ke-hoach-hoan-thien-evolvefit.md. Thêm friend list, friend leaderboard private group, share badge/workout summary, privacy controls chi tiết. Mặc định không chia sẻ dữ liệu nhạy cảm; user phải opt-in trước khi publish; không chia sẻ cân nặng, body fat, chi tiết bài tập cá nhân nếu chưa có consent rõ. Thêm tests cho privacy default và opt-in sharing. Nếu cần backend/social tables/env, dừng lại và yêu cầu tôi cung cấp. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 19 - Health integration planning và permission UX

```text
Goal: Hoàn thành Epic 26 ở mức webapp-ready planning/permission UX trong docs/ke-hoach-hoan-thien-evolvefit.md. Nghiên cứu và thiết kế abstraction cho Health Connect/Apple Health, thêm settings permission screen mock/contract để user chọn loại dữ liệu được sync như weight/workout/hydration, mapping unit và privacy copy. Không sync ngầm. Nếu cần triển khai native/platform thật thì dừng lại và báo rõ giới hạn PWA, yêu cầu tôi xác nhận hướng native hoặc plugin/integration. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 20 - Native/watch decision document

```text
Goal: Hoàn thành Epic 27 trong docs/ke-hoach-hoan-thien-evolvefit.md ở dạng quyết định kỹ thuật và scaffold nếu phù hợp. Đánh giá PWA hiện tại đã đủ chưa trước khi native; nếu cần native, đề xuất React Native/Expo, shared domain logic, watch quick log/rest timer. Tạo docs/native-watch-decision.md và chỉ scaffold code nếu có lợi rõ ràng. Nếu cần tôi quyết định hướng native, dừng lại và yêu cầu xác nhận. Nếu có code thay đổi thì chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 21 - Progress photos private

```text
Goal: Hoàn thành Epic 28 trong docs/ke-hoach-hoan-thien-evolvefit.md. Thêm schema photo metadata, local/private storage abstraction, compare view, export/delete. Photos phải private mặc định; delete phải xóa metadata và file nếu storage hỗ trợ. Nếu cần storage provider/env như Supabase Storage/R2, dừng lại và yêu cầu tôi cung cấp. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 22 - Nutrition tracking decision và lightweight scaffold

```text
Goal: Hoàn thành Epic 29 trong docs/ke-hoach-hoan-thien-evolvefit.md. Tạo quyết định sản phẩm cho nutrition tracking đầy đủ: có nên đưa vào core hay tách backlog. Nếu làm lightweight scaffold, chỉ thêm food diary/macro goal contract ở mức không làm loãng hydration/workout core, không đưa vào main navigation nếu chưa đủ chất lượng. Nếu cần food database/barcode provider hoặc API key, dừng lại và yêu cầu tôi cung cấp. Sau khi xong chạy npm run build, npm test, npm run smoke nếu khả dụng; nếu pass thì commit và push lên nhánh hiện tại.
```

## Goal 23 - Final product audit

```text
Goal: Thực hiện audit cuối cùng toàn bộ dự án EvolveFit. Đọc docs/phan-tich-san-pham-va-chuc-nang-evolvefit.md, docs/ke-hoach-hoan-thien-evolvefit.md và toàn bộ code hiện tại. Lập ma trận từng epic/task: done, partial, missing, evidence, test evidence. Chạy npm run build, npm test, npm run smoke nếu khả dụng. Kiểm tra UI against evolve-fit prototype cho Today, Water, Workout, Progress, Settings. Nếu còn thiếu thì sửa các phần nhỏ còn lại; nếu còn thiếu lớn thì tạo docs/final-gap-report.md. Nếu mọi thứ pass và scope hoàn tất, commit audit/fixes và push lên nhánh hiện tại.
```

