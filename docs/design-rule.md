
Dưới đây là thông số thiết kế chi tiết (UI Specifications) cho các màn hình phiên bản  **Light Mode**  của EvolveFit, dựa trên hệ thống thiết kế và các màn hình hiện có trên Canvas:

### 1. Phong cách thiết kế (Design Style)

-   **Chủ đạo:**  Modern Athletic, Clean, & Data-Focused.
-   **Cảm giác:**  Chuyên nghiệp, gọn gàng, ưu tiên khả năng đọc nhanh thông số (High Readability).
-   **Bố cục (Layout):**  Sử dụng hệ thống thẻ (Card-based layout) với Padding ngang tiêu chuẩn 16px. Các thành phần chính được thiết kế kích thước lớn để tối ưu thao tác bằng ngón cái (Thumb-friendly).

### 2. Bảng màu (Color Palette) - Dựa trên Design System 1

-   **Nền (Background):**  `#F8FAFC`  (Slate 50) - Tạo cảm giác sạch sẽ, thoáng đãng.
-   **Thẻ (Surface/Cards):**  `#FFFFFF`  (Trắng) với đổ bóng cực nhẹ hoặc viền mảnh  `#E2E8F0`.
-   **Văn bản (Typography colors):**
    -   Chính (Primary):  `#0F172A`  (Slate 900).
    -   Phụ (Secondary/Caption):  `#64748B`  (Slate 500).
-   **Màu nhấn theo ngữ cảnh (Semantic Accents):**
    -   **Nước uống (Hydration):**  `#38BDF8`  (Sky Blue) - Dùng cho vòng tiến độ, các nút +ml.
    -   **Tập luyện (Training):**  `#A3E635`  (Lime Green) - Dùng cho nút hành động chính (Bắt đầu tập), PRs, và các chỉ số tập luyện.
    -   **Phục hồi/Coach:**  `#A78BFA`  (Violet) - Dùng cho các chỉ số sẵn sàng (Readiness).

### 3. Hệ thống Font chữ (Typography Scale)

-   **Font Family:**  `Geist`  (hoặc Inter/SF Pro làm fallback). Không dùng font mảnh, ưu tiên Medium/Semibold cho các tiêu đề.
-   **Thông số cỡ chữ:**
    -   **Hero Metrics (Số lượng nước, PR):**  40px - 48px, Bold.
    -   **Tiêu đề màn hình (Top Bar):**  18px, Semibold, Căn giữa.
    -   **Tiêu đề mục (Section Titles):**  20px, Semibold.
    -   **Tiêu đề thẻ (Card Titles):**  16px, Semibold.
    -   **Nội dung chính (Body):**  14px - 15px, Regular/Medium.
    -   **Chú thích (Caption/Subtext):**  12px, Regular.

### 4. Chi tiết thành phần (Component Specs)

-   **Độ bo góc (Border Radius):**
    -   Thẻ (Cards):  `8px`.
    -   Nút bấm lớn (Primary Buttons):  `12px`.
    -   Thanh tiến độ/Chip:  `Full Round`  (Capsule shape).
-   **Khoảng cách (Spacing):**
    -   Padding màn hình:  `16px`.
    -   Khoảng cách giữa các Section:  `24px`.
    -   Khoảng cách nội bộ trong thẻ:  `12px - 16px`.
-   **Navigation:**
    -   **Top Bar:**  Cao 56px, tiêu đề thứ trong tuần nằm chính giữa, icon Avatar bên trái, icon Thông báo bên phải.
    -   **Bottom Tab Bar:**  Cao 72px, hiệu ứng mờ nền (Backdrop blur), icon kèm nhãn chữ phía dưới.

### 5. Đặc điểm các màn hình cụ thể

-   **Hôm nay:**  Tập trung vào vòng tròn tiến độ nước lớn ở trung tâm và các nút log nhanh 1 chạm.
-   **Lịch tập:**  Sử dụng các Chip ngày nằm ngang (Horizontal Calendar) với trạng thái Active là màu Lime Green.
-   **Trong buổi tập (Live Workout):**  Chuyển sang Focus Mode, các con số tạ/reps được đặt trong các ô nhập liệu lớn với nút [+] [-] dễ bấm.
-   **Tiến độ:**  Sử dụng biểu đồ cột (Bar Chart) với màu gradient từ Sky Blue (Nước) sang Lime Green (Tập luyện) để phân biệt dữ liệu.