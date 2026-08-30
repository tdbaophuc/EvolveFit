# EvolveFit - Trạng thái dự án mới nhất

Cập nhật: 2026-08-25

Tài liệu này là nguồn tham chiếu hiện tại cho việc tiếp tục phát triển EvolveFit. Các tài liệu kế hoạch cũ đã được gỡ bỏ vì bị trùng lặp, lỗi mã hóa tiếng Việt hoặc không còn phản ánh đúng codebase.

## Trạng thái tổng quan

EvolveFit hiện là PWA fitness lưu trên máy trước, tập trung vào nước, bổ sung, lịch tập, buổi tập đang chạy, tiến độ, quyền riêng tư và các hợp đồng API/đồng bộ. Giao diện người dùng đã được Việt hóa; tên bài tập vẫn được giữ nguyên như dữ liệu bài tập.

## Màn hình chính

| Màn hình | Trạng thái | Ghi chú |
|---|---|---|
| Hôm nay | Hoàn tất | Tổng quan nước, buổi tập hôm nay, creatine, hoạt động gần đây. |
| Nước | Hoàn tất | Log nhanh, log tùy chỉnh, loại đồ uống, lịch sử, nhắc nước. |
| Tập luyện | Hoàn tất | Chế độ kế hoạch, chế độ buổi tập đang chạy, hàng đợi buổi tập, đồng hồ nghỉ, bộ tính đĩa tạ, PR live. |
| Tiến độ | Hoàn tất | Bảng điều khiển nước/tập luyện, e1RM, PR, chỉ số cơ thể, báo cáo, chia sẻ riêng tư. |
| Cài đặt | Hoàn tất | Hồ sơ, module thức uống, quyền riêng tư, nền tảng sức khỏe, Web Push, hàng đợi đồng bộ, nhập/xuất dữ liệu. |

## Năng lực đã có

| Nhóm | Trạng thái |
|---|---|
| Module thức uống và hệ số tính nước | Hoàn tất |
| Creatine và ghi nhận bổ sung | Hoàn tất |
| Mô hình lịch tập, ngày tập, chỉnh mục tiêu bài tập | Hoàn tất |
| Thư viện bài tập có lọc, bài tùy chỉnh, dụng cụ và kiểu chuyển động | Hoàn tất ở mức cơ bản |
| Buổi tập, hàng đợi, bỏ qua/sắp xếp/lưu thứ tự | Hoàn tất |
| Warm-up/drop/failure/superset set types | Hoàn tất |
| Plate calculator | Hoàn tất |
| PR list và live PR notification | Hoàn tất |
| Bảng điều khiển tiến độ 7/30 ngày | Hoàn tất |
| Body metrics, validation, chart range | Hoàn tất |
| Báo cáo tuần/tháng và xuất PDF | Hoàn tất |
| Nhập/xuất JSON/CSV, khôi phục có chọn lọc | Hoàn tất |
| Quyền riêng tư xã hội, bảng xếp hạng bạn bè, lọc dữ liệu chia sẻ | Hoàn tất |
| Supabase auth/API/schema/RLS contracts | Có contract và test |
| Hàng đợi đồng bộ, thử lại, xử lý xung đột | Có contract và UI; cần chứng minh production |
| Web Push/cron reminders | Có contract và UI; cần xác minh staging/production |
| Health Connect/Apple Health | Hoàn tất UX/contract web; cần cầu nối ứng dụng để đồng bộ thật |
| AI coach | Hoàn tất với giới hạn an toàn và cơ chế dự phòng |

## Quy tắc giao diện hiện tại

- Tất cả nội dung hiển thị trong UI phải là tiếng Việt, trừ tên bài tập.
- Không hiển thị trực tiếp enum/status kỹ thuật như `pending`, `failed`, `private-friends`, `not_requested`.
- Nếu thêm trường mới có thể hiện trong UI, cần có hàm label tiếng Việt hoặc map hiển thị tương ứng.
- Các tên bài tập built-in như `Barbell Bench Press`, `Lat Pulldown`, `Back Squat` được giữ nguyên.

## Xác minh gần nhất

Đã chạy thành công sau khi Việt hóa UI/copy và chỉnh responsive grid/action:

- `npm run lint`: ESLint passed.
- `npm test`: 12 file test, 121 test passed.
- `npm run build`: build Next.js production thành công.

## Ghi nhận sửa sau

- `src/lib/api.ts` còn một số thông báo lỗi API/backend bằng tiếng Anh. Đây là lớp contract/logic, cần sửa trong vòng riêng để cập nhật test và đảm bảo client không phụ thuộc chuỗi lỗi cũ.
