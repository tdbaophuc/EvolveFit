# EvolveFit - Chức năng webapp phiên bản V1

Cập nhật: 2026-08-17

Tài liệu này mô tả phạm vi chức năng cuối cùng cho phiên bản V1 của webapp EvolveFit. V1 được định hướng như một sản phẩm người dùng thật: dễ hiểu, tách rõ luồng nước uống và luồng tập luyện, thao tác nhanh trên điện thoại, dữ liệu có thể đồng bộ và có khả năng mở rộng sau này.

## 1. Định vị V1

EvolveFit V1 là webapp/PWA cho người tập gym muốn quản lý hai thói quen chính:

- Theo dõi nước uống và creatine theo mục tiêu hằng ngày.
- Theo dõi lịch tập, từng bài tập, từng set và thời gian nghỉ.

V1 không cố gắng trở thành một mạng xã hội fitness hay AI coach đầy đủ. Trọng tâm là một app dùng được mỗi ngày, ổn định, rõ ràng và ít gây rối khi người dùng đang tập hoặc đang cần log nhanh.

## 2. Nguyên tắc sản phẩm

- Nước uống và tập luyện phải là hai khu vực riêng, không nhồi tất cả vào một màn hình.
- Tác vụ lặp lại hằng ngày phải hoàn thành trong 1-2 chạm.
- Giao diện ưu tiên mobile-first, nút lớn, dễ bấm bằng ngón cái.
- Khi người dùng đang tập, màn hình phải chuyển sang chế độ tập trung, hạn chế thông tin phụ.
- Dữ liệu quan trọng phải lưu được offline trước, đồng bộ sau.
- Mọi chức năng nhắc nhở phải có kiểm soát, không spam, có quiet hours và snooze.
- AI Coach chưa thuộc phạm vi V1 chính; chỉ chuẩn bị dữ liệu và kiến trúc để triển khai sau.

## 3. Nhóm chức năng V1

### 3.1. Tài khoản, profile và onboarding

- Đăng nhập bằng email/password.
- Đăng nhập bằng Google OAuth khi cấu hình Supabase Auth hoàn tất.
- Chế độ local/demo cho giai đoạn dùng thử hoặc khi chưa đăng nhập.
- Onboarding lần đầu gồm các bước:
  - Thông tin cơ bản: tên hiển thị, email.
  - Đơn vị: kg/lb, ml/oz.
  - Cân nặng, chiều cao.
  - Giờ thức dậy, giờ đi ngủ, timezone.
  - Mục tiêu nước mặc định.
  - Cấu hình creatine.
  - Chọn lịch tập mẫu ban đầu.
- Gợi ý mục tiêu nước theo cân nặng và số ngày tập.
- Gợi ý lịch tập mẫu theo số ngày tập/tuần.
- Cho chỉnh lại onboarding/profile trong Settings.
- Validation rõ ràng cho email, giờ ngủ/dậy, mục tiêu nước, số ngày tập.

### 3.2. Nước uống và creatine

V1 chỉ quản lý hai nhóm đồ uống chính:

- Nước lọc.
- Creatine.

Các loại đồ uống khác như coffee, tea, electrolyte, protein shake sẽ để giai đoạn mở rộng sau.

#### Mục tiêu theo từng loại

- Mỗi loại nước/đồ uống được quản lý đều có mục tiêu riêng.
- Nước lọc có mục tiêu theo ml/ngày.
- Creatine có mục tiêu theo g/ngày.
- Người dùng có thể chỉnh mục tiêu trong Settings hoặc trong màn hình chi tiết tương ứng.

#### Ghi log nước lọc

- Hiển thị tiến độ nước trong ngày: đã uống, mục tiêu, phần trăm hoàn thành.
- Tính expected progress theo giờ thức dậy/đi ngủ.
- Hiển thị trạng thái: đang đúng tiến độ, vượt tiến độ, đang thiếu.
- Quick amount ban đầu không cần cố định quá nhiều lựa chọn.
- Khi người dùng nhập một lượng nước custom, app lưu lại lượng đó để lần sau hiển thị nhanh.
- Chỉ hiển thị tối đa 3 quick amount gần đây hoặc hay dùng nhất để tránh rối.
- Người dùng có thể nhập lượng nước bằng slider hoặc stepper theo bước 50ml.
- Undo log nước trong vòng 5 giây sau khi ghi.
- Timeline log nước trong ngày.
- Sửa lượng nước đã log theo bước `+/-50ml`.
- Xóa log nước.
- Filter/log history ở màn hình chi tiết nước.

#### Nhắc uống nước

- Nước lọc có thể bật/tắt nhắc uống.
- Hỗ trợ hai kiểu nhắc:
  - Nhắc vào một hoặc nhiều thời điểm cố định trong ngày.
  - Nhắc lặp lại sau mỗi N giờ.
- Nhắc uống tôn trọng quiet hours theo giờ ngủ.
- Không nhắc nếu người dùng vừa log gần đây.
- Có snooze.
- Web Push gửi thông báo khi đủ điều kiện cấu hình VAPID và app chạy qua HTTPS.

#### Creatine

- Creatine mặc định 5g/ngày.
- Người dùng có thể chỉnh liều mục tiêu.
- Ghi log creatine bằng một nút nhanh.
- Có slider/stepper để ghi lượng khác 5g nếu cần.
- Trạng thái trong ngày:
  - Chưa uống.
  - Đã uống.
  - Bỏ qua.
- Nhắc creatine có thể cấu hình:
  - Một thời điểm cố định trong ngày.
  - Nhắc trước giờ uống bao nhiêu phút.
  - Hoặc nhắc lặp lại theo chu kỳ nếu người dùng chọn.
- Khi đã log creatine trong ngày, app không gửi nhắc lại cho ngày đó.

### 3.3. Màn hình nước uống riêng

V1 cần có màn hình riêng cho nước uống, không chỉ là một card trong Today.

Chức năng:

- Tổng quan mục tiêu nước hôm nay.
- Progress ring hoặc progress bar lớn.
- Biểu đồ theo giờ trong ngày.
- Quick log tối đa 3 nút gần đây/hay dùng.
- Nhập custom amount bằng slider/stepper.
- Danh sách log trong ngày.
- Sửa/xóa log.
- Cài đặt mục tiêu nước.
- Cài đặt nhắc uống nước.
- Quản lý quick amount gần đây.

### 3.4. Màn hình creatine riêng hoặc mục riêng trong nước uống

Creatine có thể nằm trong khu vực hydration/supplement nhưng phải được trình bày rõ ràng, không trộn lẫn với nước lọc.

Chức năng:

- Mục tiêu creatine hôm nay.
- Trạng thái đã uống/chưa uống/bỏ qua.
- Ghi log nhanh.
- Chỉnh liều mặc định.
- Cài đặt lịch nhắc.
- Lịch sử log creatine.

### 3.5. Lịch tập và routine

V1 tập trung vào việc giúp người dùng bắt đầu từ lịch mẫu rồi tùy chỉnh thành lịch cá nhân.

#### Lịch mẫu ban đầu

Khi onboarding hoặc tạo routine mới, người dùng chọn một trong các lịch mẫu:

- Upper/Lower.
- Push/Pull/Legs.
- Full Body.

Custom routine có thể có trong V1 nhưng không bắt buộc là lựa chọn đầu tiên. Luồng chính nên là chọn lịch mẫu rồi chỉnh sửa.

#### Tùy chỉnh routine

Người dùng có thể chỉnh từng thành phần trong lịch tập:

- Tên routine.
- Số ngày tập trong tuần.
- Ngày tập.
- Tên buổi tập.
- Danh sách bài tập trong mỗi buổi.
- Thứ tự bài tập.
- Số set.
- Rep range.
- Mức tạ mục tiêu.
- Thời gian nghỉ giữa set.
- Muscle group.
- Ghi chú bài tập.

#### Exercise library

- Có thư viện bài tập cơ bản.
- Có thể thêm bài tập custom.
- Có thể sửa/xóa bài tập custom.
- Mỗi bài có muscle group và thông tin mặc định.

#### Import lịch tập từ Excel

V1 hỗ trợ import lịch tập cá nhân từ file Excel/CSV.

Chức năng import:

- Người dùng tải file `.xlsx` hoặc `.csv`.
- App đọc các cột chính:
  - Tên buổi.
  - Ngày tập hoặc thứ trong tuần.
  - Tên bài tập.
  - Muscle group.
  - Sets.
  - Reps min.
  - Reps max.
  - Weight.
  - Rest seconds.
  - Ghi chú.
- Trước khi lưu, app hiển thị màn hình preview để người dùng kiểm tra.
- Nếu thiếu dữ liệu, app báo lỗi theo dòng/cột.
- Cho tải file mẫu để người dùng điền đúng định dạng.

### 3.6. Live Workout

Live Workout là màn hình quan trọng nhất của phần tập luyện. Khi người dùng bấm bắt đầu, app chuyển sang chế độ tập trung.

Luồng chính:

1. Người dùng chọn buổi tập và bấm `Bắt đầu`.
2. App hiển thị bài tập hiện tại theo lịch.
3. Người dùng tập xong set và bấm `Hoàn thành set`.
4. App yêu cầu hoặc cho nhập nhanh số rep thực tế đạt được.
5. App lưu set gồm weight, reps, RPE tùy chọn và thời gian hoàn thành.
6. Rest timer tự động đếm ngược theo thời gian nghỉ đã cấu hình.
7. Khi thời gian nghỉ kết thúc, app gửi thông báo nếu được cấp quyền.
8. Người dùng tiếp tục set tiếp theo.
9. Khi hết set của bài hiện tại, app chuyển sang bài tiếp theo.
10. Khi hết toàn bộ bài, người dùng bấm `Kết thúc buổi tập`.

Chức năng trong Live Workout:

- Hiển thị tên buổi tập, thời gian đã tập, tiến độ bài hiện tại.
- Hiển thị bài hiện tại, target sets/reps/weight/rest.
- Hiển thị dữ liệu lần tập trước nếu có.
- Nhập reps thực tế sau mỗi set.
- Chỉnh weight/reps bằng stepper.
- RPE là tùy chọn, không bắt buộc để không làm chậm thao tác.
- Rest timer tự động chạy sau mỗi set.
- Thông báo khi hết thời gian nghỉ.
- Pause/resume timer.
- Skip set.
- Skip bài tập.
- Kết thúc buổi tập sớm.
- Sửa set vừa ghi nếu nhập sai.
- Undo hoàn thành set trong vài giây sau khi ghi.

#### Đổi thứ tự bài trong lúc tập

Trong thực tế phòng gym, máy hoặc dụng cụ có thể đang bận. V1 cần cho phép người dùng đổi thứ tự bài ngay trong buổi tập:

- Xem danh sách các bài còn lại.
- Chọn bài sau để tập trước.
- Bài bị bỏ qua tạm thời vẫn nằm trong danh sách chờ.
- Sau khi xong bài được chọn, người dùng có thể quay lại thứ tự ban đầu hoặc tiếp tục chọn bài khác.
- Lịch gốc không bị thay đổi vĩnh viễn trừ khi người dùng chọn lưu thứ tự mới.

### 3.7. Workout history và tiến độ tập luyện

- Lưu lịch sử buổi tập.
- Xem lại từng buổi đã tập.
- Xem danh sách set theo bài.
- Tổng volume mỗi buổi.
- Tổng thời lượng buổi tập.
- PR cơ bản:
  - Max weight.
  - Max reps.
  - Estimated 1RM.
- Tiến độ theo từng bài tập.
- Biểu đồ volume theo tuần.
- Biểu đồ e1RM theo bài tập chính.
- Workout consistency theo tuần/tháng.

### 3.8. Body metrics

- Ghi nhận cân nặng.
- Ghi nhận body fat nếu có.
- Ghi nhận waist, chest, arm, thigh.
- Ghi chú mỗi lần đo.
- Timeline body metrics.
- Sửa/xóa metric.
- Biểu đồ cân nặng 7/30/90 ngày.
- Biểu đồ body fat 7/30/90 ngày nếu có dữ liệu.

### 3.9. Progress dashboard

Progress là nơi xem xu hướng, không phải nơi log nhanh.

Chức năng:

- Hydration average 7/30 ngày.
- Tỷ lệ đạt mục tiêu nước.
- Creatine consistency.
- Số buổi tập hoàn thành trong tuần/tháng.
- Tổng volume theo tuần.
- Volume theo muscle group.
- e1RM trend.
- PR list.
- Body metric trend.
- Monthly badges.

### 3.10. Achievement và leaderboard

V1 có gamification nhẹ, mặc định riêng tư.

Achievements:

- Hydration consistency badge theo tháng.
- Creatine consistency badge theo tháng.
- Workout consistency badge theo tháng.
- Volume progression badge theo tháng.
- Badge có trạng thái: active, locked, lost/expired.
- Hiển thị điều kiện đạt badge minh bạch.

Leaderboard:

- Mặc định tắt.
- Người dùng phải opt-in mới tham gia.
- Chỉ hiển thị dữ liệu công khai tối thiểu:
  - Tên hiển thị.
  - Avatar nếu có.
  - Rank.
  - Score hoặc badge streak.
- Không hiển thị cân nặng, body fat, chi tiết bài tập cá nhân.

### 3.11. Notifications

V1 cần hệ thống nhắc nhở đủ dùng cho nước, creatine và rest timer.

Chức năng:

- Xin quyền notification trong Settings.
- Subscribe/unsubscribe Web Push.
- Nhắc uống nước.
- Nhắc creatine.
- Nhắc hết thời gian nghỉ giữa set.
- Snooze notification.
- Tôn trọng quiet hours.
- Hiển thị trạng thái quyền notification.
- Nếu push chưa khả dụng, dùng in-app reminder fallback.

### 3.12. Offline, sync và dữ liệu

- App lưu thao tác vào local state/localStorage trước.
- Offline vẫn log được nước, creatine và workout set.
- Các mutation được đưa vào offline sync queue.
- Khi online lại, app tự retry sync.
- Header hiển thị trạng thái:
  - Offline.
  - Pending sync.
  - Sync failed.
  - Synced.
- Người dùng có thể xem queue trong Settings.
- Có thể retry hoặc clear item failed.
- Mỗi mutation cần có idempotency key để tránh ghi trùng khi retry.
- Conflict resolution:
  - Log đơn giản dùng last-write-wins.
  - Routine dùng preview/confirm khi có xung đột.

### 3.13. Import/export và quyền riêng tư

- Export JSON toàn bộ dữ liệu cá nhân.
- Export CSV theo dataset:
  - Hydration.
  - Creatine.
  - Workouts.
  - Body metrics.
- Import JSON để restore dữ liệu.
- Import Excel/CSV cho routine.
- Reset dữ liệu local có xác nhận.
- Xóa dữ liệu cá nhân có xác nhận.
- Privacy copy rõ ràng cho leaderboard và dữ liệu gửi lên backend.

### 3.14. API và backend V1

API V1 cần hỗ trợ các nhóm chính:

- Auth/session.
- Profile.
- Hydration goal/log/reminder.
- Creatine goal/log/reminder.
- Routine CRUD.
- Exercise CRUD.
- Workout session start/finish.
- Workout set create/update/delete.
- Workout reorder trong session.
- Progress summary.
- Body metrics CRUD.
- Notifications subscribe/unsubscribe.
- Achievements.
- Leaderboard visibility.
- Import/export.
- Health/integration status.

Backend V1 dùng Supabase:

- Supabase Auth.
- PostgreSQL tables có RLS.
- User chỉ đọc/ghi dữ liệu của chính mình.
- Cron route có `CRON_SECRET`.
- Service role key chỉ dùng server-side.

## 4. Không thuộc phạm vi V1 chính

Các phần sau không làm trong V1 chính, chỉ chuẩn bị kiến trúc để mở rộng:

- AI Coach đầy đủ.
- Chat tự do với AI.
- Health Connect / Apple Health.
- Native mobile app.
- Watch app.
- Progress photos.
- Nutrition tracking đầy đủ.
- Social feed.
- Marketplace routine.
- Anti-cheat leaderboard nâng cao.

## 5. Tiêu chí hoàn thành V1

V1 được xem là hoàn thành khi:

- Người dùng đăng nhập/onboard thành công.
- Người dùng có màn hình riêng để quản lý nước uống.
- Người dùng log nước trong 1-2 chạm.
- Người dùng log creatine và nhận nhắc đúng cấu hình.
- Người dùng chọn được lịch tập mẫu.
- Người dùng chỉnh được routine theo nhu cầu cá nhân.
- Người dùng import được routine từ Excel/CSV với preview.
- Người dùng bắt đầu buổi tập, log từng set, nhập reps thực tế và dùng rest timer.
- Rest timer có thông báo khi hết giờ nghỉ nếu notification được bật.
- Người dùng đổi được thứ tự bài trong lúc tập mà không phá lịch gốc.
- Người dùng xem được lịch sử tập, progress và body metrics.
- Offline logging hoạt động và sync queue xử lý được khi online lại.
- Export/import dữ liệu cơ bản hoạt động.
- Leaderboard mặc định private và chỉ bật khi user opt-in.

## 6. Thứ tự triển khai đề xuất

1. Tách navigation và màn hình V1: Hydration, Workout, Progress, Settings.
2. Hoàn thiện hydration/creatine goal, quick log và reminder model.
3. Hoàn thiện notification permission, Web Push và rest timer notification.
4. Hoàn thiện routine template và routine editor.
5. Thêm import Excel/CSV routine với preview/validation.
6. Hoàn thiện Live Workout: complete set, reps input, rest timer, skip/reorder exercise.
7. Hoàn thiện workout history và progress analytics cơ bản.
8. Hoàn thiện body metrics chart.
9. Hoàn thiện offline sync queue và idempotency.
10. Hoàn thiện export/import dữ liệu và privacy settings.
11. Thêm tests cho hydration, creatine, routine import, live workout và sync.

## 7. Ghi chú thiết kế chức năng

- Today không nên chứa quá nhiều thứ. Today chỉ nên là overview ngắn và đường dẫn nhanh sang Hydration hoặc Workout.
- Hydration là khu vực riêng vì nước uống có mục tiêu, log, nhắc và lịch sử riêng.
- Workout là khu vực riêng vì khi đang tập người dùng cần focus mode, rest timer và thao tác set nhanh.
- Creatine hiện là loại supplement duy nhất trong V1; các loại đồ uống/supplement khác mở rộng sau.
- AI Coach để sau V1, vì cần dữ liệu đủ tốt và guardrail rõ ràng trước khi đưa lời khuyên tự động.
