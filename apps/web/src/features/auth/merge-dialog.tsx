"use client";

import React from "react";
import { CloudDownload, CloudUpload, Smartphone } from "lucide-react";
import { Button, InlineNotice, Sheet } from "@/components/ui";
import { keepLocalAccountData, mergeLocalAccountToCloud, replaceLocalWithCloud } from "./actions";
import { useAuthStore } from "./store";

type Option = {
  id: "merge" | "replace" | "keep";
  label: string;
  ariaLabel: string;
  icon: React.ReactNode;
  consequence: string;
  onChoose: () => void;
};

/**
 * Shown the first time an account is opened on this device (brief 6.3): the user decides how this
 * device's data and the account's cloud data are combined. Closing the dialog keeps the local copy.
 */
export function MergeDecisionDialog() {
  const preview = useAuthStore((store) => store.cloudMergePreview);
  const pending = useAuthStore((store) => store.pending);
  const slow = useAuthStore((store) => store.slow);
  if (!preview) return null;

  const counts = `${preview.hydrationLogs} log nước, ${preview.workoutSets} set, ${preview.routines} lịch tập, ${preview.bodyMetrics} chỉ số cơ thể`;
  const options: Option[] = [
    {
      id: "merge",
      label: "Gộp dữ liệu",
      ariaLabel: "merge-local-to-cloud",
      icon: <CloudUpload size={18} />,
      consequence: `Đưa dữ liệu trên máy (${counts}) lên tài khoản và giữ cả dữ liệu đã có trên cloud. Bản mới hơn được giữ khi trùng.`,
      onChoose: () => void mergeLocalAccountToCloud()
    },
    {
      id: "replace",
      label: "Dùng dữ liệu tài khoản",
      ariaLabel: "replace-local-with-cloud",
      icon: <CloudDownload size={18} />,
      consequence: "Bỏ bản trên máy cho tài khoản này và tải dữ liệu từ cloud. Dữ liệu khách trên máy vẫn còn khi bạn đăng xuất.",
      onChoose: () => void replaceLocalWithCloud()
    },
    {
      id: "keep",
      label: "Giữ trên máy",
      ariaLabel: "keep-local-after-auth",
      icon: <Smartphone size={18} />,
      consequence: "Dùng dữ liệu trên máy cho tài khoản nhưng chưa tải dữ liệu cũ lên. Chỉ thay đổi từ bây giờ được đồng bộ.",
      onChoose: keepLocalAccountData
    }
  ];

  return (
    <Sheet open onClose={keepLocalAccountData} title="Đồng bộ dữ liệu với tài khoản" description="Thiết bị này đã có dữ liệu. Chọn cách kết hợp với tài khoản của bạn.">
      <div className="grid gap-3">
        {preview.conflicts.map((conflict) => (
          <InlineNotice key={conflict} tone="warning">
            {conflict}
          </InlineNotice>
        ))}
        {options.map((option) => (
          <div key={option.id} className="grid gap-2 rounded-2xl border border-border/70 p-3">
            <p className="m-0 text-sm leading-5 text-muted-foreground">{option.consequence}</p>
            <Button
              variant={option.id === "merge" ? "primary" : "secondary"}
              leadingIcon={option.icon}
              loading={pending === option.id}
              disabled={pending !== null}
              aria-label={option.ariaLabel}
              onClick={option.onChoose}
            >
              {option.label}
            </Button>
          </div>
        ))}
        {pending && slow && <InlineNotice>Đang kết nối máy chủ… Lần đầu có thể mất tới 1 phút.</InlineNotice>}
      </div>
    </Sheet>
  );
}
