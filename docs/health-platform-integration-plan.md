# EvolveFit - Kế hoạch Health Platform

Cập nhật: 2026-08-23

## Phạm vi hiện tại

Epic Health Connect / Apple Health đã hoàn tất ở mức webapp-ready contract. PWA lưu lựa chọn nền tảng, nhóm dữ liệu, mapping đơn vị, xác nhận quyền riêng tư và trạng thái yêu cầu quyền. Web app hiện không đọc hoặc ghi trực tiếp vào Health Connect hay Apple Health.

## Ràng buộc nền tảng

- Health Connect cần Android Health Connect SDK trong app Android/native shell.
- Apple Health cần HealthKit trong app iOS, capability HealthKit và usage description tương ứng.
- Browser PWA không có chuẩn truy cập trực tiếp vào Health Connect hoặc HealthKit.
- Sync thật cần native bridge, Capacitor/Cordova plugin, React Native/Expo module hoặc một provider integration khác.

## Contract đang có

`HealthIntegrationSettings` lưu:

- `provider`: `health-connect` hoặc `apple-health`
- `selectedDataTypes`: `weight`, `workout`, `hydration`
- `unitMapping`: cân nặng `kg/lb`, nước `ml/oz`, quãng đường `km/mi`
- `privacyAccepted`: người dùng xác nhận trước khi sync
- `nativeBridgeAvailable`: hiện là `false` trong web app
- `permissionStatus`: `not_requested`, `requested`, `granted`, `denied`, `revoked`

`canSyncHealthData` chỉ trả về true khi native bridge khả dụng, người dùng đã đồng ý quyền riêng tư, nền tảng đã cấp quyền và loại dữ liệu đó được chọn.

## UX rule

Màn Cài đặt được phép lưu yêu cầu quyền và nhóm dữ liệu, nhưng phải hiển thị từng nhóm là chưa đồng bộ cho đến khi native bridge xác nhận quyền thật. Không có sync nền ngầm từ web-only implementation.

## Tài liệu tham chiếu

- https://developer.android.com/health-and-fitness/health-connect/get-started
- https://developer.apple.com/documentation/healthkit
- https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data

