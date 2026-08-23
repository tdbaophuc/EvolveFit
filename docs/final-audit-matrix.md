# EvolveFit - Trạng thái dự án mới nhất

Cập nhật: 2026-08-23

Tài liệu này là nguồn tham chiếu hiện tại cho việc tiếp tục phát triển EvolveFit. Các tài liệu kế hoạch cũ đã được gỡ bỏ vì bị trùng lặp, lỗi mã hóa tiếng Việt hoặc không còn phản ánh đúng codebase.

## Trạng thái tổng quan

EvolveFit hiện là PWA fitness local-first, tập trung vào nước, supplement, lịch tập, live workout, tiến độ, quyền riêng tư và các contract backend/sync. Giao diện người dùng đã được Việt hóa; tên bài tập vẫn được giữ nguyên như dữ liệu bài tập.

## Màn hình chính

| Màn hình | Trạng thái | Ghi chú |
|---|---|---|
| Hôm nay | Hoàn tất | Tổng quan nước, workout hôm nay, creatine, hoạt động gần đây. |
| Nước | Hoàn tất | Log nhanh, log tùy chỉnh, loại đồ uống, lịch sử, nhắc nước. |
| Tập luyện | Hoàn tất | Plan mode, live mode, queue buổi tập, rest timer, plate calculator, PR live. |
| Tiến độ | Hoàn tất | Dashboard nước/tập luyện, e1RM, PR, chỉ số cơ thể, report, chia sẻ riêng tư. |
| Cài đặt | Hoàn tất | Hồ sơ, module thức uống, quyền riêng tư, Health platform, Web Push, sync queue, import/export. |

## Năng lực đã có

| Nhóm | Trạng thái |
|---|---|
| Drink modules và hydration factor | Hoàn tất |
| Creatine và supplement logging | Hoàn tất |
| Routine model, workout days, exercise target editor | Hoàn tất |
| Exercise library có filter, custom exercise, equipment và movement pattern | Hoàn tất ở mức cơ bản |
| Workout session, queue, skip/reorder/save order | Hoàn tất |
| Warm-up/drop/failure/superset set types | Hoàn tất |
| Plate calculator | Hoàn tất |
| PR list và live PR notification | Hoàn tất |
| Progress dashboard 7/30 ngày | Hoàn tất |
| Body metrics, validation, chart range | Hoàn tất |
| Weekly/monthly reports và PDF export | Hoàn tất |
| Import/export JSON/CSV, selective restore | Hoàn tất |
| Social privacy, friend leaderboard, share redaction | Hoàn tất |
| Supabase auth/API/schema/RLS contracts | Có contract và test |
| Sync queue, retry, conflict handling | Có contract và UI; cần chứng minh production |
| Web Push/cron reminders | Có contract và UI; cần xác minh staging/production |
| Health Connect/Apple Health | Hoàn tất UX/contract web; cần native bridge để sync thật |
| AI coach | Hoàn tất với guardrail và fallback |

## Quy tắc giao diện hiện tại

- Tất cả nội dung hiển thị trong UI phải là tiếng Việt, trừ tên bài tập.
- Không hiển thị trực tiếp enum/status kỹ thuật như `pending`, `failed`, `private-friends`, `not_requested`.
- Nếu thêm trường mới có thể hiện trong UI, cần có hàm label tiếng Việt hoặc map hiển thị tương ứng.
- Các tên bài tập built-in như `Barbell Bench Press`, `Lat Pulldown`, `Back Squat` được giữ nguyên.

## Xác minh gần nhất

Đã chạy thành công sau khi Việt hóa UI:

- `npm test`: 12 file test, 120 test passed.
- `npm run build`: build Next.js production thành công.

