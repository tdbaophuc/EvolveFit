# Kế hoạch hoàn thiện EvolveFit theo phân tích sản phẩm

Cập nhật: 2026-08-19  
Nguồn đầu vào: `docs/phan-tich-san-pham-va-chuc-nang-evolvefit.md`  
Mục tiêu: hoàn thành toàn bộ nhóm chức năng **sẽ có** và **nên có** để EvolveFit trở thành một webapp/PWA fitness chuyên nghiệp, có thể dùng thực tế hằng ngày.

## 1. Nguyên tắc triển khai

### 1.1. Định hướng sản phẩm

EvolveFit không đi theo hướng nutrition app quá rộng hoặc mạng xã hội fitness quá nặng. Sản phẩm tập trung vào:

- Hydration là habit chính.
- Creatine và các đồ uống/supplement khác là optional modules.
- Workout logging là workflow chuyên sâu thứ hai.
- Progress dashboard trả lời được người dùng đang tốt lên ở đâu.
- Offline-first, sync-ready, privacy-first.

### 1.2. Nguyên tắc kỹ thuật

- Mọi thao tác hằng ngày phải hoạt động offline trước.
- Backend/Supabase là lớp đồng bộ, không là điều kiện để log.
- Data model phải tách rõ domain: drinks, supplement, routine, workout session, workout set, metrics, achievements.
- Các optional module phải có `active/enabled` và UI phải tôn trọng trạng thái này.
- Mỗi epic phải có test unit/integration hoặc smoke test tương ứng.

### 1.3. Definition of Done chung

Một chức năng chỉ xem là xong khi:

- Có data model hoặc API contract rõ.
- Có UI hoàn chỉnh trên mobile và desktop.
- Có state empty/loading/error nếu phù hợp.
- Có validation đầu vào.
- Có local-first persistence.
- Có sync queue nếu là mutation quan trọng.
- Có test hoặc smoke flow kiểm chứng.
- Không phá `npm run build` và `npm test`.

## 2. Roadmap tổng thể

| Phase | Mục tiêu | Nhóm chức năng |
|---|---|---|
| Phase 1 | Hoàn thiện V1 chuyên nghiệp | Drink visibility, routine sample import, workout session model, progress 7/30, body charts, web push thật, dataset CSV |
| Phase 2 | Tăng độ cạnh tranh | PR list, exercise library mở rộng, plate calculator, hydration factor, reports, challenge/badge |
| Phase 3 | Nền tảng backend production | Supabase Auth, PostgreSQL RLS, routine/session API, sync retry thật, OpenAPI, logging |
| Phase 4 | Mở rộng sản phẩm | AI coach, social feed, Health Connect/Apple Health, native/watch, progress photos, nutrition đầy đủ |

## 3. Phase 1 - Hoàn thiện V1 chuyên nghiệp

Phase này là phần bắt buộc để EvolveFit đạt chuẩn một webapp thực tế.

### Epic 1. Drink visibility settings

#### Mục tiêu

Biến đồ uống/supplement thành hệ module tùy chọn. Water luôn là primary, Creatine và các loại khác có thể bật/tắt.

#### Tasks

- Mở rộng data model:
  - `DrinkType` hoặc `DrinkModule`.
  - `id`, `name`, `category`, `unit`, `active`, `goal`, `color`, `icon`, `hydrationFactor`, `reminderEnabled`.
- Tách Water khỏi generic supplement:
  - Water luôn active.
  - Water dùng unit `ml`.
  - Water luôn hiện ở Today và Water screen.
- Chuẩn hóa Creatine:
  - Creatine là optional supplement.
  - Có `active`.
  - Có dose goal theo `g/day`.
  - Có trạng thái hôm nay: not logged, taken, skipped.
- Tạo Settings card `Thức uống & supplement`.
- Khi user tắt creatine:
  - Ẩn card creatine ở Today.
  - Ẩn quick log creatine ở Water/Hydration.
  - Không gửi reminder creatine.
  - Không tính creatine consistency trong Progress.
  - Không hiện badge creatine trong main dashboard.
- Lưu log cũ để vẫn export/history được.

#### Acceptance criteria

- Tắt creatine làm toàn bộ UI/reminder/progress liên quan biến mất khỏi flow chính.
- Bật lại creatine khôi phục card/action/reminder.
- Water không thể bị tắt.
- Build/test pass.

#### Tests

- Unit test visibility selector.
- Unit test reminder rule khi `active=false`.
- UI smoke: toggle creatine off/on.

### Epic 2. Drink contribution và hydration factor

#### Mục tiêu

Chuẩn bị cho đồ uống khác ngoài nước nhưng vẫn giữ Water là chính.

#### Tasks

- Thêm `hydrationFactor` cho drink type:
  - Water: `1`.
  - Coffee/tea: configurable, mặc định không hiện.
  - Electrolyte: `1`.
  - Creatine: không tính ml, category supplement.
- Cập nhật hydration total:
  - `effectiveHydrationMl = amountMl * hydrationFactor`.
  - UI vẫn hiển thị raw log và effective contribution nếu cần.
- Thêm optional drinks:
  - Coffee.
  - Tea.
  - Electrolyte.
  - Protein shake.
- UI Water screen:
  - Primary quick log chỉ cho Water.
  - Optional drink nằm trong modal/custom section nếu active.
- History:
  - Có filter Water/All/Other active drinks.

#### Acceptance criteria

- Coffee/tea không xuất hiện nếu user chưa bật.
- Bật Coffee cho phép log nhưng không làm UI chính rối.
- Hydration total dùng contribution rule đúng.

#### Tests

- Unit test hydration factor.
- Unit test filter logs.
- Integration test log optional drink.

### Epic 3. Reminder schedule nâng cao

#### Mục tiêu

Hoàn thiện reminder theo lịch cố định, lặp mỗi N giờ, quiet hours và snooze.

#### Tasks

- Mở rộng reminder model:
  - `mode`: fixed times hoặc interval.
  - `times`: danh sách giờ.
  - `intervalHours`.
  - `snoozeUntil`.
  - `quietHoursEnabled`.
- Water reminder:
  - Không nhắc nếu vừa log gần đây.
  - Không nhắc nếu đã đạt target.
  - Không nhắc trong quiet hours.
- Creatine reminder:
  - Không nhắc nếu inactive.
  - Không nhắc nếu taken/skipped hôm nay.
  - Hỗ trợ remind before minutes.
- UI Settings:
  - Toggle.
  - Fixed time chips.
  - Interval selector.
  - Snooze button.
- In-app reminder fallback nếu Push chưa khả dụng.

#### Acceptance criteria

- Reminder rule hoạt động không spam.
- Snooze tắt nhắc đến đúng thời điểm.
- Quiet hours được tôn trọng.

#### Tests

- Unit test shouldSendHydrationReminder.
- Unit test shouldSendCreatineReminder.
- Unit test snooze + quiet hours.

### Epic 4. Web Push thật

#### Mục tiêu

Hoàn thiện subscribe/unsubscribe Web Push production-ready.

#### Tasks

- Kiểm tra VAPID env:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
  - `VAPID_PRIVATE_KEY`.
  - `VAPID_SUBJECT`.
- Service worker:
  - Nhận push event.
  - Hiển thị notification.
  - Xử lý action log/snooze.
- API:
  - Subscribe.
  - Unsubscribe.
  - Store subscription theo user/local profile.
- UI Settings:
  - Permission status.
  - Subscribe/unsubscribe status.
  - Test notification button.
- Cron:
  - Hydration reminders.
  - Creatine reminders.
  - Monthly achievements.

#### Acceptance criteria

- User bật push và nhận được test notification.
- Unsubscribe xong không còn gửi.
- Nếu thiếu VAPID, UI hiển thị fallback/in-app mode.

#### Tests

- Unit test push payload.
- API route test subscribe/unsubscribe.
- Smoke test Settings notification state.

### Epic 5. Routine sample CSV/XLSX

#### Mục tiêu

Hoàn thiện import routine có file mẫu, parser cột V1 và preview rõ.

#### Tasks

- Tạo sample CSV trong `public/samples/evolvefit-routine-template.csv`.
- Tạo sample XLSX bằng script hoặc runtime export.
- Columns:
  - session.
  - day.
  - exercise.
  - muscle group.
  - sets.
  - reps min.
  - reps max.
  - weight.
  - rest seconds.
  - note.
- Parser nhận alias tiếng Việt/Anh.
- Preview:
  - Hiển thị session/day nếu có.
  - Báo lỗi dòng/cột.
  - Báo duplicate exercise trong cùng session.
- UI:
  - Nút `Download sample CSV`.
  - Nút `Choose CSV/XLSX`.
  - Append/Replace.

#### Acceptance criteria

- Download sample được.
- Upload sample parse không lỗi.
- File thiếu cột bắt buộc báo lỗi rõ.

#### Tests

- Unit test parser với sample.
- Unit test missing column.
- Unit test duplicate detection.

### Epic 6. Routine data model chuyên nghiệp

#### Mục tiêu

Tách routine thành cấu trúc đủ dùng cho lịch tập thật.

#### Tasks

- Thêm model:
  - `Routine`.
  - `WorkoutDay`.
  - `RoutineExercise`.
  - `ExerciseDefinition`.
- Migration local state từ `workoutExercises` cũ sang routine mới.
- Routine templates:
  - Upper/Lower.
  - Push/Pull/Legs.
  - Full Body.
- Routine editor:
  - Tên routine.
  - Số ngày tập trong tuần.
  - Ngày tập.
  - Tên buổi.
  - Exercise trong từng buổi.
  - Thứ tự bài.
- Giữ backward compatibility với export/import cũ.

#### Acceptance criteria

- User tạo/sửa routine nhiều ngày được.
- Chọn ngày tập hôm nay ra đúng session.
- Import routine map được vào session/day.

#### Tests

- Unit test routine migration.
- Unit test selected workout day.
- Integration test create/edit routine.

### Epic 7. Exercise library cơ bản

#### Mục tiêu

Có thư viện bài tập đủ dùng, phân biệt built-in và custom.

#### Tasks

- Tạo seed exercise library:
  - Chest, Back, Legs, Shoulders, Arms, Core.
  - Equipment: barbell, dumbbell, cable, machine, bodyweight.
  - Movement pattern.
- Exercise picker trong routine editor.
- Add custom exercise.
- Edit/delete custom exercise.
- Built-in không xóa, chỉ copy/customize.
- Search/filter theo muscle/equipment.

#### Acceptance criteria

- User thêm bài từ library vào routine.
- User tạo bài custom.
- Search/filter hoạt động.

#### Tests

- Unit test library filter.
- UI test add custom exercise.

### Epic 8. Workout session model

#### Mục tiêu

Tách buổi tập thực tế khỏi routine gốc.

#### Tasks

- Thêm model `WorkoutSession`:
  - id.
  - routineId.
  - workoutDayId/sessionName.
  - startedAt.
  - endedAt.
  - durationSeconds.
  - status: active, paused, finished, cancelled.
  - sessionExerciseOrder.
- Workout set gắn `sessionId`.
- Start workout tạo session.
- Finish workout cập nhật session.
- Pause/resume workout session.
- History theo session.

#### Acceptance criteria

- Một buổi tập có start/end/duration rõ.
- Workout history xem theo session.
- Set cũ không lẫn vào session mới.

#### Tests

- Unit test session duration.
- Integration test start/log/finish session.

### Epic 9. Session queue reorder không phá routine gốc

#### Mục tiêu

Cho phép đổi thứ tự bài trong lúc tập mà không thay đổi routine gốc.

#### Tasks

- Session có `exerciseQueue`.
- Skip exercise đưa bài vào cuối queue hoặc trạng thái skipped temporary.
- Chọn bài bất kỳ trong queue.
- Nút `Save order to routine` nếu user muốn lưu thứ tự mới.
- UI Live Workout:
  - Queue còn lại.
  - Completed.
  - Skipped/parked.

#### Acceptance criteria

- Reorder trong session không thay routine.
- User lưu thứ tự mới thì routine mới đổi.

#### Tests

- Unit test queue reorder.
- Integration test skip then return exercise.

### Epic 10. Progress dashboard 7/30 ngày

#### Mục tiêu

Progress trả lời được xu hướng thật.

#### Tasks

- Hydration average 7/30 ngày.
- Hydration goal hit rate.
- Creatine consistency nếu enabled.
- Workout count tuần/tháng.
- Volume theo tuần.
- Volume theo muscle group.
- e1RM trend theo bài chính.
- PR list theo exercise.
- Empty states khi thiếu dữ liệu.

#### Acceptance criteria

- Dashboard không chỉ hiển thị dữ liệu hôm nay.
- Có ít nhất 7-day và 30-day view cho hydration.
- Creatine card ẩn nếu creatine disabled.

#### Tests

- Unit test aggregation.
- Unit test PR/e1RM.
- UI smoke Progress tab.

### Epic 11. Body metric charts và validation

#### Mục tiêu

Body metrics có biểu đồ và validation đủ dùng.

#### Tasks

- Chart weight 7/30/90 ngày.
- Chart body fat 7/30/90 nếu có dữ liệu.
- Trend smoothing.
- Goal weight/body fat.
- Unit conversion kg/lb.
- Validate:
  - weight > 0.
  - body fat 0-70.
  - waist/chest/arm/thigh hợp lý.

#### Acceptance criteria

- User xem trend weight theo 7/30/90.
- Unit kg/lb đổi đúng trên UI.
- Input sai có warning rõ.

#### Tests

- Unit test conversion.
- Unit test validation.
- Unit test chart dataset.

### Epic 12. Import/export và privacy hoàn chỉnh

#### Mục tiêu

Dữ liệu cá nhân quản lý rõ, restore an toàn.

#### Tasks

- Import JSON schema validation.
- Export metadata:
  - appVersion.
  - exportedAt.
  - profile id/local id.
  - schemaVersion.
- Selective restore:
  - profile.
  - hydration.
  - workouts.
  - body metrics.
  - settings.
- Delete personal data có confirm riêng.
- Reset demo data tách khỏi delete personal data.
- Privacy copy rõ trong Settings.

#### Acceptance criteria

- Import file sai schema không làm hỏng state.
- Delete personal data có confirm riêng.
- Selective restore hoạt động.

#### Tests

- Unit test import validator.
- Unit test migration.
- UI smoke import invalid file.

## 4. Phase 2 - Tăng độ cạnh tranh

### Epic 13. PR list và live PR notification

#### Tasks

- Tính PR theo exercise:
  - max weight.
  - max reps.
  - estimated 1RM.
  - volume PR.
- PR list trong Progress.
- Khi log set tạo PR mới, hiển thị toast/badge trong Live Workout.
- Không tính skipped set.

#### Acceptance criteria

- PR list đúng theo dữ liệu set.
- Log set mới vượt PR có notification.

### Epic 14. Plate calculator

#### Tasks

- Settings barbell default: 20kg/15kg/custom.
- Plate inventory.
- Calculator từ target weight sang plate mỗi bên.
- Hiển thị trong Live Workout cạnh weight stepper.

#### Acceptance criteria

- Target 60kg với bar 20kg và plate chuẩn hiển thị đúng.
- User đổi plate inventory được.

### Epic 15. Warm-up, drop set, failure set, superset

#### Tasks

- Set type:
  - warmup.
  - working.
  - drop.
  - failure.
- Warm-up set calculator.
- Superset group trong routine.
- UI Live Workout tối giản để không làm chậm thao tác.

#### Acceptance criteria

- User thêm warm-up set.
- Working volume không bị tính sai.
- Superset hiển thị luân phiên bài đúng.

### Epic 16. Exercise library mở rộng

#### Tasks

- Thêm equipment và instructions.
- Muscle primary/secondary.
- Exercise note và cues.
- Import/export custom library.
- Duplicate exercise.

#### Acceptance criteria

- Library đủ dùng cho routine cơ bản.
- Custom library xuất/nhập được.

### Epic 17. Weekly/monthly reports

#### Tasks

- Weekly report:
  - hydration average.
  - goal hit rate.
  - workout count.
  - total volume.
  - PRs.
- Monthly report:
  - badges.
  - trend vs previous month.
- Export report PDF.

#### Acceptance criteria

- User xem được report tuần/tháng.
- PDF xuất được ít nhất một report cơ bản.

### Epic 18. Challenge và badge nâng cao

#### Tasks

- Challenge monthly:
  - hydration streak.
  - workout consistency.
  - volume progression.
- Badge active/locked/lost/disabled.
- Badge điều kiện minh bạch.
- Badge ẩn nếu module liên quan disabled.

#### Acceptance criteria

- Badge không hiện sai khi module disabled.
- Challenge progress cập nhật theo logs.

## 5. Phase 3 - Backend production

### Epic 19. Supabase Auth thật

#### Tasks

- Email/password sign up/sign in/sign out.
- Google OAuth.
- Auth callback.
- Session persistence.
- Local/demo mode migration vào account thật.

#### Acceptance criteria

- User đăng nhập email/password được.
- User đăng nhập Google được nếu env cấu hình.
- Local data có flow merge hoặc replace khi login.

### Epic 20. PostgreSQL schema và RLS

#### Tables

- profiles.
- drink_modules.
- hydration_logs.
- supplements.
- supplement_logs.
- routines.
- workout_days.
- routine_exercises.
- exercise_library.
- workout_sessions.
- workout_sets.
- body_metrics.
- achievements.
- leaderboard_profiles.
- push_subscriptions.
- sync_events.

#### Tasks

- Migration SQL.
- RLS policy từng bảng.
- Index theo user/date/session.
- Seed data dev.

#### Acceptance criteria

- User chỉ đọc/ghi dữ liệu của chính mình.
- Service role chỉ dùng server-side.

### Epic 21. API routine/session/sync

#### Tasks

- Routine CRUD API.
- Exercise CRUD API.
- Workout session start/finish/pause/resume.
- Workout set create/update/delete.
- Session reorder API.
- Sync batch API với idempotency key.
- Conflict response format.

#### Acceptance criteria

- Local mutation sync được lên backend.
- Gửi lại cùng idempotency key không tạo duplicate.

### Epic 22. Sync retry thật và conflict resolution

#### Tasks

- Retry khi online.
- Exponential backoff.
- Per item status.
- Conflict:
  - logs last-write-wins.
  - routine conflict preview/confirm.
- Sync queue detail screen.

#### Acceptance criteria

- Offline log xong online lại tự sync.
- Failed item retry được.
- Conflict routine không ghi đè im lặng.

### Epic 23. OpenAPI, logging, rate limit, observability

#### Tasks

- OpenAPI spec cho API V1.
- Request id.
- Structured logs.
- Rate limit public/auth endpoints.
- Health/integration dashboard.
- Error boundary và report client error.

#### Acceptance criteria

- API docs sinh được.
- Logs truy được theo request id.
- Health route thể hiện trạng thái integration.

## 6. Phase 4 - Mở rộng sau V1

### Epic 24. AI Coach đầy đủ

#### Tasks

- Rule-based insight trước.
- AI insight chỉ dùng khi có đủ dữ liệu.
- Guardrails:
  - Không đưa lời khuyên y tế nguy hiểm.
  - Không thay thế chuyên gia.
  - Giải thích dựa trên data nào.
- Recommendation history.
- Accept/reject feedback.

#### Acceptance criteria

- AI không xuất hiện khi thiếu dữ liệu.
- Mỗi insight có lý do và hành động cụ thể.

### Epic 25. Social feed và friend leaderboard

#### Tasks

- Friend list.
- Friend leaderboard private group.
- Share badge/workout summary.
- Privacy controls chi tiết.
- Report/block nếu mở rộng public.

#### Acceptance criteria

- Không chia sẻ dữ liệu nhạy cảm mặc định.
- User opt-in trước khi publish.

### Epic 26. Health Connect / Apple Health(chưa cần làm)

#### Tasks

- Nghiên cứu integration target.
- Sync weight/workout/hydration nếu platform cho phép.
- Mapping unit.
- Permission screen.

#### Acceptance criteria

- User chọn loại dữ liệu được sync.
- Không sync ngầm.

### Epic 27. Native mobile/watch app( chưa cần làm)

#### Tasks

- Đánh giá PWA đủ chưa trước khi native.
- Nếu cần native:
  - React Native hoặc Expo.
  - Shared domain logic.
  - Watch quick log/rest timer.

#### Acceptance criteria

- Mobile native không fork logic domain.
- Watch chỉ làm quick actions.

### Epic 28. Progress photos

#### Tasks

- Schema photo metadata.
- Local/private storage.
- Compare view.
- Export/delete.

#### Acceptance criteria

- Photos private mặc định.
- Delete xóa metadata và file.

### Epic 29. Nutrition tracking đầy đủ

#### Tasks

- Food diary.
- Macro goals.
- Barcode/database nếu có đối tác dữ liệu.
- Meal templates.
- Không đưa vào core navigation nếu chưa đủ chất lượng.

#### Acceptance criteria

- Nutrition không làm loãng hydration/workout core.

## 7. Thứ tự triển khai đề xuất chi tiết

### Sprint 1

- Drink visibility settings.
- Creatine active/inactive rule.
- Hide UI/reminder/progress khi disabled.
- Tests cho reminder/visibility.

### Sprint 2

- Reminder schedule nâng cao.
- Snooze state.
- In-app fallback.
- Settings UI cho reminder.

### Sprint 3

- Routine sample CSV.
- Parser session/day.
- Preview validation nâng cao.
- Tests parser.

### Sprint 4

- Routine data model mới.
- Migration local state.
- Routine editor theo day/session.

### Sprint 5

- Workout session model.
- Session start/finish/duration.
- Set gắn session.
- Workout history theo session.

### Sprint 6

- Session queue reorder không phá routine gốc.
- Skip exercise đưa vào queue tạm.
- Save order to routine.

### Sprint 7

- Progress 7/30.
- Hydration hit rate.
- Creatine consistency conditional.
- Volume/e1RM/PR aggregation.

### Sprint 8

- Body metric charts 7/30/90.
- Unit conversion.
- Goal weight/body fat.

### Sprint 9

- Web Push subscribe/unsubscribe thật.
- Cron reminder production-ready.
- Push action log/snooze.

### Sprint 10

- Import JSON schema validation.
- Export metadata.
- Selective restore.
- Delete personal data.

### Sprint 11

- Exercise library.
- Custom exercise.
- Search/filter.

### Sprint 12

- PR list.
- Live PR notification.
- Plate calculator.

### Sprint 13

- Weekly/monthly reports.
- Badge/challenge nâng cao.
- PDF report.

### Sprint 14

- Supabase Auth.
- PostgreSQL tables/RLS.
- API sync batch.

### Sprint 15

- Sync retry thật.
- Conflict resolution.
- OpenAPI/logging/rate limit.

### Sprint 16+

- AI Coach.
- Social/friend leaderboard.
- Health integrations.
- Native/watch.
- Progress photos.
- Nutrition.

## 8. Rủi ro và quyết định cần chốt

### Rủi ro kỹ thuật

- LocalStorage sẽ không đủ tốt nếu dữ liệu workout/history lớn.
- Migration từ state cũ sang routine/session model mới cần làm cẩn thận.
- Web Push trên iOS/PWA có giới hạn platform.
- Supabase RLS sai có thể lộ dữ liệu cá nhân.

### Quyết định sản phẩm cần chốt

- Creatine mặc định bật hay hỏi trong onboarding.(mặc định tắt, chỉ có khi người dùng tuỳ chọn thêm loại nước như các loại nước khác)
- Coffee/tea có tính vào hydration target hay chỉ ghi history.(những mục này sẽ tạm thời tính chỉ có nước trong nó con các chất như cafein,... sẽ thêm sau)
- RPE mặc định hiện hay ẩn.
- Progress photo có vào V1.1 hay để V2(v2).
- Nutrition có nên tách khỏi EvolveFit core hay không(có).

## 9. Checklist hoàn tất toàn dự án

- [ ] Drink modules active/inactive hoàn chỉnh.
- [ ] Water primary UX không bị lẫn supplement.
- [ ] Creatine disabled ẩn mọi UI/reminder/progress liên quan.
- [ ] Optional drinks có hydration factor.
- [ ] Reminder schedule fixed/interval/snooze/quiet hours.
- [x] Web Push subscribe/unsubscribe thật.
- [ ] Routine sample CSV/XLSX.
- [ ] Routine model tách day/session.
- [ ] Exercise library built-in/custom.
- [ ] Workout session model riêng.
- [ ] Session queue reorder không phá routine gốc.
- [ ] Workout history theo session.
- [ ] Progress 7/30 ngày.
- [ ] PR list và e1RM trend.
- [ ] Body metrics chart 7/30/90.
- [ ] Badge active/locked/lost/disabled.
- [ ] Leaderboard opt-in thật.
- [ ] Import JSON schema validation.
- [ ] Selective restore.
- [ ] Delete personal data.
- [ ] Supabase Auth thật.
- [ ] PostgreSQL RLS đầy đủ.
- [ ] Sync retry thật với idempotency.
- [ ] Conflict resolution.
- [ ] OpenAPI spec.
- [ ] Structured logs/request id.
- [ ] Rate limit.
- [ ] Weekly/monthly reports.
- [ ] Plate calculator.
- [ ] Warm-up/drop/failure/superset.
- [ ] AI coach guarded.
- [ ] Social/friend leaderboard private-first.
- [ ] Health integration permissions.
- [ ] Native/watch decision.
- [ ] Progress photos private.
- [ ] Nutrition tracking decision.

## 10. Gợi ý cách dùng file này

- Dùng Phase 1 làm scope bắt buộc để đóng V1 chuyên nghiệp.
- Dùng Phase 2 làm scope V1.1/V2 cạnh tranh.
- Dùng Phase 3 khi bắt đầu production backend.
- Dùng Phase 4 làm product expansion, không kéo vào V1 nếu chưa ổn core.
- Mỗi sprint nên tạo issue/PR riêng theo epic, không gom nhiều domain vào một PR lớn.

