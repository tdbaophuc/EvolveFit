# EvolveFit - Gap còn lại

Cập nhật: 2026-08-23

Các gap dưới đây là phần còn lại để đưa dự án tiến xa hơn sau trạng thái hiện tại. Không nên xử lý opportunistic nếu chưa có quyết định sản phẩm hoặc môi trường production tương ứng.

## Gap lớn

| Gap | Trạng thái | Việc cần làm tiếp |
|---|---|---|
| Native mobile/watch | Chưa có | Quyết định PWA có đủ không; nếu cần thì tạo kế hoạch Expo/React Native và watch quick actions. |
| Progress photos | Chưa có | Thiết kế model metadata, storage private, compare view, export/delete flow. |
| Nutrition tracking | Chưa quyết định | Làm decision doc trước để tránh làm loãng core hydration/workout. |
| Exercise library nâng cao | Một phần | Thêm primary/secondary muscles, cues, hướng dẫn, import/export custom library nếu cần V1.1. |
| Supabase auth merge data | Một phần | Làm UX merge/replace dữ liệu local sau login và test tương ứng. |
| Production sync proof | Một phần | Chạy contract/integration test với Supabase staging hoặc test project thật. |
| Web Push/cron production proof | Một phần | Xác minh VAPID, cron secret, real browser subscription và delivery. |
| Dedicated Coach tab | Quyết định sản phẩm | Hiện coach nằm trong Tiến độ; cần quyết định có tách thành tab riêng không. |

## Lưu ý phát triển tiếp

- Giữ local-first làm mặc định cho mọi workflow hằng ngày.
- Không bật sync sức khỏe thật nếu `nativeBridgeAvailable` chưa được xác nhận.
- Mọi copy UI mới cần là tiếng Việt, trừ tên bài tập.
- Với tính năng production backend, cần test không chỉ mock/local contract.

