# EvolveFit - Mo ta chi tiet giao dien mobile

Cap nhat: 2026-08-24

Tai lieu nay mo ta chi tiet tung man hinh mobile dua tren `docs/mobile-ux-ui-flow-endpoints.md`. Muc tieu la lam ro moi man hinh gom nhung gi, thong tin nam o dau, hanh dong nao la chinh, va chi tiet nao nen dua vao sheet/modal/drill-down.

## Khung dieu huong chung

### Cau truc app shell

- Man hinh mobile dung mot cot doc, chieu ngang toi uu cho 360-430 px.
- Vung noi dung chinh nam giua header va bottom navigation, co padding trai/phai 16 px.
- Header tren cung cao gon, chi hien ngu canh hien tai va trang thai nho.
- Bottom navigation co 5 tab co dinh: Hom nay, Nuoc, Tap luyen, Tien do, Cai dat.
- Moi tab co icon phia tren va nhan ngan phia duoi. Tab dang chon co mau nhan/indicator ro hon.
- Khi co live workout, bottom nav van giu duoc, nhung CTA lien quan buoi tap nam sticky phia tren bottom nav.
- Cac sheet truot tu duoi len, cao 45-85% man hinh tuy noi dung.
- Modal confirm ngan chi dung cho thao tac nguy hiem nhu xoa log, xoa routine, huy hoac ket thuc buoi tap.

### Header chung

- Ben trai: tieu de man hinh hoac ngay hien tai.
- Ben phai: sync badge nho, avatar/tai khoan hoac nut cai dat nhanh neu can.
- Trang thai offline/sync khong hien enum ky thuat. Dung text nhu "Chua dong bo", "Dang dong bo", "Da luu tren may".

## Man hinh Hom nay

### Muc tieu

Tra loi nhanh cau hoi "hom nay toi can lam gi tiep theo?" va cho phep hanh dong trong 1-2 cham.

### Layout tong the

- Header nam dau man hinh.
- Ben duoi header la section tom tat ngay hom nay.
- Cac section xep doc theo thu tu uu tien: Nuoc, Tap hom nay, Supplement, Gan day.
- CTA cua tung section nam trong section do, khong co CTA toan trang rieng neu khong co viec can lam.

### Header

- Dong chinh ben trai: "Hom nay" hoac thu/ngay, vi du "Thu hai, 24/08".
- Dong phu nho ben duoi: trang thai local/sync, vi du "Da luu tren may" hoac "3 muc cho dong bo".
- Ben phai: icon tai khoan hoac cham trang thai sync.

### Section Nuoc

- Nam ngay duoi header vi day la hanh dong hang ngay nhanh nhat.
- Ben trai: so da uong va muc tieu, vi du "1.250 / 2.500 ml".
- Ben phai: phan tram hoac icon dat muc tieu.
- O giua section: progress bar ngang hoac vong tien do nho, khong can chart phuc tap.
- Hang hanh dong duoi: nut nhanh "250 ml" la nut noi bat, nut "Tuy chinh" nho hon.
- Neu gan den gio nhac nuoc: hien dong phu "Nhac tiep theo 15:00".

### Section Tap hom nay

- Tieu de section: "Tap hom nay".
- Dong noi dung chinh: ten routine/ngay tap, vi du "Upper Body - Ngay 1".
- Dong phu: 1-2 bai dau tien, vi du "Barbell Bench Press, Lat Pulldown".
- Ben phai hoac cuoi section: CTA "Bat dau".
- Neu dang co live workout: thay CTA bang "Tiep tuc", hien timer nho va so set da hoan thanh.
- Neu khong co lich tap: hien thong diep ngan "Hom nay chua co buoi tap" va link "Chon routine".

### Section Supplement

- Tieu de: "Supplement".
- Moi supplement can uong la mot dong compact.
- Ben trai: ten, vi du "Creatine".
- Dong phu: lieu/ghi chu, vi du "5 g sau bua sang".
- Ben phai: nut check hoac nut "Da dung".
- Neu da log: dong do chuyen sang trang thai hoan thanh, nut bi an hoac thanh icon check.

### Section Gan day

- Nam cuoi man hinh, chi hien toi da 3 su kien.
- Moi dong gom icon loai su kien, noi dung ngan, thoi gian.
- Vi du: "250 ml nuoc - 10:30", "Hoan thanh 3 set Bench Press - hom qua".
- Co link "Xem them" neu can mo lich su chi tiet trong tab tuong ung.

### Sheet lien quan

- Sheet log nuoc tuy chinh: input ml, loai do uong, thoi gian, nut "Luu".
- Sheet supplement: lieu dung, thoi gian, ghi chu ngan.
- Sheet chon routine: danh sach routine compact neu nguoi dung chua co buoi tap.

## Man hinh Nuoc

### Muc tieu

Log nuoc duoi 5 giay, dong thoi cho phep sua/xoa log va cau hinh nhac khi can.

### Layout tong the

- Header hien tong ml hom nay.
- Vung tien do lon nam trong viewport dau tien.
- Cum nut log nhanh nam ngay duoi tien do.
- Lich su gan nhat nam nua duoi.
- Nhac nuoc la section ngan hoac dong cau hinh o cuoi.

### Header

- Tieu de ben trai: "Nuoc".
- Dong phu: ngay hien tai.
- Ben phai: icon nhac nho hoac trang thai sync.

### Vung tien do

- Hien so lon o trung tam: "1.250 ml".
- Ben duoi so lon: "50% muc tieu 2.500 ml".
- Progress bar lon ngang hoac vong tien do chiem phan dau man hinh.
- Neu vuot muc tieu, progress dung mau hoan thanh va text "Da dat muc tieu".

### Nut log nhanh

- Hang dau: 150 ml, 250 ml, 500 ml.
- Nut "Tuy chinh" nam cuoi hang hoac dong rieng neu man hinh hep.
- Nut 250 ml nen la default noi bat vi la hanh dong pho bien.
- Sau khi bam, hien feedback ngan tai cho: tong ml tang ngay, co toast "Da them 250 ml".

### Chon loai do uong

- Mac dinh la nuoc loc.
- Neu nguoi dung bam "Tuy chinh" hoac doi loai, mo bottom sheet.
- Sheet gom cac lua chon: Nuoc loc, Ca phe, Tra, Do uong khac.
- Moi lua chon co ten va factor tac dong ngan neu can, nhung khong hien bang factor phuc tap tren man hinh chinh.

### Lich su gan nhat

- Tieu de: "Gan day".
- Chi hien toi da 5 log trong ngay.
- Moi dong gom:
  - Icon loai do uong ben trai.
  - Luong ml va ten do uong o giua.
  - Thoi gian o dong phu.
  - Menu ba cham hoac swipe action ben phai.
- Menu log gom "Sua" va "Xoa".
- Xoa phai mo confirm sheet ngan.

### Nhac nuoc

- Nam cuoi man hinh, hien trang thai ngan: "Nhac dang bat" hoac "Chua bat nhac".
- Ben phai co switch bat/tat.
- Bam vao dong mo sheet cau hinh gio bat dau, gio ket thuc, tan suat, quyen thong bao.

## Man hinh Tap luyen - Plan mode

### Muc tieu

Giup nguoi dung xem routine hien tai, chon ngay tap, va bat dau buoi tap nhanh.

### Layout tong the

- Header hien routine dang chon.
- Segmented/tab ngay tap nam duoi header.
- Danh sach bai tap collapsed chiem phan lon man hinh.
- CTA "Bat dau buoi tap" sticky o cuoi man hinh, phia tren bottom nav.

### Header

- Tieu de: "Tap luyen".
- Dong phu: ten routine dang chon.
- Ben phai: nut doi routine hoac menu.
- Neu chua co routine: header van hien "Tap luyen", vung noi dung hien empty state tao routine.

### Tab ngay tap

- Dung segmented control ngang co the scroll.
- Nhan ngan: "Ngay 1", "Ngay 2", "Push", "Pull", tuy routine.
- Tab dang chon co indicator ro, noi dung danh sach cap nhat ngay.

### Danh sach bai tap

- Moi bai tap la mot item/card nho, khong long card.
- Trang thai collapsed gom:
  - Ten bai tap.
  - Target ngan, vi du "3 x 8-10 - 60 kg".
  - Icon mo rong.
- Khi mo rong:
  - Hien cac set target.
  - Ghi chu ky thuat ngan neu co.
  - Nut sua/xoa bai tap trong menu phu.
- Danh sach dai can co collapse, search trong thu vien rieng, khong hien form tao routine chen giua danh sach.

### CTA sticky

- Nam sat cuoi viewport, phia tren bottom nav.
- Text: "Bat dau buoi tap".
- Neu routine/ngay tap chua co bai: disabled va text phu "Them bai tap de bat dau".

### Thu vien bai tap

- Mo bang man hinh rieng hoac full-height sheet.
- Header co search input.
- Bo loc: nhom co, thiet bi, bai built-in/custom.
- Danh sach hien ten bai, nhom co, nut them.
- Form tao bai custom nam trong sheet rieng, khong chen vao list chinh.

## Man hinh Tap luyen - Live mode

### Muc tieu

Nhap set nhanh trong khi tap, theo doi bai hien tai, rest timer, va ket thuc buoi tap ro rang.

### Layout tong the

- Top bar compact co ten buoi tap va timer.
- Card/vung bai hien tai nam tren.
- Input set nam giua, la vung thao tac chinh.
- Rest timer va CTA chinh nam sticky phia duoi.
- Queue bai tap chi hien bai hien tai va 2 bai ke tiep.

### Top bar

- Ben trai: nut quay lai ve Plan hoac collapse live.
- Giua: ten buoi tap/routine.
- Ben phai: timer tong thoi gian va nut pause/resume.
- Khi pause: hien banner ngan "Dang tam dung" va nut "Tiep tuc".

### Bai hien tai

- Tieu de lon vua phai: ten bai, vi du "Barbell Bench Press".
- Dong phu: target cua bai, vi du "3 set - 8 den 10 reps".
- Hien set dang nhap: "Set 2/3".
- Co nut nho de xem lich su gan day cua bai trong sheet.

### Input set

- Gom 3 input chinh nam theo hang hoac grid 3 cot:
  - Kg.
  - Reps.
  - RPE.
- Set type la segmented/menu nho: thuong, warm-up, drop set, failure.
- Nut chinh: "Luu set" hoac "Hoan thanh set".
- Sau khi luu, focus chuyen sang set tiep theo va rest timer bat dau.

### Rest timer

- Nam sticky phia duoi hoac trong bottom sheet nho.
- Hien so dem nguoc lon vua phai.
- Nut +30s, -30s, Bo qua.
- Khi het gio, hien feedback rung/am thanh neu permission cho phep.

### Queue bai tap

- Nam duoi bai hien tai hoac trong sheet.
- Tren man hinh chinh chi hien:
  - Bai hien tai.
  - 2 bai ke tiep.
- Link "Xem tat ca" mo sheet reorder.
- Sheet reorder co drag handle, nut luu thu tu, nut huy.

### PR va tom tat

- PR moi hien bang toast/banner tren cung, khong chen layout input.
- Ket thuc session mo sheet tom tat:
  - Thoi gian tap.
  - So set.
  - Volume.
  - PR moi neu co.
  - CTA "Hoan tat" va nut phu "Sua lai".

## Man hinh Tien do

### Muc tieu

Cho nguoi dung thay xu huong, thanh tich va insight co the hanh dong, khong bien thanh dashboard day dac.

### Layout tong the

- Header "Tien do".
- Segmented control khoang thoi gian nam ngay duoi header.
- Hang KPI 2-3 chi so nam trong viewport dau.
- Cac section doc: Nuoc, Tap luyen, Chi so co the, Coach insight, Bao cao.
- Moi section chi hien mot chart hoac mot noi dung chinh.

### Header va filter

- Header ben trai: "Tien do".
- Ben phai: icon export/report neu can.
- Segmented control: "7 ngay", "30 ngay", "Tuy chinh".
- Khi chon Tuy chinh, mo sheet chon ngay bat dau/ket thuc.

### KPI chinh

- Hien toi da 3 KPI:
  - So buoi tap.
  - Ti le dat muc nuoc.
  - PR moi.
- Moi KPI gom so lon, nhan ngan, delta nho neu co.
- Khong hien qua 3 so tren viewport dau tien.

### Section Nuoc

- Tieu de: "Nuoc".
- Ben phai: link "Chi tiet".
- Chart gon: cot theo ngay hoac line trung binh.
- Dong tom tat: "Trung binh 2.100 ml/ngay".
- Bam section mo drill-down hydration history.

### Section Tap luyen

- Tieu de: "Tap luyen".
- Selector nho de doi metric: Volume, e1RM, PR.
- Moi lan chi hien 1 chart.
- Duoi chart co 1-2 insight ngan, vi du "Bench Press tang 5 kg so voi 30 ngay truoc".
- Bam bai tap mo lich su set cua bai do.

### Section Chi so co the

- Hien can nang/chi so gan nhat neu co.
- Chart gon theo thoi gian.
- CTA nho "Cap nhat chi so" mo sheet input.
- Neu chua co data: empty state ngan va nut them chi so dau tien.

### Coach insight

- Nam sau cac metric chinh.
- Chi hien mot goi y co kha nang hanh dong.
- Cau truc:
  - Tieu de insight ngan.
  - Ly do 1 cau.
  - CTA "Ap dung" hoac "Khong phu hop".
- Feedback mo sheet ngan de chon ly do.

### Bao cao

- Section cuoi man hinh.
- Nut "Tao bao cao" hoac "Xuat du lieu".
- Neu backend chua co endpoint report rieng, label can the hien la tao tu du lieu tren may/local-first.

## Man hinh Cai dat

### Muc tieu

Gom cac cau hinh it dung va cac flow tai khoan/dong bo/tich hop, khong lam nang cac tab hang ngay.

### Layout tong the

- Header "Cai dat".
- Danh sach nhom cau hinh dang section.
- Moi section co tieu de ngan va cac row co icon, label, trang thai ngan, chevron/switch.
- Khong gom tat ca tuy chon thanh mot form dai.

### Nhom Ho so

- Row "Tai khoan": email hoac "Dang dung tren may nay".
- Row "Thong tin ca nhan": tuoi/chieu cao/can nang neu co.
- Row "Muc tieu nuoc": gia tri ml/ngay.
- Row "Don vi": kg/ml/km hoac cau hinh tuong ung.
- Bam row mo sheet/form rieng.

### Nhom Do uong va supplement

- Row "Do uong": cau hinh loai do uong va hydration factor.
- Row "Creatine": lieu dung va lich nhac.
- Row "Supplement khac": so item dang theo doi.
- Trang thai ben phai la text nguoi dung doc duoc, vi du "5 g/ngay", khong hien enum.

### Nhom Quyen rieng tu

- Row "Chia se tien do".
- Row "Leaderboard".
- Row "An du lieu nhay cam".
- Moi row mo sheet giai thich ngan va switch/lua chon.
- Khong hien gia tri raw nhu `private-friends`.

### Nhom Dong bo

- Row "Dang nhap / Dang ky".
- Row "Trang thai dong bo": vi du "Da dong bo" hoac "3 thay doi cho dong bo".
- Row "Xu ly xung dot": chi hien khi co conflict.
- Row "Import / Export".
- Neu co du lieu local va server, mo man hinh preview merge/replace truoc khi ghi de.

### Nhom Tich hop

- Row "Health Connect".
- Row "Apple Health".
- Row "Web Push".
- Moi row co trang thai nguoi dung doc duoc:
  - "Chua ket noi".
  - "Cho quyen".
  - "San sang qua native app".
  - "Chua ho tro tren trinh duyet nay".
- Khong noi "dang dong bo" neu web-only chua co native bridge.

### Nhom Ho tro ky thuat

- Row "Trang thai API".
- Row "Nhat ky loi" chi hien neu debug/admin.
- Row "Ma phien / request id gan day" trong vung chi tiet.
- Cac thong tin ky thuat nam trong sheet, khong day len man hinh chinh.

## Man hinh Tai khoan - Dang nhap/Dang ky

### Muc tieu

Cho phep dang nhap de dong bo nhung khong chan nguoi dung local-first.

### Layout tong the

- Co the la sheet tu Cai dat hoac man hinh rieng.
- Header ngan: "Tai khoan".
- Phan giai thich 1 cau ve dong bo.
- Form email/mat khau.
- CTA chinh.
- Link phu de tiep tuc local.

### Noi dung

- Input email nam tren, co label ro.
- Input mat khau nam duoi, co nut hien/an mat khau.
- CTA chinh thay doi theo mode: "Dang nhap" hoac "Tao tai khoan".
- Nut Google OAuth nam duoi form neu da cau hinh.
- Link doi mode: "Chua co tai khoan? Tao tai khoan" hoac nguoc lai.
- Link phu: "Tiep tuc dung tren may nay".

### Loi va trang thai

- Loi validation hien ngay duoi field.
- Loi auth hien duoi CTA bang tieng Viet.
- Khong hien ma loi raw.
- Khi dang xu ly, CTA co loading state va bi disable.

## Man hinh Health platform

### Muc tieu

Cho nguoi dung cau hinh mong muon dong bo Health Connect/Apple Health, dong thoi noi dung khong hua sai khi webapp chua co native bridge.

### Layout tong the

- Header: "Health platform".
- Section provider.
- Section nhom du lieu.
- Section quyen rieng tu.
- Section trang thai.
- CTA cuoi man hinh.

### Provider

- Hai lua chon dang segmented/card item:
  - Health Connect.
  - Apple Health.
- Moi lua chon co icon, mo ta ngan, trang thai ho tro tren thiet bi.
- Provider khong kha dung thi disabled va co ly do ngan.

### Nhom du lieu

- Checklist:
  - Can nang.
  - Workout.
  - Hydration.
- Moi item co mo ta ngan ve chieu dong bo neu can.
- Mac dinh tat ca chua chon cho den khi nguoi dung dong y.

### Quyen rieng tu va trang thai

- Hien tom tat quyen rieng tu 2-3 dong.
- Trang thai hien bang ngon ngu nguoi dung:
  - "Chua dong bo".
  - "Can ung dung native".
  - "Da cap quyen".
- Neu `nativeBridgeAvailable` chua san sang, CTA chi la "Luu cau hinh", khong phai "Dong bo ngay".

## Man hinh Nhac nho / Web Push

### Muc tieu

Quan ly nhac nuoc, supplement va workout bang thong bao dung luc nguoi dung cho phep.

### Layout tong the

- Header: "Nhac nho".
- Section trang thai thong bao.
- Section nhac nuoc.
- Section supplement.
- Section tap luyen.

### Trang thai thong bao

- Hien dong ngan:
  - "Thong bao da bat".
  - "Can cap quyen thong bao".
  - "Trinh duyet chua ho tro".
- CTA chi hien khi can cap quyen: "Bat thong bao".
- Permission prompt chi goi sau khi nguoi dung bam CTA.

### Nhac nuoc

- Switch bat/tat ben phai.
- Duoi label hien lich ngan, vi du "09:00-21:00, moi 90 phut".
- Bam row mo sheet cau hinh gio bat dau, gio ket thuc, tan suat.

### Nhac supplement va tap luyen

- Moi loai la mot row co switch.
- Row supplement hien so luong supplement dang nhac.
- Row tap luyen hien ngay/gio nhac tiep theo neu co.

## Man hinh Import / Export du lieu

### Muc tieu

Cho phep sao luu, xuat du lieu va restore co preview de tranh mat du lieu.

### Layout tong the

- Header: "Du lieu".
- Section Export.
- Section Import/Restore.
- Section trang thai dong bo sau restore.

### Export

- Lua chon JSON va CSV.
- Moi lua chon co mo ta ngan ve noi dung duoc xuat.
- CTA "Xuat du lieu" nam trong section.

### Import/Restore

- Vung chon file.
- Sau khi chon file, hien preview:
  - So log nuoc.
  - So workout/session.
  - So routine/exercise.
  - So supplement.
- Cho nguoi dung chon nhom se restore bang checkbox.
- CTA nguy hiem "Restore" phai co confirm sheet.

### Sau restore

- Neu dang nhap: hien "Se dong bo khi co mang" hoac "Dang dong bo".
- Neu local-only: hien "Da luu tren may nay".

## Man hinh Loi va trang thai he thong

### Muc tieu

Thong bao loi bang ngon ngu nguoi dung, dong thoi giu thong tin ho tro ky thuat du de debug.

### Layout loi inline

- Loi field nam ngay duoi input lien quan.
- Loi network nam trong toast/banner ngan.
- Loi server co the hien request id trong dong chi tiet co the mo rong.

### Banner offline/sync

- Banner nho phia tren noi dung hoac duoi header.
- Text vi du:
  - "Dang offline, thay doi se duoc luu tren may".
  - "3 thay doi dang cho dong bo".
  - "Dong bo that bai, se thu lai".
- Banner khong day CTA chinh ra khoi tam voi.

### Man hinh/Sheet chi tiet loi

- Chi mo khi nguoi dung bam "Chi tiet".
- Hien:
  - Mo ta loi bang tieng Viet.
  - Request id neu co.
  - Thoi gian.
  - Nut thu lai neu co the.
- Khong hien stack trace cho nguoi dung thuong.
