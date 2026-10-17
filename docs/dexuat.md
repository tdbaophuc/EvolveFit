
**I. Những thành phần tuyệt đối không hiển thị ở Production**

-   **Khối "Thiết lập nhanh Account":** Không được để form cài đặt ban đầu (Tên, Email, Cân nặng) hiển thị ở mọi tab. Mảng này chiếm tới 30% diện tích màn hình. Hãy đẩy nó vào luồng Onboarding (chỉ hiện 1 lần duy nhất khi mới tải app) hoặc giấu gọn vào tab Cài đặt.
    
-   **Các trạng thái lỗi hoặc rỗng (Empty States) cẩu thả:** Biểu đồ "Xu hướng 7 ngày" bị lỗi render chỉ hiện 2 vệt màu chìm, hoặc các mảng text lặp lại vô nghĩa ("Chưa bật chia sẻ", "Chưa có bài chia sẻ") làm giảm sự chuyên nghiệp của sản phẩm. Phải thay bằng minh họa (illustration) trống hoặc một nút Call-to-Action duy nhất.
    
-   **Thành phần gây hiểu lầm (False Affordance):** Khối hiển thị dữ liệu "Lần trước" (VD: 42.5kg x 8) đang được tạo hình giống hệt ô nhập liệu. Cần chuyển thành text thuần túy hoặc làm mờ nền (disabled state) để tránh việc người dùng bấm vào vô ích.
    
-   **Các nút điều hướng thừa thãi:** Nút "Mở màn nước" to bản ngay trên tab Hôm nay là thao tác thừa khi người dùng đã có icon "Nước" ngay dưới Bottom Navigation.
    

**II. Cải tiến UX/UI cốt lõi cho môi trường thực tế**

-   **Thiết kế cho bàn tay đổ mồ hôi (Sweaty-hands UX):** Tại tab Tập luyện, việc bắt người dùng gõ từng con số bằng bàn phím mặc định của điện thoại là một cực hình khi tập gym. Cần thay thế bằng cụm nút bấm nhanh (`+2.5kg`, `-1kg`, `+1 rep`) hoặc thiết kế một Numpad to bản bật lên từ dưới đáy màn hình.
    
-   **Quy hoạch lại không gian nhập liệu (Giảm Cognitive Load):** Khối thẻ bài tập đang bị nhồi nhét quá nhiều ô lưới. Hãy gộp các trường không cần thiết (Rep tối thiểu/tối đa gộp thành "8-10") và dàn danh sách Set theo từng hàng ngang để không gian thở tốt hơn.
    
-   **Chuẩn hóa kích thước điểm chạm (Touch Target):** Các nút thao tác nhỏ nhắn như cụm `+`, `-`, `Thùng rác` trong lịch sử uống nước phải được nâng kích thước lên tối thiểu 44x44px. Chúng đang nằm quá sát nhau, đảm bảo 90% người dùng sẽ bấm nhầm khi đi đường hoặc đang tập mệt.
    
-   **Loại bỏ UI mặc định của trình duyệt:** Thay thế toàn bộ các thẻ Dropdown (chọn đơn vị, chọn nhóm cơ) đang dùng thẻ `<select>` nguyên bản bằng các UI component tùy chỉnh (như Radix UI hoặc Headless UI) để đồng bộ trải nghiệm mượt mà giữa iOS và Android.
    
-   **Xử lý phân tầng hiển thị (Z-index):** Đẩy thanh Toast thông báo ("Đã hết giờ nghỉ...") lên cao hơn Bottom Navigation khoảng `80px` để không che khuất các nút điều hướng quan trọng, đồng thời bo góc nhẹ cho đồng bộ với thiết kế tổng thể.
    
-   **Giải quyết các "Bức tường chữ":** Lời khuyên của AI Coach đang là một đoạn văn quá dài với font chữ nhỏ. Phải chắt lọc thành các gạch đầu dòng ngắn gọn (bullet points) hoặc bôi đậm các chỉ số cốt lõi. Người dùng phòng gym chỉ có 3-5 giây để nhìn màn hình.
    
-   **Chuẩn hóa Padding và Độ tương phản:** Đưa lề (padding) của mọi thẻ (card) về một thông số đồng đều (16px hoặc 20px). Làm đậm tone màu của các đoạn text phụ (như "Gợi ý theo cân nặng") và các cột biểu đồ nhạt để đảm bảo khả năng đọc dưới ánh sáng mạnh ngoài trời hoặc ánh đèn chói trong phòng tập.