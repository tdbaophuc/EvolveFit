# EvolveFit - Tổng quan giao diện và UX/UI phiên bản V1

Cập nhật: 2026-08-17

Tài liệu này mô tả hướng giao diện cho EvolveFit V1 như một sản phẩm thực tế: mobile-first, rõ luồng, ít gây rối, thao tác nhanh và có hệ thống thiết kế nhất quán.

## 1. Định hướng thiết kế

EvolveFit V1 cần có cảm giác như một app tập luyện và theo dõi thói quen nghiêm túc, không phải landing page hay dashboard trang trí.

Từ khóa thiết kế:

- Clean.
- Athletic.
- Focused.
- Fast.
- Data-readable.
- Practical.

Nguyên tắc chính:

- Tách rõ Hydration và Workout.
- Không nhồi quá nhiều card vào một màn hình.
- Mỗi màn hình chỉ có một hành động chính rõ ràng.
- Các hành động thường dùng phải đủ lớn để bấm nhanh trên điện thoại.
- Dữ liệu số phải dễ đọc khi liếc qua.
- Form dài chỉ xuất hiện ở màn hình chỉnh sửa, không nằm trên luồng log nhanh.

## 2. Information architecture V1

Navigation V1 nên gồm các mục chính:

- Today.
- Hydration.
- Workout.
- Progress.
- Settings.

Coach/AI không nằm trong navigation chính của V1. Nếu cần giữ chỗ, chỉ nên để phần "Insights" nhẹ trong Progress hoặc Settings, không làm thành tab chính.

## 3. App shell

### Mobile

- Top bar cao khoảng 56px.
- Bottom tab bar cao 64-72px, có safe-area bottom.
- Nội dung một cột, padding ngang 16px.
- Sticky action chỉ dùng cho màn hình Live Workout hoặc bottom sheet.

### Tablet/Desktop

- Tablet có thể dùng layout hai cột ở Today, Hydration, Progress.
- Desktop có thể dùng sidebar navigation.
- Live Workout vẫn nên giữ layout tập trung ở giữa, không trải quá rộng.

## 5. Component system

Các component V1 cần có:

- `AppShell`.
- `TopBar`.
- `BottomTabBar`.
- `SyncStatusPill`.
- `MetricRing`.
- `ProgressBar`.
- `QuickAmountButton`.
- `AmountSliderSheet`.
- `TimePickerSheet`.
- `ReminderRuleEditor`.
- `DrinkGoalCard`.
- `CreatineStatusCard`.
- `RoutineTemplateCard`.
- `ExerciseRow`.
- `ExerciseEditorSheet`.
- `ImportPreviewTable`.
- `LiveWorkoutHeader`.
- `SetRow`.
- `StepperControl`.
- `RestTimer`.
- `WorkoutQueueDrawer`.
- `FinishWorkoutSummary`.
- `ChartCard`.
- `BadgeCard`.
- `SettingsRow`.
- `ToastWithUndo`.

Button hierarchy:

- Primary: Log, Start, Complete Set, Save.
- Secondary: Edit, Snooze, Import, Preview.
- Destructive: Delete, Reset, Remove.
- Icon button: edit, delete, reorder, close, timer, notification.

Không đặt card bên trong card. Section lớn nên là layout phẳng, card chỉ dùng cho module riêng biệt.

## 6. Màn hình Today

Mục tiêu: cho người dùng biết hôm nay có gì quan trọng và đi nhanh tới đúng luồng.

Today không phải nơi chứa toàn bộ chức năng. Today chỉ là overview.

Thứ tự nội dung:

1. Header: ngày hiện tại, trạng thái sync/offline.
2. Two action cards:
   - Hydration today: tiến độ nước, nút `nhập`, link vào Hydration.
   - Workout today: tên buổi tập, số bài, nút `bắt đầu`.
3. Creatine compact status: đã uống/chưa uống, nút log nhanh.
4. Today summary: hydration pace, workout status, body metric gần nhất.
5. Recent activity: 3 log gần nhất.

UX:

- Không đặt quá nhiều setting ở Today.
- Tapping Hydration card mở màn hình Hydration.
- Tapping Workout card mở Workout hoặc Live Workout.
- Toast có Undo trong 5 giây sau thao tác log.

## 7. Màn hình Hydration

Mục tiêu: quản lý nước uống hằng ngày.

Layout:

1. Top summary:
   - Progress ring.
   - Đã uống/mục tiêu.
   - Trạng thái pace.
2. Quick log:
   - Tối đa 3 nút lượng nước gần đây/hay dùng.
   - Nút Custom mở bottom sheet.
3. Custom amount sheet:
   - Slider 50-1500ml.
   - Step 50ml.
   - Nút `nhập`.
   - Tùy chọn pin amount.
4. Hourly chart:
   - Biểu đồ theo giờ trong ngày.
5. Timeline:
   - Time, amount, edit, delete.
6. Reminder settings:
   - Toggle nhắc uống.
   - Chọn nhắc theo giờ cố định hoặc lặp lại mỗi N giờ.
   - Quiet hours.
   - Snooze.
7. Goal settings:
   - Mục tiêu ml/ngày.
   - Gợi ý theo cân nặng.

Trạng thái:

- Empty: vẫn hiển thị mục tiêu và nút log.
- Offline: cho log bình thường, hiển thị pending sync.
- Behind pace: dùng warning nhẹ, không gây áp lực quá mức.

## 8. Màn hình Creatine

Creatine có thể là sub-screen trong Hydration hoặc một section riêng trong tab Hydration. Điều quan trọng là không trộn nó với nước lọc.

Layout:

1. Status card:
   - Mục tiêu hôm nay.
   - Đã uống/chưa uống/bỏ qua.
   - Giờ nhắc tiếp theo.
2. Log controls:
   - Nút `Log 5g`.
   - Custom amount sheet.
3. Reminder editor:
   - Nhắc theo giờ cố định.
   - Nhắc lặp lại mỗi N giờ nếu cần.
   - Nhắc trước X phút.
4. History:
   - Lịch sử creatine gần đây.

UX:

- Sau khi log, status chuyển sang checked.
- Nếu đã log trong ngày, không nhắc lại.
- Skipped là trạng thái có chủ đích, không xóa mục tiêu.

## 9. Màn hình Workout

Mục tiêu: chọn routine, chỉnh lịch, bắt đầu buổi tập.

Layout:

1. Today's workout:
   - Tên buổi.
   - Số bài.
   - Thời lượng ước tính.
   - Nút `Bắt đầu`.
2. Weekly schedule:
   - Chip các ngày trong tuần.
   - Trạng thái scheduled/completed/missed.
3. Active routine:
   - Routine đang dùng.
   - Nút Edit.
4. Routine templates:
   - Upper/Lower.
   - Push/Pull/Legs.
   - Full Body.
5. Import routine:
   - Upload Excel/CSV.
   - Link tải file mẫu.
6. Recent workouts:
   - Các buổi tập gần nhất.

UX:

- Luồng chính là chọn lịch mẫu rồi chỉnh sửa.
- Import Excel/CSV phải có preview trước khi ghi đè.
- Không để form dài luôn mở; dùng sheet/modal.

## 10. Màn hình Routine Editor

Mục tiêu: chỉnh lịch tập cá nhân.

Layout:

1. Routine info:
   - Tên routine.
   - Số ngày tập.
   - Ngày tập.
2. Day list:
   - Push Day, Pull Day, Lower Day...
3. Exercise list theo từng ngày:
   - Tên bài.
   - Muscle group.
   - Sets.
   - Reps.
   - Weight.
   - Rest.
4. Exercise editor sheet:
   - Name.
   - Muscle group.
   - Sets.
   - Reps min/max.
   - Weight.
   - Rest seconds.
   - Note.
5. Reorder controls:
   - Nút lên/xuống hoặc drag handle.
6. Save/Cancel rõ ràng.

UX:

- Mobile ưu tiên bottom sheet cho edit từng bài.
- Không bắt người dùng nhập tất cả từ đầu.
- Template phải có dữ liệu sẵn để chỉnh.

## 11. Màn hình Import Routine

Mục tiêu: nhập lịch cá nhân từ Excel/CSV một cách an toàn.

Layout:

1. Upload area.
2. File format guide ngắn.
3. Nút tải file mẫu.
4. Preview table.
5. Validation summary.
6. Mapping columns nếu file không đúng header.
7. Confirm import.

UX:

- Không ghi đè routine ngay sau khi upload.
- Nếu lỗi, chỉ rõ dòng/cột.
- Cho chọn:
  - Tạo routine mới.
  - Ghi đè routine hiện tại.
  - Gộp vào routine hiện tại.

## 12. Màn hình Live Workout

Mục tiêu: log set nhanh và không làm người dùng mất tập trung.

Live Workout dùng focus mode.

Layout:

1. Sticky header:
   - Tên buổi tập.
   - Thời gian đã tập.
   - Tiến độ: bài 2/6.
2. Current exercise:
   - Tên bài.
   - Muscle group.
   - Target sets/reps/weight.
   - Rest time.
3. Last session:
   - Số liệu lần trước.
4. Set list:
   - Set index.
   - Target.
   - Actual.
   - RPE nếu có.
   - Trạng thái done/current/pending.
5. Current set controls:
   - Weight stepper.
   - Reps stepper.
   - RPE optional.
6. Rest timer:
   - Countdown lớn.
   - Pause/resume.
   - Skip rest.
7. Workout queue:
   - Danh sách bài còn lại.
   - Cho chọn bài sau tập trước.
8. Sticky bottom:
   - `Hoàn thành set`.
   - `Skip bài`.
   - `Kết thúc`.

UX:

- `Hoàn thành set` là nút lớn nhất màn hình.
- Sau khi complete set, timer tự chạy.
- Khi hết timer, gửi notification/vibration nếu được phép.
- Nếu máy đang bận, người dùng mở queue và chọn bài khác.
- Đổi thứ tự trong buổi tập không thay đổi lịch gốc trừ khi người dùng lưu.

## 13. Màn hình Finish Workout

Mục tiêu: kết thúc buổi tập có cảm giác hoàn tất và kiểm tra nhanh dữ liệu.

Layout:

1. Summary:
   - Duration.
   - Total volume.
   - Completed exercises.
   - Completed sets.
2. PR detected nếu có.
3. Notes.
4. Save workout.
5. Discard/continue workout.

UX:

- Không bắt nhập note.
- Nếu có set thiếu dữ liệu, cảnh báo nhẹ trước khi lưu.

## 14. Màn hình Progress

Mục tiêu: xem xu hướng và thành tựu.

Layout:

1. Summary cards:
   - Hydration average.
   - Creatine consistency.
   - Workouts/week.
   - Body weight.
2. Hydration charts:
   - 7 ngày.
   - 30 ngày.
3. Training charts:
   - Weekly volume.
   - Volume by muscle group.
   - e1RM trend.
4. Body metrics:
   - Weight chart.
   - Body fat chart nếu có dữ liệu.
5. PR list.
6. Badges.

UX:

- Chart phải có label rõ, không chỉ màu.
- Empty state giải thích cần thêm dữ liệu sau 3-7 ngày.
- Progress không chứa log controls chính.

## 15. Màn hình Achievements và Leaderboard

Achievements có thể nằm trong Progress ở V1.

Layout:

1. Monthly badges:
   - Hydration consistency.
   - Creatine consistency.
   - Workout consistency.
   - Volume progression.
2. Badge detail:
   - Điều kiện đạt.
   - Tiến độ hiện tại.
   - Thời hạn tháng hiện tại.
3. Leaderboard opt-in:
   - Toggle tham gia.
   - Privacy explanation.
4. Leaderboard list nếu đã opt-in.

UX:

- Default private.
- Không dùng nội dung làm người dùng cảm thấy bị phạt.
- Không công khai body metrics hoặc chi tiết workout raw.

## 16. Màn hình Settings

Mục tiêu: quản lý cấu hình, không phải nơi log dữ liệu.

Nhóm setting:

- Account.
- Profile.
- Units.
- Timezone.
- Wake/sleep time.
- Hydration goal.
- Hydration reminders.
- Creatine goal.
- Creatine reminders.
- Notification permission.
- Workout defaults.
- Privacy.
- Data import/export.
- Offline sync queue.

UX:

- Dùng list rows quen thuộc.
- Toggle cho bật/tắt.
- Picker cho giờ.
- Sheet/modal cho cấu hình phức tạp.
- Hành động nguy hiểm cần confirm.

## 17. Loading, empty, offline và error states

Loading:

- Skeleton cho card.
- Không block quick log nếu local cache đã có.

Empty:

- Hydration: hiển thị mục tiêu và nút log.
- Workout: hiển thị template picker.
- Progress: báo cần thêm dữ liệu.

Offline:

- Cho log tiếp.
- Hiển thị pending sync.
- Retry khi online.

Error:

- Không mất dữ liệu local.
- Cho retry.
- Với notification denied, hiển thị fallback trong app.

## 18. Accessibility

- Touch target tối thiểu 44x44px, ưu tiên 56px cho action thường dùng.
- Tương phản màu đạt AA.
- Không chỉ dùng màu để thể hiện trạng thái.
- Mọi button/icon có accessible label.
- Slider phải có stepper fallback.
- Hỗ trợ reduced motion.
- Text không tràn khỏi button/card ở mobile.

## 19. Prototype flow tối thiểu

Thiết kế V1 cần prototype được các flow sau:

1. Onboarding và chọn routine mẫu.
2. Log nước nhanh bằng quick amount.
3. Log nước custom và lưu amount gần đây.
4. Cấu hình nhắc uống nước.
5. Log creatine và cấu hình nhắc creatine.
6. Chỉnh routine từ template.
7. Import routine từ Excel/CSV và preview.
8. Bắt đầu workout.
9. Complete set, nhập reps, chạy rest timer.
10. Đổi bài tập trong lúc tập vì dụng cụ bận.
11. Kết thúc workout và xem summary.
12. Xem progress và badges.
13. Export/import dữ liệu.

## 20. Ưu tiên polish giao diện

Cần làm đẹp và chắc nhất trước:

1. Hydration screen.
2. Live Workout screen.
3. Routine editor.
4. Import routine preview.
5. Progress charts.
6. Settings notification/privacy.

Có thể đơn giản hơn ở V1:

- Leaderboard.
- Badges nâng cao.
- Advanced analytics.
- AI Coach.
