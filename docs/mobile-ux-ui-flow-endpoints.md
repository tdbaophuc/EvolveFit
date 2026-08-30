# EvolveFit - Mobile UX/UI, Flow va Endpoint

Cap nhat: 2026-08-24

Tai lieu nay tong hop tu cac tai lieu hien co trong `docs` va OpenAPI V1. Muc tieu la dinh huong UX/UI cho webapp mobile thuc te: moi man hinh chi hien thi thong tin can de hanh dong ngay, cac chi tiet phu duoc dua vao sheet, modal, tab con hoac man hinh drill-down.

## Nguyen tac san pham

- EvolveFit la PWA fitness local-first, uu tien cac workflow hang ngay: uong nuoc, supplement, tap luyen, xem tien do, cai dat dong bo.
- UI hien thi bang tieng Viet, tru ten bai tap built-in nhu `Barbell Bench Press`, `Lat Pulldown`, `Back Squat`.
- Khong hien enum/status ky thuat truc tiep cho nguoi dung, vi du `pending`, `failed`, `private-friends`, `not_requested`.
- Moi man hinh mobile nen co mot muc tieu chinh, toi da 2 hanh dong chinh va chi 1 lop thong tin phu hien san.
- Danh sach dai phai co tim kiem, loc, collapse hoac phan trang/infinite scroll.
- Cac thao tac nguy co mat du lieu nhu xoa log, xoa routine, huy buoi tap can co confirm sheet ngan gon.
- Local-first la mac dinh: nguoi dung van log duoc khi offline; khi online thi mutation duoc dua vao sync queue.
- Health Connect/Apple Health trong webapp chi duoc hien o muc cau hinh va trang thai contract. Khong noi la da dong bo that neu `nativeBridgeAvailable` chua san sang.

## Dieu huong mobile

Dung bottom navigation 5 tab:

| Tab | Muc tieu | Thong tin hien san |
|---|---|---|
| Hom nay | Quyet dinh viec can lam ngay | Nuoc hom nay, workout hom nay, creatine/supplement, hoat dong gan day |
| Nuoc | Log nuoc nhanh | Vong tien do, nut log nhanh, lich su gan nhat, nhac nuoc |
| Tap luyen | Len plan va tap live | Routine hien tai, ngay tap, nut bat dau, live session khi dang tap |
| Tien do | Xem xu huong va thanh tich | Dashboard 7/30 ngay, PR, e1RM, chi so co the, report |
| Cai dat | Quan ly ho so va dong bo | Ho so, module do uong, quyen rieng tu, Health platform, Web Push, sync, import/export |

Quy tac hien thi:

- Tab bar luon co nhan ngan va icon.
- Khi dang trong live workout, bottom nav co the giu nguyen nhung nut hanh dong chinh phai sticky o cuoi man hinh.
- Khong dat dashboard lon trong card long nhau. Moi khoi thong tin la section gon, card chi dung cho item lap lai.
- KPI tren mobile chi nen hien 2-3 so chinh moi man hinh. Cac chi tiet mo bang "Xem them".

## Flow tong quan

### Lan dau mo app

1. App kiem tra session hien tai.
2. Neu chua dang nhap, van cho dung local-first voi tuy chon dang nhap/dang ky trong Cai dat.
3. Nguoi dung cau hinh muc nuoc, supplement va routine co ban.
4. Neu dang nhap, app co the day queue len backend va xu ly conflict bang UI preview.

Endpoint lien quan:

| Hanh dong | Endpoint |
|---|---|
| Lay session | `GET /api/auth/session` |
| Dang nhap | `POST /api/auth/sign-in` |
| Dang ky | `POST /api/auth/sign-up` |
| Dang xuat | `POST /api/auth/sign-out` |
| Dong bo queue | `POST /api/sync/batch` |

### Su dung hang ngay

1. Vao Hom nay de xem viec can lam.
2. Log nuoc hoac supplement bang nut nhanh.
3. Neu co lich tap, bat dau live workout.
4. Ket thuc buoi tap, xem PR neu co.
5. Tien do cap nhat tu du lieu local va sync khi co mang.

Endpoint lien quan:

| Hanh dong | Endpoint |
|---|---|
| Tong quan nuoc hom nay | `GET /api/hydration/today` |
| Tao log nuoc | `POST /api/hydration/log` |
| Lay supplement | `GET /api/supplements` |
| Log supplement | `POST /api/supplements/log` |
| Bat dau workout | `POST /api/workouts/sessions` |
| Tao set | `POST /api/workouts/sets` |
| Ket thuc workout | `POST /api/workouts/sessions/{id}/finish` |

## Man hinh Hom nay

Muc tieu: tra loi nhanh "hom nay toi can lam gi tiep theo?".

Bo cuc mobile:

- Header: ngay hien tai, trang thai sync nho.
- Section Nuoc: tien do ml/goal, nut log nhanh 250 ml va nut tuy chinh.
- Section Tap hom nay: ten ngay tap, 1-2 bai dau tien, nut "Bat dau".
- Section Supplement: creatine/supplement can uong, nut danh dau da dung.
- Section Gan day: toi da 3 su kien gan nhat.

Khong hien:

- Bang lich su nuoc day du.
- Toan bo routine hoac tat ca set.
- Bieu do phuc tap.
- Trang thai ky thuat cua sync queue.

Flow:

1. Mo tab Hom nay.
2. App nap tong quan local va goi API neu can du lieu server.
3. Nguoi dung log nhanh nuoc/supplement hoac bat dau workout.
4. Sau thao tac, UI cap nhat optimistic va dua mutation vao sync queue neu can.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Lay session | GET | `/api/auth/session` |
| Tong quan nuoc hom nay | GET | `/api/hydration/today` |
| Log nuoc nhanh | POST | `/api/hydration/log` |
| Danh sach supplement | GET | `/api/supplements` |
| Log supplement | POST | `/api/supplements/log` |
| Lay routine de goi y tap | GET | `/api/routines` |
| Bat dau buoi tap | POST | `/api/workouts/sessions` |
| Dong bo thay doi local | POST | `/api/sync/batch` |

## Man hinh Nuoc

Muc tieu: log nuoc trong duoi 5 giay, nhung van cho chinh sua khi can.

Bo cuc mobile:

- Header: tong ml hom nay va phan tram muc tieu.
- Vong tien do hoac progress bar lon.
- Hang nut nhanh: 150 ml, 250 ml, 500 ml, tuy chinh.
- Chon loai do uong bang bottom sheet: nuoc loc, ca phe, tra, do uong khac.
- Lich su gan nhat: toi da 5 log, moi dong co sua/xoa trong swipe action hoac menu.
- Nhac nuoc: hien trang thai ngan, cau hinh chi tiet trong sheet.

Khong hien:

- Toan bo lich su theo thang tren man hinh chinh.
- Bang hydration factor chi tiet neu nguoi dung chi muon log.
- Nhieu bieu do cung luc.

Flow log nhanh:

1. Nguoi dung bam 250 ml.
2. UI cong ngay vao tong hom nay.
3. Gui `POST /api/hydration/log`.
4. Neu that bai, giu log local va dua vao sync queue.

Flow sua/xoa:

1. Nguoi dung mo menu tren log.
2. Sua dung input ngan hoac xoa voi confirm sheet.
3. Cap nhat optimistic.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Lay tong quan hom nay | GET | `/api/hydration/today` |
| Tao log nuoc | POST | `/api/hydration/log` |
| Sua log nuoc | PATCH | `/api/hydration/log/{id}` |
| Xoa log nuoc | DELETE | `/api/hydration/log/{id}` |
| Dong bo khi offline/online lai | POST | `/api/sync/batch` |

## Man hinh Tap luyen

Muc tieu: chuyen nhanh giua lap ke hoach va tap live.

Nen co 2 che do ro rang:

- Plan: routine, ngay tap, bai tap, target sets/reps/weight.
- Live: buoi tap dang dien ra, set tiep theo, rest timer, PR live.

### Plan mode

Bo cuc mobile:

- Header: routine dang chon va nut doi routine.
- Tab nho theo ngay tap, vi du Ngay 1, Ngay 2.
- Danh sach bai tap dang collapsed: ten bai, muc tieu ngan, nut mo chi tiet.
- CTA sticky: "Bat dau buoi tap".
- Thu vien bai tap mo bang man hinh rieng co search/filter.

Khong hien:

- Tat ca ngay tap va tat ca bai tap cung luc.
- Form tao routine day du ngay tren danh sach.
- Mo ta bai tap dai neu chua duoc yeu cau.

Endpoint Plan:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Lay routine | GET | `/api/routines` |
| Tao routine | POST | `/api/routines` |
| Sua routine | PATCH | `/api/routines/{id}` |
| Xoa routine | DELETE | `/api/routines/{id}` |
| Lay exercise library | GET | `/api/exercises` |
| Tao bai tap tuy chinh | POST | `/api/exercises` |
| Sua bai tap | PATCH | `/api/exercises/{id}` |
| Xoa bai tap | DELETE | `/api/exercises/{id}` |

### Live mode

Bo cuc mobile:

- Top bar compact: ten buoi tap, thoi gian, pause/resume.
- Card bai hien tai: ten bai, target, set dang lam.
- Input set: kg, reps, RPE, set type.
- Rest timer sticky hoac bottom sheet.
- Queue bai tap: chi hien bai hien tai va 2 bai ke tiep; danh sach day du mo bang sheet.
- PR notification hien toast/banner ngan, khong chen layout.

Khong hien:

- Toan bo lich su PR khi dang nhap set.
- Nhieu bieu do trong live workout.
- Queue day du neu no lam day man hinh.

Flow live workout:

1. Bam "Bat dau buoi tap".
2. Tao session.
3. Nguoi dung nhap tung set.
4. Co the pause/resume, skip/reorder queue.
5. Ket thuc session va hien tom tat ngan.

Endpoint Live:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Bat dau session | POST | `/api/workouts/sessions` |
| Pause session | POST | `/api/workouts/sessions/{id}/pause` |
| Resume session | POST | `/api/workouts/sessions/{id}/resume` |
| Sap xep queue | POST | `/api/workouts/sessions/{id}/reorder` |
| Tao set | POST | `/api/workouts/sets` |
| Sua set | PATCH | `/api/workouts/sets/{id}` |
| Xoa set | DELETE | `/api/workouts/sets/{id}` |
| Ket thuc session | POST | `/api/workouts/sessions/{id}/finish` |
| Dong bo mutation | POST | `/api/sync/batch` |

## Man hinh Tien do

Muc tieu: cho nguoi dung thay xu huong va thanh tich ma khong bien thanh bao cao day dac.

Bo cuc mobile:

- Segmented control: 7 ngay, 30 ngay, tuy chinh.
- KPI chinh: so buoi tap, ti le dat muc nuoc, PR moi.
- Section Nuoc: chart gon va trung binh ngay.
- Section Tap luyen: volume/e1RM/PR, moi lan chi hien 1 chart.
- Section Chi so co the: can nang va chi so gan nhat.
- Section Bao cao: nut tao/xuat report.
- Coach insight nam trong Tien do, chi hien mot de xuat co kha nang hanh dong.

Khong hien:

- Nhieu chart cung luc.
- Bang set history day du trong man hinh tong quan.
- Noi dung coach dai qua mot card ngan.

Flow:

1. Nguoi dung chon khoang thoi gian.
2. UI hien KPI va chart lien quan.
3. Nguoi dung drill-down vao Nuoc, Tap luyen, PR hoac Chi so co the.
4. Neu can goi y, nguoi dung bam Coach insight.
5. Nguoi dung chap nhan/tu choi goi y de luu feedback.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Goi y coach | POST | `/api/coach/recommend` |
| Feedback coach | POST | `/api/coach/recommendations/{id}/feedback` |
| Dong bo du lieu progress local | POST | `/api/sync/batch` |

Ghi chu: OpenAPI hien tai chua khai bao endpoint rieng cho progress dashboard, e1RM, PR, body metrics, weekly/monthly report hoac PDF export. Theo tai lieu hien co, cac nang luc nay da co trong UI/local-first; neu can backend contract rieng thi can bo sung OpenAPI.

## Man hinh Cai dat

Muc tieu: gom cau hinh it dung, khong lam nang cac tab hang ngay.

Bo cuc mobile:

- Nhom Ho so: thong tin ca nhan, muc tieu nuoc, don vi.
- Nhom Do uong va supplement: module, hydration factor, creatine.
- Nhom Quyen rieng tu: chia se, leaderboard, redaction.
- Nhom Dong bo: dang nhap, sync queue, import/export.
- Nhom Tich hop: Health Connect/Apple Health, Web Push.
- Nhom Ho tro ky thuat: trang thai API, logs neu o che do debug/admin.

Khong hien:

- Tat ca tuy chon trong mot form dai.
- Status ky thuat raw.
- Nut import/export gan cac thao tac hang ngay.

### Flow dang nhap va dong bo

1. Nguoi dung mo Cai dat > Tai khoan.
2. Dang nhap hoac dang ky.
3. App kiem tra session.
4. Neu co du lieu local va server, hien merge/replace preview.
5. Day queue bang sync batch.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Lay session | GET | `/api/auth/session` |
| Dang nhap | POST | `/api/auth/sign-in` |
| Dang ky | POST | `/api/auth/sign-up` |
| Dang xuat | POST | `/api/auth/sign-out` |
| Dong bo queue | POST | `/api/sync/batch` |

### Flow Health Connect / Apple Health

1. Nguoi dung mo Cai dat > Health platform.
2. Chon provider: Health Connect hoac Apple Health.
3. Chon nhom du lieu: weight, workout, hydration.
4. Xem va chap nhan quyen rieng tu.
5. Webapp luu yeu cau va hien trang thai "Chua dong bo" neu chua co native bridge.
6. Chi hien "Co the dong bo" khi native bridge san sang, quyen rieng tu da dong y, permission duoc cap va data type duoc chon.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Kiem tra tinh san sang he thong | GET | `/api/health` |
| Lay trang thai integration | GET | `/api/integrations/status` |
| Dong bo mutation cau hinh neu can | POST | `/api/sync/batch` |

Ghi chu UX bat buoc:

- Browser PWA khong doc/ghi truc tiep Health Connect hoac HealthKit.
- Khong co sync nen ngam trong web-only implementation.
- Moi nhom du lieu phai hien la chua dong bo cho den khi native bridge xac nhan quyen that.

### Flow Web Push va nhac nho

1. Nguoi dung mo Cai dat > Nhac nho.
2. Xem trang thai thong bao bang ngon ngu nguoi dung.
3. Bat/tat nhac nuoc hoac nhac tap.
4. Neu browser chua cap quyen, mo native permission prompt dung luc nguoi dung bam.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Kiem tra readiness | GET | `/api/health` |
| Lay trang thai integration | GET | `/api/integrations/status` |

Ghi chu: Tai lieu hien co noi Web Push/cron da co contract va UI nhung can xac minh staging/production. OpenAPI V1 chua liet ke endpoint subscribe/unsubscribe push rieng.

### Flow import/export

1. Nguoi dung mo Cai dat > Du lieu.
2. Chon export JSON/CSV hoac restore co chon loc.
3. Restore phai hien preview cac nhom du lieu se thay doi.
4. Neu co dang nhap, ket qua restore duoc dua vao sync queue.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Dong bo sau restore | POST | `/api/sync/batch` |

Ghi chu: OpenAPI V1 chua khai bao endpoint import/export file; theo tai lieu hien co, day la nang luc UI/local-first.

## Man hinh dang nhap/dang ky

Muc tieu: khong chan gia tri local-first, nhung giai thich ngan viec dang nhap de dong bo.

Bo cuc mobile:

- Form ngan: email, mat khau.
- CTA chinh: Dang nhap hoac Tao tai khoan.
- Link phu: tiep tuc dung tren may nay.
- Loi hien bang tieng Viet, khong hien ma loi raw.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Lay session | GET | `/api/auth/session` |
| Dang nhap | POST | `/api/auth/sign-in` |
| Dang ky | POST | `/api/auth/sign-up` |
| Dang xuat | POST | `/api/auth/sign-out` |

## Trang thai, loi va observability

Quy tac UX:

- Loi network: hien "Chua dong bo, se thu lai khi co mang" neu mutation da luu local.
- Loi validation: hien gan field lien quan.
- Loi rate limit: hien thong diep cho biet nguoi dung can cho, khong hien `429`.
- Loi server: hien thong diep ngan va request id trong vung chi tiet ho tro.

Endpoint:

| Chuc nang | Method | Endpoint |
|---|---|---|
| Health check | GET | `/api/health` |
| OpenAPI spec | GET | `/api/docs/openapi` |
| Logs co cau truc | GET | `/api/observability/logs` |
| Bao loi client | POST | `/api/client-errors` |

## Mapping endpoint theo nhom chuc nang

| Nhom | Endpoint |
|---|---|
| Auth | `GET /api/auth/session`, `POST /api/auth/sign-in`, `POST /api/auth/sign-up`, `POST /api/auth/sign-out` |
| Hydration | `GET /api/hydration/today`, `POST /api/hydration/log`, `PATCH /api/hydration/log/{id}`, `DELETE /api/hydration/log/{id}` |
| Supplement | `GET /api/supplements`, `POST /api/supplements`, `POST /api/supplements/log` |
| Routine | `GET /api/routines`, `POST /api/routines`, `PATCH /api/routines/{id}`, `DELETE /api/routines/{id}` |
| Exercise library | `GET /api/exercises`, `POST /api/exercises`, `PATCH /api/exercises/{id}`, `DELETE /api/exercises/{id}` |
| Workout session | `POST /api/workouts/sessions`, `POST /api/workouts/sessions/{id}/pause`, `POST /api/workouts/sessions/{id}/resume`, `POST /api/workouts/sessions/{id}/reorder`, `POST /api/workouts/sessions/{id}/finish` |
| Workout set | `POST /api/workouts/sets`, `PATCH /api/workouts/sets/{id}`, `DELETE /api/workouts/sets/{id}` |
| Coach | `POST /api/coach/recommend`, `POST /api/coach/recommendations/{id}/feedback` |
| Sync | `POST /api/sync/batch` |
| Integration/health | `GET /api/health`, `GET /api/integrations/status` |
| Observability | `GET /api/docs/openapi`, `GET /api/observability/logs`, `POST /api/client-errors` |

## Checklist cho moi man hinh mobile

- Co mot CTA chinh ro rang.
- Khong qua 3 KPI hoac chi so tren viewport dau tien.
- Danh sach dai co search/filter hoac collapse.
- Hanh dong nguy hiem co confirm.
- Offline state va sync state duoc hien bang ngon ngu nguoi dung.
- Khong hien enum ky thuat.
- Form dai duoc tach thanh tung buoc hoac bottom sheet.
- Text button ngan, vua trong man hinh 360 px.
- Cac flow chinh dung duoc bang mot tay: CTA quan trong nam gan cuoi man hinh.
- Neu chua co endpoint trong OpenAPI, phai ghi ro la local-first/UI contract truoc khi thiet ke phu thuoc backend.
