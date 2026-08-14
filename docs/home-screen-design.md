### 1. Thanh điều hướng trên cùng (Top App Bar)

-   **Cấu trúc:**  Một dải ngang cao 56px, cố định sát mép trên.
-   **Thành phần:**
    -   **Trái:**  Ảnh đại diện người dùng (Avatar) kích thước 32x32px.
    -   **Giữa:**  Tiêu đề ngày tháng (ví dụ: "Thứ Năm, 26 Thg 10") sử dụng font Semibold, cỡ chữ 17px, giúp định vị thời gian tức thì.
    -   **Phải:**  Icon thông báo (chuông) để truy cập nhanh các nhắc nhở.

### 2. Khu vực theo dõi Nước uống (Hydration Hero Section)

Đây là phần quan trọng nhất của màn hình, được thiết kế để nhìn thấy ngay tiến độ trong 5 giây.

-   **Vòng tròn tiến độ (Metric Ring):**  Một vòng tròn lớn chiếm 1/3 diện tích phía trên. Màu xanh Cyan biểu thị lượng nước đã uống (`1,250ml`) trên mục tiêu (`2,500ml`).
-   **Thông tin chi tiết:**  Số liệu được đặt chính giữa vòng tròn với font Bold lớn (40px). Bên dưới có nhãn trạng thái "Đúng tiến độ" trong một chip nhỏ.
-   **Nút Log nhanh (Quick Add Grid):**  3 nút bấm lớn (+250ml, +500ml, +750ml) được dàn hàng ngang. Mỗi nút cao 56px, bo góc 12px, giúp log nước chỉ với 1 chạm.
-   **Thanh trượt tùy chỉnh (Custom Slider):**  Một thanh trượt ngang tinh tế để người dùng nhập chính xác lượng nước không nằm trong danh sách nút nhanh.

### 3. Khu vực Thực phẩm bổ sung (Supplement Row)

-   **Bố cục:**  Một thẻ (Card) nằm ngang mỏng.
-   **Thành phần:**  Icon "Creatine", tên sản phẩm và liều lượng (`5g Daily`).
-   **Hành động:**  Nút "Ghi nhận" (Filled Button) màu Amber nhạt, nổi bật nhưng không lấn át nút tập luyện.

### 4. Thẻ Buổi tập hôm nay (Workout Today Card)

-   **Bố cục:**  Một thẻ lớn, bo góc 8px với viền nhấn màu xanh Lime ở cạnh trái (đã được lược bỏ theo yêu cầu mới nhất để trông thoáng hơn).
-   **Nội dung:**
    -   **Tiêu đề:**  "Push Day" (font Semibold 18px).
    -   **Thông số:**  "6 bài tập • ~45 phút" đi kèm icon tạ nhỏ.
-   **Hành động chính (CTA):**  Nút  **"Bắt đầu tập"**  lớn, màu xanh Lime Green (`#A3E635`) toàn chiều ngang thẻ. Đây là nút quan trọng nhất trên màn hình, được tối ưu cho ngón cái.

### 5. Chỉ số sẵn sàng (Daily Readiness)

-   **Bố cục:**  Một khu vực gồm các Chip nhỏ nằm ở cuối danh sách cuộn.
-   **Thành phần:**  3 Chip: Năng lượng (Energy), Giấc ngủ (Sleep), Độ mỏi cơ (Soreness). Mỗi chip có màu sắc nhẹ nhàng (Violet/Neutral) để phân biệt với nước và tập luyện.

### 6. Thanh điều hướng dưới (Bottom Tab Bar)

-   **Cấu trúc:**  Cao 72px, cố định ở đáy màn hình.
-   **Thành phần:**  5 Tab (Hôm nay, Tập luyện, Tiến độ, HLV, Cài đặt).
-   **Trạng thái:**  Tab "Hôm nay" được kích hoạt với icon và chữ màu xanh chủ đạo, có hiệu ứng đổ bóng hoặc đường kẻ mờ phía trên để tách biệt với nội dung cuộn.

----------

**Quy tắc chung về Spacing:**

-   **Padding lề:**  Luôn duy trì 16px ở hai bên trái/phải.
-   **Khoảng cách dọc (Gap):**  Giữa các thẻ chính là 24px để tạo nhịp thở cho giao diện.
-   **Bo góc:**  Card là 8px, Nút bấm là 12px.