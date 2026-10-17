
### 1. Phân rã cấu trúc (Component Tree)

Thay vì nhìn vào toàn bộ trang chủ, bạn hãy chia nó thành 3 khối (Component) độc lập:

-   **Main Layout (Bố cục tổng):** Chứa ảnh nền cành trúc và khung định vị cho toàn bộ app.
    
-   **TaiChi Widget (Vòng tròn trung tâm):** Component phức tạp nhất, chịu trách nhiệm nhận dữ liệu % và hiển thị mức nước/mực.
    
-   **Info Cards (Các thẻ thông tin):** Tam thoi Giu nguyen
    

### 2. Giải pháp lắp ráp: Main Layout (Khung nền)

-   **Mục tiêu:** Tạo không gian chứa có ảnh nền thủy mặc.
    
-   **Giải pháp:** Bạn sử dụng file `background.png` làm ảnh nền tảng (background-image) cho thẻ bao bọc toàn bộ ứng dụng. Cài đặt chế độ hiển thị phủ kín màn hình (cover) và cố định ở giữa. Điều này giúp các họa tiết cành trúc luôn nằm đúng vị trí dù màn hình điện thoại dài hay ngắn.
    

### 3. Giải pháp lắp ráp: TaiChi Widget (Vòng tròn động)

Đây là trái tim của giao diện. Bạn hãy xây dựng Component này như một **"Hộp kính 3 lớp"** xếp chồng khít lên nhau (Absolute Positioning). Component này sẽ nhận 2 thông số đầu vào (Props) là `% Khối lượng tập` và `% Lượng nước uống`.

-   **Lớp 1 (Dưới cùng) - Phần mực xám:** Đặt file `shang.jpg` vào. Vì file này nền đen, hãy hướng dẫn bộ phận UI áp dụng hiệu ứng trộn màu (Blend Mode: Screen) để lọc bỏ màu đen, chỉ giữ lại phần xám. Để tạo hiệu ứng 20%, sử dụng kỹ thuật "cắt mặt nạ" (Clip-path) để cắt bỏ phần thừa phía dưới, chỉ cho hiển thị từ trên đỉnh chóp rơi xuống đúng bằng % khối lượng tập.
    
-   **Lớp 2 (Ở giữa) - Phần nước xanh:** Đặt file `chi.png` vào. Tương tự lớp 1, dùng hiệu ứng trộn màu (Screen) để xóa phông đen. Tuy nhiên, phần mặt nạ cắt (Clip-path) sẽ hoạt động ngược lại: Cắt bỏ phần trên, chỉ hiển thị ảnh dâng từ dưới đáy lên tương ứng với % lượng nước (ví dụ 70%).
    
-   **Lớp 3 (Trên cùng) - Viền bao quanh:** Đặt file `shangchi.jpg` đè lên cùng. Khác với 2 lớp dưới, file này phải dùng bộ lọc đảo màu (Invert) để biến đen thành trắng, trắng thành đen. Sau đó, dùng hiệu ứng trộn màu (Blend Mode: Multiply) để phần màu trắng biến mất trong suốt, chừa lại đúng nét cọ viền đen dán đè lên trên hai lớp nước và mực kia.