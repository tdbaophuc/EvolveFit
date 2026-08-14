1. Tổng quan Dự án
Mục tiêu: Xây dựng một ứng dụng web (hoạt động như app mobile) kết hợp giữa theo dõi lượng tiêu thụ (nước, creatine) và quản lý lịch tập cá nhân.

Triết lý thiết kế (Core UX): Trải nghiệm "1-chạm" (Frictionless). Thao tác cực nhanh ngay trong thời gian nghỉ giữa các set tập hoặc ngay sau khi uống nước, không yêu cầu nhập liệu phức tạp bằng bàn phím.

Mô hình hoạt động: PWA (Progressive Web App) - Tải web về màn hình chính điện thoại, ẩn thanh trình duyệt, hoạt động mượt mà như Native App.

2. Các tính năng cốt lõi (Core Features)
A. Tracking Tiêu thụ (Nước, Creatine, Thực phẩm bổ sung)

Giao diện: Các nút bấm khổng lồ (Widget) trên trang chủ (VD: + 250ml Nước, + 5g Creatine).

Thao tác: Bấm 1 lần -> Ghi nhận ngay lập tức kèm thông báo nhỏ (Toast).

Hiển thị: Vòng tròn tiến độ (Progress Ring) thể hiện mục tiêu trong ngày. Reset tự động vào 0:00.

B. Quản lý Lịch tập & Chỉ số cơ thể

Live Workout Mode: Chế độ màn hình luôn sáng trong lúc tập. Hiển thị sẵn bài tập, mức tạ và số rep của tuần trước.

Log kết quả: Sử dụng các nút bấm [-] và [+] lớn để điều chỉnh số rep/tạ đạt được, kèm một nút to "Hoàn thành Set".

Chỉ số cơ thể: Lưu trữ và vẽ biểu đồ biến động cân nặng, chiều cao, tỷ lệ mỡ.

C. Tự động hóa & AI tối ưu lịch tập

Hard Data (Công thức cứng): Áp dụng quy tắc Progressive Overload. Nếu hoàn thành đủ set/rep mục tiêu, hệ thống tự động điều chỉnh tăng tạ hoặc rep cho buổi tập tuần sau.

AI Adjustment (Linh hoạt hóa): Tích hợp AI để xử lý các tình huống bất ngờ. App thu thập cảm nhận người dùng (RPE - thang đo độ mệt mỏi) hoặc tình trạng (mất ngủ, đau cơ). AI sẽ phân tích và đề xuất đổi lịch (VD: Đổi buổi tập Chân sang ngày khác, chuyển sang tập thân trên nhẹ nhàng).

D. Hệ thống Thông báo nhắc nhở (Push Notifications)

Logic: Kiểm tra dữ liệu định kỳ. Ví dụ: Nếu đến 14:00 mà tổng lượng nước tiêu thụ dưới 1 lít, hệ thống sẽ trigger cảnh báo.

Hiển thị: Bắn thông báo đẩy (Push Notification) trực tiếp xuống điện thoại giống hệt các ứng dụng nhắn tin.

3. Kiến trúc Kỹ thuật & Tech Stack (Tối ưu Free & Nhanh)
Để đảm bảo yêu cầu deploy miễn phí 100%, không bị tình trạng server "ngủ đông" gây chậm trễ khi bấm nút, và tối ưu cho PWA, hệ thống sử dụng kiến trúc Serverless:

Frontend & API (Fullstack Framework): Next.js

Xây dựng giao diện UI (React) tối ưu mobile-first (sử dụng TailwindCSS).

Tích hợp thư viện next-pwa để cấu hình Manifest và Service Worker.

Sử dụng Serverless Functions (API Routes) của Next.js để xử lý logic, thay thế cho việc duy trì một server backend chạy 24/7.

Database & Authentication: Supabase

Cung cấp cơ sở dữ liệu PostgreSQL mạnh mẽ, hoàn hảo để thiết kế các bảng có tính quan hệ chặt chẽ (như Lịch tập, Bài tập, Lịch sử tiêu thụ) thay vì dùng các cấu trúc document (như MongoDB).

Tích hợp sẵn hệ thống đăng nhập/đăng ký.

Tốc độ phản hồi cực nhanh, phù hợp cho thao tác 1-chạm.

AI Integration: Google Gemini API

Sử dụng gói Free tier để xử lý các prompt phân tích thể trạng và điều chỉnh lịch tập thông minh.

Thông báo & Tự động hóa:

Vercel Cron Jobs: Chạy lịch trình tự động (VD: cứ mỗi 2 tiếng kiểm tra lượng nước một lần) hoàn toàn miễn phí.

Firebase Cloud Messaging (FCM): Dịch vụ gửi thông báo đẩy tới trình duyệt di động.

4. Quy trình Triển khai (Deployment)
Code hoàn thiện lưu trữ trên GitHub.

Kết nối GitHub repository với Vercel. Mỗi khi code được push lên, Vercel sẽ tự động build và deploy lên một tên miền miễn phí.

Vercel Edge Network đảm bảo API phản hồi tức thì trên toàn cầu.

Người dùng mở link web trên Safari/Chrome ở điện thoại -> Chọn Add to Home Screen -> Đăng nhập 1 lần và sử dụng như App bình thường.