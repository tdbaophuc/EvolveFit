"use client";

import React, { useState } from "react";
import { Droplets, Plus } from "lucide-react";
import { Button, Card, CardHeader, Chip, DataRow, EmptyState, ErrorState, FormField, IconButton, InlineNotice, SegmentedControl, Sheet, Skeleton, StatNumber } from "@/components/ui";

export function UiPreview() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState("30");
  const [chip, setChip] = useState(true);

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-md gap-4 bg-background px-4 py-6 font-sans text-foreground">
      <h1 className="text-2xl font-semibold leading-8">UI primitives</h1>

      <Card>
        <CardHeader title="Buttons" description="primary / secondary / ghost / danger" />
        <div className="flex flex-wrap gap-2">
          <Button>Bắt đầu tập</Button>
          <Button variant="secondary">Xem lịch</Button>
          <Button variant="ghost">Bỏ qua</Button>
          <Button variant="danger">Xoá</Button>
          <Button variant="danger-soft">Xoá dữ liệu</Button>
          <Button loading>Đang lưu</Button>
          <IconButton label="Thêm" icon={<Plus size={18} />} variant="secondary" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Số liệu" action={<Droplets size={18} className="text-secondary" />} />
        <StatNumber label="Nước hôm nay" value="1.250" unit="ml" />
        <DataRow label="Mục tiêu" value="2.500 ml" />
        <DataRow label="Nhắc nhở" description="Mỗi 2 giờ" value="Bật" />
      </Card>

      <Card>
        <CardHeader title="Form" />
        <div className="grid gap-3">
          <FormField label="Email" type="email" placeholder="ban@vidu.com" />
          <FormField label="Mật khẩu" type="password" hint="Ít nhất 8 ký tự" />
          <FormField label="Cân nặng" error="Cân nặng phải lớn hơn 0." />
        </div>
      </Card>

      <Card>
        <CardHeader title="Chip / Segmented" />
        <div className="flex flex-wrap items-center gap-2">
          <Chip selected={chip} onClick={() => setChip(!chip)}>
            Tạ đơn
          </Chip>
          <Chip>Máy</Chip>
          <SegmentedControl
            label="Khoảng thời gian"
            value={range}
            onChange={setRange}
            options={[
              { value: "30", label: "30n" },
              { value: "90", label: "90n" }
            ]}
          />
        </div>
      </Card>

      <InlineNotice>Đang kết nối máy chủ… lần đầu có thể mất tới 1 phút.</InlineNotice>
      <InlineNotice tone="warning">Có 2 mục chưa đồng bộ.</InlineNotice>
      <EmptyState title="Chưa có hoạt động" description="Log nước hoặc bắt đầu buổi tập." action={<Button size="sm">Log 250ml</Button>} />
      <ErrorState description="Kiểm tra mạng rồi thử lại." onRetry={() => undefined} />
      <div className="grid gap-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24" />
      </div>

      <Button variant="secondary" onClick={() => setOpen(true)}>
        Mở sheet
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Chi tiết bài tập" description="Ví dụ bottom sheet" footer={<Button fullWidth>Thêm vào lịch</Button>}>
        <p className="text-[15px] leading-6">Nội dung chi tiết hiển thị trong sheet thay vì xếp chồng dưới danh sách.</p>
      </Sheet>
    </main>
  );
}
