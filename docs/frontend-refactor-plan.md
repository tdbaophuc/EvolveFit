# Kế hoạch refactor frontend EvolveFit

Cập nhật: 2026-10-17
Phạm vi: `apps/web` (Next.js 15, React 19). Backend `apps/api` trên Render và `packages/shared` giữ nguyên contract. Mọi thay đổi API, nếu có, phải đi kèm test backend.

Nguồn tham chiếu:
- `docs/evolvefit-production-ui-ux-redesign-brief.md`: định hướng UX, progressive disclosure, IA.
- `docs/evolvefit-production-screen-ui-design-spec.md`: design system và spec từng màn hình.
- `docs/webapp-feature-overview.md`: danh sách chức năng phải giữ.
- `docs/TrangChu giao dien.md` và `apps/web/public/assets/trangchu/`: ý tưởng trang chủ thuỷ mặc (xem quyết định D2).

---

## 1. Hiện trạng sau khi quét

### 1.1 Số liệu

| Hạng mục | Hiện trạng |
|---|---|
| Tổng code `apps/web/src` | ~12.700 dòng |
| `evolvefit-app.tsx` | **2.337 dòng**, 54 `useState`, 14 `useEffect`, ~100 hàm xử lý. Toàn bộ nghiệp vụ nằm trong một component. |
| `settings-sections.tsx` | 978 dòng |
| `globals.css` | **3.193 dòng**, một file CSS toàn cục, chỉ 25 CSS variable, chưa có design token thống nhất |
| `admin/page.tsx` | 703 dòng, tự quản lý auth riêng |
| API client | 75 hàm, nhưng UI chỉ gọi **~25 hàm** |
| Test | 23 test (9 cho app, 5 cho admin, 9 cho api-client); không có test E2E |

### 1.2 Lỗi chức năng nghiêm trọng (gây ra triệu chứng "bấm đăng nhập/đăng ký không có gì")

| # | Vấn đề | Vị trí | Hậu quả |
|---|---|---|---|
| F1 | `request()` gọi `response.json()` mà không bắt lỗi mạng, timeout hay response không phải JSON | `src/lib/api-client.ts:492-504` | Khi Render đang ngủ (gói Free khởi động lại mất ~30–60s), bị lỗi CORS, hoặc trả HTML lỗi 502, promise bị reject. |
| F2 | `authenticateEmail` không có `try/catch`, không có trạng thái loading, không khoá nút | `evolvefit-app.tsx:1341` | Lỗi từ F1 trở thành *unhandled rejection*: không có toast, không có thông báo, người dùng tưởng nút chết. |
| F3 | Không có trạng thái "đang gửi"; nút vẫn bấm được nhiều lần | `settings-sections.tsx:174-185` | Gửi request trùng; không có phản hồi nào trong lúc chờ backend khởi động. |
| F4 | Kiểm tra mật khẩu ở client là `>= 6` ký tự, backend yêu cầu `>= 8` khi đăng ký | `evolvefit-app.tsx:1342` | Lỗi chỉ hiện sau khi gọi API, thông báo chung chung. |
| F5 | Form đăng nhập dùng chung ô email với **hồ sơ** (`profile.email`); gõ email là sửa thẳng vào hồ sơ trên máy | `settings-sections.tsx:156-162` | Trộn nghiệp vụ "định danh tài khoản" với "hồ sơ"; gõ sai email cũng làm bẩn hồ sơ. |
| F6 | Form đăng nhập/đăng ký nằm sâu trong **Cài đặt → Hồ sơ**, chung một card với 9 nút (đăng ký, đăng nhập, Google, local, làm mới phiên, reset, đăng xuất, token reset, cập nhật mật khẩu) | `settings-sections.tsx:121-215` | Khó tìm; không đúng spec 6.3 / 9.7. |
| F7 | Onboarding chặn toàn bộ app (`if (!isOnboarded) return <OnboardingPanel/>`) và **không có lối "Tôi đã có tài khoản"** | `app-section-router.tsx:38`, `onboarding-panel.tsx` | Người dùng trên thiết bị mới phải đi hết 7 bước thiết lập rồi mới đăng nhập để lấy lại dữ liệu cloud. |
| F8 | Khi tải trang, app **không gọi** `GET /api/auth/session`; trạng thái đăng nhập chỉ dựa vào `profile.authMode` lưu trong localStorage | Không có lời gọi `evolveFitApiClient.session` nào | Cookie hết hạn hoặc đăng xuất ở thiết bị khác, nhưng UI vẫn coi là đã đăng nhập; sync bị 401 và hàng đợi bị đánh dấu "failed" mà không giải thích. |
| F9 | Không xử lý 401 / phiên hết hạn ở tầng chung (không tự refresh, không hỏi đăng nhập lại) | `api-client.ts`, vòng sync ở `evolvefit-app.tsx:~262` | Hàng đợi sync lỗi mãi mãi. |
| F10 | Đăng nhập Google không hoạt động trong cấu hình hiện tại (API ở `onrender.com`, callback đi qua rewrite của Vercel nên cookie rơi vào domain web) | `googleOAuthUrl()` + `next.config.ts` rewrites | Nút Google đưa người dùng vào một luồng hỏng. |
| F11 | Đăng xuất không xoá dữ liệu cá nhân trên máy | `signOutAccount` (`evolvefit-app.tsx:1424`) | Lộ dữ liệu trên máy dùng chung; vi phạm kỳ vọng "đăng xuất". |
| F12 | Toast: lúc thì tự tắt sau 5s (qua `commit`), lúc thì gọi `setToast` trực tiếp và **không bao giờ tắt**; nhiều `setTimeout` chồng nhau | `evolvefit-app.tsx:615-621` và nhiều chỗ | Thông báo cũ đè thông báo mới, hoặc treo mãi. |

### 1.3 Lỗi nghiệp vụ và kiến trúc dữ liệu

| # | Vấn đề | Hậu quả |
|---|---|---|
| B1 | **localStorage là nguồn dữ liệu duy nhất, kể cả khi đã đăng nhập.** Server chỉ nhận dữ liệu qua hàng đợi `sync/batch` một chiều (máy → cloud). Không có luồng kéo dữ liệu cloud về, trừ khi người dùng bấm "Dùng bản cloud". | Dùng nhiều thiết bị thì dữ liệu lệch nhau; backend không thực sự là source of truth như mục tiêu production. |
| B2 | Marketplace bài tập/lịch tập, coach, thành tích và leaderboard được **tính hoàn toàn ở client** từ seed trong `packages/shared`; ~50 endpoint backend (`/api/exercises/marketplace`, `/api/routine-templates`, `/api/coach/recommend`, `/api/achievements/me`...) không được dùng. | Nội dung admin xuất bản trên backend không bao giờ tới người dùng; leaderboard là dữ liệu giả. |
| B3 | Mỗi route (`/today`, `/workout`...) mount lại toàn bộ `EvolveFitApp`; chuyển tab bằng `window.history.pushState` thay vì router của Next | Hành vi back/forward của trình duyệt không đồng bộ với `tab` state; mất state UI (bộ lọc, form nháp) khi đổi route thật; không tận dụng được layout lồng nhau của App Router. |
| B4 | State khổng lồ một khối (`AppState`) + `setState` toàn cục + lưu toàn bộ localStorage sau **mỗi** thay đổi | Re-render toàn app mỗi lần gõ phím; lưu JSON lớn liên tục; giới hạn ~5MB của localStorage. |
| B5 | Form state tạm (cân nặng, set, bộ lọc thư viện...) nằm chung trong component gốc với giá trị mặc định hard-code (`"Lateral Raise"`, `"Cable Fly"`, `42.5kg`...) | Dữ liệu mẫu rò vào form thật; khó test. |
| B6 | Service worker cache **mọi** request GET, kể cả response API có cookie (dữ liệu cá nhân) từ Render; cache name `evolvefit-v1` không bao giờ đổi | Dữ liệu cá nhân bị lưu trong CacheStorage; offline thì trả HTML hoặc API cũ; phải unregister thủ công mới thấy bản mới. |
| B7 | Admin page tự đăng nhập riêng (gửi `mode: "local"` kèm mật khẩu), không dùng chung auth với app | Hai luồng auth khác nhau, khó bảo trì. |
| B8 | 9 file dùng chuỗi tiếng Việt dạng escape `á...` thay vì UTF-8 | Không đọc hay review được copy; dễ sai chính tả. |

### 1.4 UX/UI (đối chiếu spec mục 1 "Current UI Diagnosis")

- Spec đã ghi nhận đúng: typography và kiểu chữ serif không hợp; card dùng tràn lan và giống nhau; màu xanh dùng cho mọi ý nghĩa; mật độ không đồng đều; bottom nav đè nội dung; list/detail xếp chồng trong cùng một trang cuộn; input, checkbox và nút chưa theo hệ component.
- Chưa có **primitive component** dùng chung (`Button`, `Sheet`, `FormField`, `Chip`, `DataRow`...); chỉ có vài file nhỏ trong `_features/ui/`. Chỉ 1 chỗ có `role="dialog"`.
- `viewport.maximumScale: 1` (`layout.tsx:20`) chặn phóng to trên mobile, vi phạm accessibility.
- Header luôn hiện "Lưu trên máy trước – timezone" và pill sync (thông tin kỹ thuật trên màn hình hằng ngày).
- Thiếu trạng thái chuẩn ở các màn hình: loading / empty / error / offline / chưa đăng nhập.

---

## 2. Mục tiêu sau refactor

1. **Chức năng đúng và có phản hồi rõ ràng**: mọi hành động mạng đều có loading → thành công hoặc lỗi kèm thông báo tiếng Việt cụ thể; không còn nút "chết".
2. **Auth chuẩn**: màn hình đăng nhập/đăng ký riêng; khôi phục phiên khi tải trang; xử lý phiên hết hạn; đăng nhập được ngay từ onboarding.
3. **Dữ liệu đúng nghiệp vụ**: khách (guest) dùng local-first; khi đăng nhập thì **cloud là source of truth**, localStorage chỉ là cache offline cùng hàng đợi ghi (đồng bộ hai chiều).
4. **Kiến trúc bảo trì được**: không còn component nghìn dòng; mỗi tính năng có module riêng (UI + hooks + data); router dùng đúng App Router.
5. **UI production theo spec**: design token, component primitive, từng màn hình đạt acceptance checklist mục 12 của spec.
6. **Chất lượng**: unit test cho logic, component test cho luồng chính, E2E cho các luồng sống còn, kiểm tra accessibility.

---

## 3. Các quyết định đã chốt (2026-10-17)

| ID | Câu hỏi | Quyết định |
|---|---|---|
| D1 | Tailwind hay CSS tokens thuần? | **Tailwind v4 + CSS variables cho token** (spec mục 3 và 10). Gỡ dần `globals.css` theo từng màn hình. |
| D2 | Trang chủ theo spec hay theo `TrangChu giao dien.md` (thuỷ mặc, Thái Cực)? | **Giao diện sạch theo spec trước.** Ý tưởng thuỷ mặc để sau; khi làm lại phải là hero card có chức năng (hiển thị % nước, bấm để log), ảnh nén WebP < 300KB. `public/assets/trangchu/` và class `ink-shell` tạm không dùng. |
| D3 | Khi đã đăng nhập, cloud có là source of truth không? | **Có.** Chế độ khách vẫn dùng local-first. |
| D4 | Thư viện quản lý state và data | **Zustand** (state UI và phiên) + **TanStack Query** (cache server, retry, trạng thái loading/lỗi). Logic thuần giữ trong `packages/shared`. |
| D5 | Đăng nhập Google | **Ẩn** cho tới khi API có subdomain cùng site với web, sau đó bật lại với `COOKIE_SAMESITE=lax` + `COOKIE_DOMAIN`. |
| D6 | Render gói Free khởi động chậm | UI luôn có trạng thái "Đang kết nối máy chủ…" (P0). Việc nâng gói Starter do chủ dự án quyết định. |

## 4. Kiến trúc đích

```text
apps/web/src/
  app/
    (app)/                      # route group cho người dùng
      layout.tsx                # AppShell: TopBar + BottomNav + providers, mount 1 lần
      today/page.tsx
      workout/page.tsx  workout/live/page.tsx
      routines/page.tsx routines/[id]/page.tsx routines/templates/page.tsx
      library/page.tsx  library/[id]/page.tsx
      progress/page.tsx
      settings/page.tsx settings/[section]/page.tsx
    (auth)/
      sign-in/page.tsx  sign-up/page.tsx  forgot-password/page.tsx  reset-password/page.tsx
    onboarding/page.tsx
    admin/...                   # giữ riêng, dùng chung AuthProvider
    layout.tsx  error.tsx  global-error.tsx  not-found.tsx
  components/ui/                # primitives: Button, IconButton, Card, Sheet, Dialog, FormField,
                                # Input, Select, Switch, Chip, SegmentedControl, DataRow, Toast,
                                # EmptyState, ErrorState, Skeleton, StatNumber
  features/
    auth/      { api.ts, hooks.ts (useSession, useSignIn...), components/, store.ts }
    sync/      { queue.ts, engine.ts (push + pull), hooks.ts, conflict-dialog.tsx }
    hydration/ { api.ts, hooks.ts, components/ }
    supplements/ workout/ routines/ library/ progress/ coach/ notifications/ settings/ onboarding/
  lib/
    api/       { client.ts (fetch + timeout + retry + ApiError), endpoints.ts }
    storage/   { local-cache.ts (namespace theo user), migrations.ts }
    i18n/vi.ts                  # toàn bộ copy UTF-8
  styles/      { tokens.css, globals.css (tối thiểu) }
```

Nguyên tắc:
- Mỗi feature chỉ export **hooks + components**; component không gọi `fetch` trực tiếp.
- `AppShell` và các provider nằm ở `(app)/layout.tsx`, nên chỉ mount **một lần**; chuyển tab bằng `<Link>` / `useRouter()`.
- State chia ba lớp:
  - **Server state** (TanStack Query), cache theo user.
  - **Local domain state** cho chế độ khách và offline (store + persist từng phần, namespace `evolvefit:<userId|guest>`).
  - **UI state** cục bộ trong component (form, bộ lọc).
- Logic thuần (tính tiến độ, planner, progression, merge) **giữ trong `packages/shared`** và có unit test.

---

## 5. Lộ trình theo giai đoạn

Mỗi giai đoạn kết thúc bằng: lint + test + build pass, deploy preview trên Vercel, tự kiểm tra trên điện thoại thật, một commit (hoặc PR) riêng.

### P0. Hotfix: auth có phản hồi (1–2 ngày, làm ngay)

Mục tiêu: hết hiện tượng "bấm không có gì", chưa đổi kiến trúc.

1. `api-client.ts`:
   - Bọc `fetch` trong `try/catch`, thêm timeout (`AbortController`, 20s cho request đầu, 10s cho các request sau).
   - Parse JSON an toàn; lỗi mạng, timeout hoặc non-JSON đều trả `{ ok: false, error, errorCode: "network_error" | "timeout" | "bad_response" }`, **không throw**.
   - Retry 1 lần cho `GET` khi gặp lỗi mạng hoặc 502/503 (Render cold start).
2. `authenticateEmail` và các handler async khác: `try/finally`, trạng thái `pending` để khoá nút và hiện spinner. Nếu chờ quá 3s thì hiện "Đang kết nối máy chủ, lần đầu có thể mất tới 1 phút".
3. Đồng bộ rule mật khẩu với backend (đăng ký ≥ 8 ký tự), báo lỗi ngay dưới ô nhập.
4. Map lỗi backend sang tiếng Việt: `invalid_email_or_password`, `too_many_sign_in_attempts`, `validation_failed` (đọc `details[].field`), `forbidden` (`missing-csrf-header`, `untrusted-origin`), `network_error`, `timeout`.
5. Toast: một hàm `notify()` duy nhất, tự tắt sau 4–6s, toast mới thay toast cũ, có `aria-live`.
6. Gọi `GET /api/auth/session` khi app khởi động để đồng bộ `authMode` và email thật.
7. Ẩn nút "Đăng nhập bằng Google" (D5).
8. Test: unit cho `request()` (mạng lỗi, timeout, non-JSON, 401); component test cho nút đăng nhập (loading → lỗi → thành công).

Trạng thái: **xong phần code** (2026-10-17). Còn chờ kiểm tra trên bản deploy Vercel.

**Tiêu chí xong:** tắt API hoặc dùng URL sai thì vẫn có thông báo lỗi rõ ràng; đăng nhập đúng thì thấy trạng thái đã đăng nhập và lựa chọn đồng bộ; tải lại trang vẫn giữ trạng thái đăng nhập đúng với cookie.

### P1. Nền móng kiến trúc (4–6 ngày)

Trạng thái: **xong** (2026-10-17). Chi tiết ở mục 9.

1. Cài Tailwind v4, tạo `styles/tokens.css` từ spec mục 4–6 và 10 (màu semantic, type scale, spacing, radius, shadow). Font Inter qua `next/font`.
2. Tạo `components/ui/*` primitives theo spec mục 7, kèm story hoặc trang `/dev/ui` (chỉ ở môi trường dev) để xem trực quan.
3. Tái cấu trúc router:
   - Route group `(app)` với `layout.tsx` chứa `AppShell`.
   - Bỏ `EvolveFitSectionPage` và `pushState`.
   - Mỗi page chỉ render feature của nó.
4. Tạo `lib/api/client.ts` mới (kế thừa P0) + `ApiError` + interceptor 401 (thử `POST /api/auth/refresh` một lần; thất bại thì chuyển trạng thái `session-expired`).
5. Providers: `QueryClientProvider`, `AuthProvider` (Zustand), `ToastProvider`, `SyncProvider`.
6. Tách `evolvefit-app.tsx` theo feature, **giữ nguyên hành vi**. Thứ tự tách: `auth` → `sync` → `hydration` → `supplements` → `workout` (live session, rest timer) → `routines` → `library` → `progress`/`coach` → `notifications` → `settings` → `onboarding`. Mỗi lần tách xong một feature thì chạy lại test.
7. Chuyển copy tiếng Việt dạng `\u....` sang UTF-8, gom vào `lib/i18n/vi.ts`.
8. Bỏ `maximumScale: 1`.

**Tiêu chí xong:** `evolvefit-app.tsx` bị xoá; không file nào trong `features/` vượt ~300 dòng; back/forward của trình duyệt hoạt động đúng; test cũ vẫn pass (hoặc được viết lại tương đương).

### P2. Auth, tài khoản và đồng bộ đúng nghiệp vụ (4–5 ngày)

Trạng thái: **xong** (2026-10-17). Chi tiết ở mục 9.

1. **Màn hình auth riêng**: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`.
   - Form có `<form onSubmit>`, `autocomplete` đúng chuẩn, hiện/ẩn mật khẩu, lỗi theo từng trường.
   - Tách email đăng nhập khỏi `profile.email`.
   - `reset-password` đọc token từ URL mà Supabase gửi về, thay cho ô "Token đặt lại" phải dán tay.
2. **Onboarding**: thêm bước 0 "Bạn đã có tài khoản? Đăng nhập" để khôi phục dữ liệu cloud mà không phải thiết lập lại. Cho phép bỏ qua các bước không bắt buộc.
3. **Các trạng thái phiên** (brief 6.3): khách / đã đăng nhập / offline / đang đồng bộ / xung đột / phiên hết hạn. Hiển thị gọn ở avatar trên TopBar; chi tiết nằm trong Cài đặt → Đồng bộ.
4. **Sync engine hai chiều** (D3):
   - Sau khi đăng nhập: tải `GET /api/account/export` rồi mở **dialog quyết định gộp** (spec 6.3: Giữ trên máy / Dùng bản cloud / Gộp), có giải thích hậu quả của từng lựa chọn.
   - Khi tải app và khi tab được focus lại: pull dữ liệu cloud (export, hoặc endpoint theo resource) để làm mới cache.
   - Ghi: optimistic update cục bộ, rồi đưa vào hàng đợi, rồi gửi `/api/sync/batch` theo lô (tối đa 50 mục), backoff khi lỗi.
   - 401 trong lúc sync: tạm dừng hàng đợi (không đánh dấu failed) và hỏi đăng nhập lại.
   - Conflict routine: dialog xem trước và xác nhận (`conflictResolution: "confirm"`).
5. **Dữ liệu theo user**: localStorage namespace theo `userId`. Đăng xuất thì hỏi "Xoá dữ liệu trên máy này?" (mặc định có, trên máy dùng chung). Xoá tài khoản thì xoá sạch.
6. Admin dùng chung `AuthProvider` (bỏ form đăng nhập riêng ở `/admin`; nếu chưa đăng nhập thì chuyển tới `/sign-in?next=/admin`).

**Tiêu chí xong:** đăng nhập trên thiết bị A, ghi log, rồi đăng nhập trên thiết bị B thì thấy dữ liệu; cookie hết hạn thì có thông báo và đăng nhập lại không mất dữ liệu đang chờ; đăng xuất trên máy dùng chung thì không còn dữ liệu cá nhân.

### P3. Nối chức năng với backend thay cho dữ liệu giả hoặc seed (3–4 ngày)

| Tính năng | Hiện tại | Đích |
|---|---|---|
| Thư viện bài tập (marketplace) | Seed trong `packages/shared` | `GET /api/exercises/marketplace` (phân trang, lọc phía server), chi tiết, thay thế, clone, thêm vào routine |
| Template lịch tập | Seed | `GET /api/routine-templates`, preview, apply (idempotency key), feedback |
| Coach | Tính ở client | `POST /api/coach/recommend` + feedback (vẫn giữ luật nội bộ khi offline) |
| Thành tích / leaderboard | Dữ liệu giả ở client | `GET /api/achievements/me`, `PATCH /api/leaderboards/visibility` |
| Thông báo đẩy | Có, nhưng logic nằm trong component gốc | Tách thành `features/notifications`; giữ API hiện có |

Seed trong `packages/shared` chỉ còn dùng làm **fallback offline**.

**Tiêu chí xong:** nội dung admin xuất bản trên `/admin` xuất hiện trong thư viện của người dùng; không còn tên giả ("Minh", "An") trên leaderboard.

### P4. Làm lại UI từng màn hình theo spec (8–12 ngày)

Thứ tự theo spec mục 11 (Concrete Implementation Priorities), mỗi màn hình phải đạt "Acceptance criteria" của mục tương ứng:

1. **Global reset**: AppShell, TopBar (bỏ thông tin kỹ thuật), BottomNav (padding an toàn, không đè nội dung), token màu có ngữ nghĩa (xanh chỉ dùng cho hành động/tiến độ).
2. **Library** (spec 9.5): sửa chữ đè nhau, list rồi sheet chi tiết, bộ lọc dạng chip + sheet.
3. **Live workout** (spec 9.3): một bài hiện tại, ô nhập set lớn, thanh hành động cố định, rest timer dễ thấy; ẩn công cụ phụ vào sheet.
4. **Today** (spec 9.1 + quyết định D2): hero tóm tắt + lưới hành động nhanh (nước, creatine, bắt đầu tập); bỏ thông tin không giúp hành động.
5. **Settings** (spec 9.7): danh sách nhóm, bấm vào mới mở chi tiết (`/settings/[section]`); tài khoản tách khỏi hồ sơ.
6. **Progress / Coach** (spec 9.6) và **Routines** (spec 9.4): tab Tổng quan / Coach / Cơ thể / Chia sẻ; lịch tập ở chế độ xem → sửa, marketplace template, planner, import CSV/XLSX trong sheet.
7. **Hydration** (brief 6.4) và **Onboarding** (brief 6.2).
8. **Admin**: áp dụng cùng token và primitive, giữ layout riêng.

Mọi màn hình phải có đủ 5 trạng thái: **loading (skeleton) / empty / error (có nút thử lại) / offline / chưa đăng nhập**.

### P5. PWA và hiệu năng (1–2 ngày)

1. Viết lại `public/sw.js`:
   - Cache tĩnh có phiên bản theo build (`evolvefit-<buildId>`); xoá cache cũ khi `activate`.
   - **Không cache request tới API** (khác origin hoặc `/api/*`).
   - HTML dùng network-first và fallback trang offline riêng.
   - Hiện thông báo "Có phiên bản mới – Tải lại" khi service worker mới chờ kích hoạt.
2. Ảnh `public/assets/trangchu/*` (~8MB): chuyển sang WebP/AVIF, dùng `next/image`; xoá ảnh không dùng.
3. Ngân sách hiệu năng: First Load JS < 150KB mỗi route; LCP < 2.5s trên 4G; không re-render toàn app khi gõ phím.

### P6. Chất lượng và phát hành (song song, chốt ở cuối)

1. **E2E (Playwright)** cho các luồng: đăng ký → xác minh (mock) → đăng nhập; onboarding; log nước; bắt đầu và hoàn thành buổi tập; offline → online sync; phiên hết hạn; đăng xuất xoá dữ liệu.
2. **Accessibility**: kiểm tra bằng axe; điều hướng được bằng bàn phím; focus trap trong sheet/dialog; nhãn cho icon button; độ tương phản đạt AA; vùng chạm ≥ 44px.
3. **CI**: thêm job Playwright chạy trên preview của Vercel (hoặc chạy local với API ở chế độ memory).
4. **Theo dõi lỗi**: giữ `/api/client-errors` (đã được redact), thêm báo lỗi từ error boundary của từng feature.
5. Cập nhật `docs/webapp-feature-overview.md` và `docs/deploy-runbook.md` sau khi hoàn thành.

---

## 6. Bảng kiểm tra chức năng phải giữ (không được mất khi refactor)

- [ ] Onboarding 7 bước (mục tiêu, kinh nghiệm, ngày tập, dụng cụ, nước, nhắc nhở, xem lại)
- [ ] Log nước: nhiều loại đồ uống, quick amount, sửa/xoá log, undo, drink module tuỳ chỉnh
- [ ] Creatine/supplement: log, bỏ qua, lịch nhắc
- [ ] Lịch tập: tạo/sửa/xoá routine, ngày tập, sắp xếp bài, áp template, planner, import CSV/XLSX, tải file mẫu
- [ ] Buổi tập: bắt đầu, set (warmup/working/drop/failure), bỏ qua set/bài, đổi thứ tự hàng đợi, rest timer (tạm dừng/tiếp/điều chỉnh), PR badge, wake lock, lưu thứ tự vào routine, tóm tắt sau buổi
- [ ] Plate calculator và cài đặt thanh/đĩa
- [ ] Thư viện bài tập: tìm kiếm, lọc, chi tiết, bài tuỳ chỉnh, clone từ marketplace
- [ ] Tiến độ: chỉ số cơ thể + biểu đồ theo khoảng thời gian, báo cáo, xuất PDF/CSV, coach + phản hồi
- [ ] Xã hội: bạn bè, quyền riêng tư, chia sẻ bài viết, leaderboard
- [ ] Health integration (contract, chờ native bridge)
- [ ] Thông báo: quyền trình duyệt, đăng ký/huỷ Web Push, gửi thử, giờ yên lặng, snooze, hành động nhanh từ thông báo (`?quickAction=`)
- [ ] Dữ liệu: xuất JSON/CSV, nhập JSON có chọn phần khôi phục, xoá dữ liệu trên máy, xoá tài khoản cloud
- [ ] Auth: đăng ký, đăng nhập, đăng xuất, quên/đặt lại mật khẩu, làm mới phiên, gộp dữ liệu sau đăng nhập
- [ ] Admin: dashboard, role, nội dung bài tập/template, tra cứu hỗ trợ, audit log

---

## 7. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Mất dữ liệu localStorage của người dùng hiện tại khi đổi cấu trúc lưu | Migration có phiên bản (`migrateImportedAppData` đã có sẵn), backup key cũ trước khi chuyển, test migration với dữ liệu thật đã export. |
| Refactor lớn làm hỏng tính năng ngầm | Làm theo từng feature, sau mỗi bước so với bảng kiểm tra ở mục 6, test E2E trên preview trước khi merge. |
| Sync hai chiều gây ghi đè dữ liệu | Server dùng idempotency key và conflict (đã có); client dùng `updatedAt` và dialog xác nhận; test kịch bản hai thiết bị. |
| Render Free ngủ làm trải nghiệm chậm | UI cold-start ở P0; cân nhắc nâng gói Starter (D6). |
| Phạm vi UI quá lớn | Chốt D1/D2 trước P4; làm theo thứ tự ưu tiên của spec; mỗi màn hình là một PR. |

---

## 8. Thứ tự đề xuất và ước lượng

| Giai đoạn | Ước lượng | Phụ thuộc |
|---|---|---|
| P0 Hotfix auth | 1–2 ngày | — |
| P1 Nền móng | 4–6 ngày | P0 |
| P2 Auth và sync | 4–5 ngày | P1 |
| P3 Nối backend | 3–4 ngày | P2 |
| P4 UI theo spec | 8–12 ngày | P1 |
| P5 PWA/hiệu năng | 1–2 ngày | P1 |
| P6 Chất lượng | song song, 2–3 ngày để chốt | toàn bộ |

Tổng: khoảng 4–6 tuần làm việc. P4 có thể chạy song song với P2/P3 sau khi P1 xong.

## 9. Nhật ký tiến độ

| Ngày | Giai đoạn | Nội dung |
|---|---|---|
| 2026-10-17 | — | Chốt D1–D6, bắt đầu P0. |
| 2026-10-17 | P0 | `api-client` không còn throw (timeout 60s lần đầu / 15s sau đó, retry GET khi gặp lỗi mạng hoặc 502–504, parse JSON an toàn); `lib/api-errors.ts` dịch mã lỗi sang tiếng Việt; handler auth có trạng thái pending/slow, khoá nút, validate trước khi gọi API (đăng ký ≥ 8 ký tự); form đăng nhập dùng `<form>` + autocomplete, ẩn khi đã đăng nhập; quên mật khẩu thu gọn; ẩn Google (bật bằng `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`); kiểm tra `/api/auth/session` khi tải trang; toast tự tắt thống nhất; Web Push báo lỗi thật; bỏ `maximumScale`; tạm ngưng `ink-shell` (D2); service worker không còn cache API và có phiên bản cache (một phần P5). Thêm 12 test. |
| 2026-10-17 | P1 | Tailwind v4 (`styles/tokens.css`; chưa bật preflight để không vỡ UI cũ trước P4) + font Inter qua `next/font`; TanStack Query provider. Store Zustand `lib/store/app-store.ts` (lưu cùng key `evolvefit-state-v1`; action đọc state mới nhất qua `get()` thay vì closure của lần render). Action/selector theo domain trong `src/features/{auth,hydration,routines,workout,progress,settings,notifications,sync,app}`; screen hook trả đúng props cho view cũ. Route group `app/(app)` với `layout.tsx` mount `AppShell` một lần, điều hướng bằng `next/navigation`. **Xoá `evolvefit-app.tsx` (2.337 dòng).** Primitives trong `components/ui` (Button, IconButton, Card, DataRow, StatNumber, FormField, Chip, SegmentedControl, Sheet có focus trap, Empty/Error/Skeleton/InlineNotice) + trang `/dev/ui` (chỉ ở dev). Chuyển ~520 chuỗi escape sang UTF-8. Sửa thêm 4 lỗi phát hiện khi tách: hàng đợi sync kẹt ở "syncing" và không tự thử lại; kiểm tra phiên chậm (cold start) có thể đăng xuất nhầm người vừa đăng nhập (thêm `epoch`); màn Today hiển thị cứng "Push Day"; form có sẵn giá trị mẫu ("Lateral Raise", "Cable Fly"). Test: harness `src/test/render-app.tsx` + mock `next/navigation`; thêm 8 test. **Chưa làm, chuyển sang P4:** gom copy vào `lib/i18n/vi.ts` (làm cùng lúc viết lại từng màn hình); view component vẫn ở `app/_features` (P4 thay thế); `features/routines/actions.ts` còn ~430 dòng, sẽ tách routine/library khi P3 nối API thư viện. |
| 2026-10-17 | P2 | **Trang auth riêng** trong `app/(auth)`: `/sign-in`, `/sign-up` (màn "kiểm tra email" khi cần xác minh), `/forgot-password`, `/reset-password` (đọc token khôi phục từ `#access_token` của link Supabase rồi xoá khỏi thanh địa chỉ); `?next=` chỉ nhận đường dẫn trong app (`features/auth/redirect.ts`). Lỗi hiện ngay trong form; hiện/ẩn mật khẩu; báo "Đang kết nối máy chủ…". **Onboarding** có lối "Đã có tài khoản? Đăng nhập" để khôi phục dữ liệu và bỏ qua thiết lập. **Dữ liệu theo tài khoản** (`lib/storage.ts`): khách giữ key cũ `evolvefit-state-v1`, mỗi tài khoản có `evolvefit-state-v1:account:<email>`, con trỏ `evolvefit-active-account`. **Phiên**: khi tải app thì đối chiếu cookie với namespace đang mở (`establishSession`); lần đầu đăng nhập trên một thiết bị thì hiện hộp thoại chọn Gộp / Dùng dữ liệu tài khoản / Giữ trên máy, kèm giải thích hậu quả (`features/auth/merge-dialog.tsx`); phiên hết hạn **không đăng xuất** mà giữ dữ liệu, tạm dừng hàng đợi và hiện banner "Đăng nhập lại". **Đồng bộ hai chiều**: khách không gọi API (local-first); đã đăng nhập thì gửi theo lô tối đa 50 mục, 401 thì trả mục về "pending" và tạm dừng, chỉ chạy sau khi đã xác nhận phiên (`sessionChecked`); kéo dữ liệu cloud khi mở tài khoản và khi quay lại tab (giãn cách 60s, `features/sync/pull.ts`), chỉ gộp các nhóm dữ liệu server thực sự lưu, giữ nguyên cài đặt và hàng đợi trên máy (`features/sync/merge.ts`). **Đăng xuất** có hộp xác nhận với tuỳ chọn xoá dữ liệu tài khoản khỏi máy (mặc định bật); xoá tài khoản thì xoá bản cache. **Admin** dùng chung luồng đăng nhập (`/sign-in?next=/admin`). Backend: `/api/auth/session` coi cookie hợp lệ ở chế độ memory là đã đăng nhập (trước đây dev luôn báo hết phiên). Sửa thêm: `AppShell` mount lại sau khi đăng nhập làm mất hộp thoại gộp và trạng thái buổi tập; form đăng nhập điền email mẫu của dữ liệu demo. Test: thêm 16 test (157 test toàn repo). **Giới hạn đã biết:** item bị xoá trên thiết bị khác chưa bị xoá ở thiết bị này khi kéo về (gộp theo id); conflict lịch tập vẫn xác nhận trong Cài đặt → Đồng bộ (chưa có dialog xem trước); First Load JS ~185 kB/route, vượt ngân sách 150 kB (xử lý ở P5). |

