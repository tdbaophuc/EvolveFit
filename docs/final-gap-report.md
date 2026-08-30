# EvolveFit - Gap còn lại

Cập nhật: 2026-08-25

Các gap dưới đây là phần còn lại để đưa dự án tiến xa hơn sau trạng thái hiện tại. Không nên xử lý phát sinh nếu chưa có quyết định sản phẩm hoặc môi trường production tương ứng.

## Gap lớn

| Gap | Trạng thái | Việc cần làm tiếp |
|---|---|---|
| Mobile/watch native | Chưa có | Quyết định PWA có đủ không; nếu cần thì tạo kế hoạch Expo/React Native và thao tác nhanh trên đồng hồ. |
| Ảnh tiến độ | Chưa có | Thiết kế metadata, lưu trữ riêng tư, màn so sánh, luồng xuất/xóa. |
| Nutrition tracking | Chưa quyết định | Làm decision doc trước để tránh làm loãng core hydration/workout. |
| Exercise library nâng cao | Một phần | Thêm primary/secondary muscles, cues, hướng dẫn, import/export custom library nếu cần V1.1. |
| Gộp dữ liệu sau đăng nhập Supabase | Một phần | Làm UX gộp/thay thế dữ liệu trên máy sau đăng nhập và test tương ứng. |
| Production sync proof | Một phần | Chạy contract/integration test với Supabase staging hoặc test project thật. |
| Web Push/cron production proof | Một phần | Xác minh VAPID, cron secret, real browser subscription và delivery. |
| Tab Coach riêng | Quyết định sản phẩm | Hiện coach nằm trong Tiến độ; cần quyết định có tách thành tab riêng không. |
| API error copy tiếng Việt | Ghi nhận để sửa sau | `src/lib/api.ts` vẫn trả một số lỗi contract/backend bằng tiếng Anh như `name is required`, `items must be an array`, `queue must contain valid exercise items`. Cần thống nhất thông điệp lỗi API trước khi đổi vì có thể ảnh hưởng client/contract test. |

## Lưu ý phát triển tiếp

- Giữ local-first làm mặc định cho mọi workflow hằng ngày.
- Không bật sync sức khỏe thật nếu `nativeBridgeAvailable` chưa được xác nhận.
- Mọi copy UI mới cần là tiếng Việt, trừ tên bài tập.
- Với tính năng production backend, cần test không chỉ mock/local contract.
- Khi sửa API error copy, cần rà lại OpenAPI/client test để tránh đổi contract ngoài ý muốn.
