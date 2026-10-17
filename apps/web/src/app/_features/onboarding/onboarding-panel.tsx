"use client";

import type { EquipmentType } from "@evolvefit/shared";
import { suggestedRoutineTemplate, suggestedWaterTargetMl, type AppState } from "@evolvefit/shared";
import { CalendarCheck } from "lucide-react";
import React from "react";
import { SwitchField } from "../ui/switch-field";

const onboardingTemplateLabels: Record<AppState["activeTemplate"], string> = {
  ppl: "PPL",
  "upper-lower": "Trên/Dưới",
  "full-body": "Toàn thân",
  custom: "Tùy chỉnh"
};

const onboardingEquipmentLabels: Record<string, string> = {
  barbell: "Đòn tạ",
  dumbbell: "Tạ đơn",
  cable: "Cáp",
  machine: "Máy",
  bodyweight: "Trọng lượng cơ thể",
  kettlebell: "Kettlebell"
};

function notificationPermissionLabel(status: NotificationPermission) {
  if (status === "granted") return "Đã cấp quyền";
  if (status === "denied") return "Bị từ chối";
  return "Chưa hỏi quyền";
}

export function OnboardingPanel(props: {
  profile: AppState["profile"];
  updateProfile: (next: Partial<AppState["profile"]>) => void;
  activeTemplate: AppState["activeTemplate"];
  applyTemplate: (template: AppState["activeTemplate"]) => void;
  step: number;
  setStep: (step: number) => void;
  notificationSettings: AppState["notificationSettings"];
  notificationPermission: NotificationPermission;
  updateNotificationSettings: (next: Partial<AppState["notificationSettings"]>) => void;
  requestNotifications: () => Promise<void>;
  completeOnboarding: () => void;
}) {
  const steps = ["Mục tiêu", "Kinh nghiệm", "Ngày tập", "Dụng cụ", "Nước", "Nhắc nhở", "Xem lại"];
  const workoutDays = [
    ["Mon", "T2"],
    ["Tue", "T3"],
    ["Wed", "T4"],
    ["Thu", "T5"],
    ["Fri", "T6"],
    ["Sat", "T7"],
    ["Sun", "CN"]
  ];
  const toggleWorkoutDay = (day: string) => {
    const nextDays = props.profile.workoutDays.includes(day)
      ? props.profile.workoutDays.filter((item) => item !== day)
      : [...props.profile.workoutDays, day];
    props.updateProfile({ workoutDays: nextDays });
  };
  const toggleEquipment = (equipment: EquipmentType) => {
    const current = props.profile.availableEquipment ?? [];
    const nextEquipment = current.includes(equipment) ? current.filter((item) => item !== equipment) : [...current, equipment];
    props.updateProfile({ availableEquipment: nextEquipment });
  };
  const canGoBack = props.step > 0;
  const canGoNext = props.step < steps.length - 1;
  const suggestedWater = suggestedWaterTargetMl(props.profile.bodyWeightKg, props.profile.workoutDays.length);
  const suggestedTemplate = suggestedRoutineTemplate(props.profile.workoutDays.length);
  const emailOptionalOk = !props.profile.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.profile.email);
  const hoursOk = props.profile.wakeHour >= 0 && props.profile.wakeHour <= 23 && props.profile.sleepHour >= 0 && props.profile.sleepHour <= 23 && props.profile.wakeHour !== props.profile.sleepHour;
  const validationMessage =
    props.step === 1 && (props.profile.bodyWeightKg <= 0 || props.profile.heightCm <= 0)
      ? "Cân nặng và chiều cao giúp gợi ý nước chính xác hơn, hãy nhập số lớn hơn 0 hoặc bỏ qua để sửa sau."
      : props.step === 2 && props.profile.workoutDays.length < 1
        ? "Chọn ít nhất một ngày tập để EvolveFit tạo lịch ban đầu."
        : props.step === 3 && !(props.profile.availableEquipment?.length)
          ? "Chọn ít nhất một loại dụng cụ. Có thể chọn trọng lượng cơ thể nếu chưa có thiết bị."
          : props.step === 4 && (props.profile.waterTargetMl < 1000 || props.profile.waterTargetMl > 6000 || !hoursOk)
            ? "Mục tiêu nước cần từ 1000-6000ml; giờ dậy và giờ ngủ phải từ 0-23 và không trùng nhau."
            : props.step === 5 && (props.profile.creatineAmountG < 1 || props.profile.creatineAmountG > 20 || props.profile.creatineHour < 0 || props.profile.creatineHour > 23)
              ? "Creatine và giờ uống là tùy chọn, nhưng nếu dùng thì hãy giữ trong ngưỡng hợp lý."
              : props.step === 6 && !emailOptionalOk
                ? "Email là tùy chọn, nhưng nếu nhập thì cần đúng định dạng."
                : "";

  return (
    <section className="card onboarding-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Thiết lập nhanh</p>
          <h2>{steps[props.step]}</h2>
        </div>
        <CalendarCheck size={22} />
      </div>
      <div className="step-dots" aria-label="Tiến độ thiết lập ban đầu">
        {steps.map((label, index) => (
          <button key={label} className={props.step === index ? "active" : ""} onClick={() => props.setStep(index)}>
            {index + 1}
          </button>
        ))}
      </div>
      <p className="progress-copy">Bước {props.step + 1}/{steps.length}</p>
      {validationMessage && <p className="form-warning">{validationMessage}</p>}

      {props.step === 0 && (
        <div className="onboarding-choice-grid" aria-label="Mục tiêu tập luyện">
          {[
            ["muscle", "Tăng cơ", "Tập đều, tăng volume và giữ phục hồi ổn định."],
            ["strength", "Tăng sức mạnh", "Ưu tiên bài chính, PR và tiến độ tạ."],
            ["fat-loss", "Giảm mỡ", "Giữ nhịp tập và mục tiêu nước rõ ràng."],
            ["health", "Sức khỏe", "Xây thói quen bền vững, ít áp lực." ]
          ].map(([id, title, text]) => (
            <button
              key={id}
              className={props.profile.trainingGoal === id ? "active" : ""}
              onClick={() => props.updateProfile({ trainingGoal: id as AppState["profile"]["trainingGoal"] })}
            >
              <strong>{title}</strong>
              <span>{text}</span>
            </button>
          ))}
        </div>
      )}

      {props.step === 1 && (
        <div className="stack compact-stack">
          <div className="onboarding-choice-grid" aria-label="Kinh nghiệm tập luyện">
            {[
              ["beginner", "Mới tập", "Cần lịch rõ, ít biến số."],
              ["intermediate", "Trung cấp", "Đã quen set, rep và tăng tải."],
              ["advanced", "Nâng cao", "Cần kiểm soát volume và phục hồi kỹ hơn."]
            ].map(([id, title, text]) => (
              <button
                key={id}
                className={props.profile.experienceLevel === id ? "active" : ""}
                onClick={() => props.updateProfile({ experienceLevel: id as AppState["profile"]["experienceLevel"] })}
              >
                <strong>{title}</strong>
                <span>{text}</span>
              </button>
            ))}
          </div>
          <p className="privacy-note">Cân nặng và chiều cao chỉ dùng để gợi ý nước, mục tiêu và hiển thị tiến độ trên máy của bạn.</p>
          <div className="onboarding-grid">
          <label>
            <span>Cân nặng</span>
            <input type="number" value={props.profile.bodyWeightKg} onChange={(event) => props.updateProfile({ bodyWeightKg: Number(event.target.value) })} />
          </label>
          <label>
            <span>Chiều cao</span>
            <input type="number" value={props.profile.heightCm} onChange={(event) => props.updateProfile({ heightCm: Number(event.target.value) })} />
          </label>
          <label>
            <span>Cân nặng mục tiêu</span>
            <input type="number" value={props.profile.goalWeightKg ?? props.profile.bodyWeightKg} onChange={(event) => props.updateProfile({ goalWeightKg: Number(event.target.value) })} />
          </label>
          <label>
            <span>% mỡ mục tiêu</span>
            <input type="number" value={props.profile.goalBodyFatPercent ?? 15} onChange={(event) => props.updateProfile({ goalBodyFatPercent: Number(event.target.value) })} />
          </label>
          </div>
        </div>
      )}

      {props.step === 2 && (
        <div className="stack compact-stack">
          <p className="privacy-note">Chọn những ngày bạn thường có thể tập. Bạn luôn có thể đổi lịch sau trong Routines.</p>
          <div className="day-picker">
            {workoutDays.map(([day, label]) => (
              <button key={day} className={props.profile.workoutDays.includes(day) ? "active" : ""} onClick={() => toggleWorkoutDay(day)}>
                {label}
              </button>
            ))}
          </div>
          <button className="secondary-button" onClick={() => props.applyTemplate(suggestedTemplate)}>
            Gợi ý lịch {onboardingTemplateLabels[suggestedTemplate]} theo số ngày đã chọn
          </button>
        </div>
      )}

      {props.step === 3 && (
        <div className="stack compact-stack">
          <div className="template-row" aria-label="Dụng cụ có sẵn">
            {(["barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell"] as EquipmentType[]).map((equipment) => (
              <button
                key={equipment}
                className={(props.profile.availableEquipment ?? []).includes(equipment) ? "active" : ""}
                onClick={() => toggleEquipment(equipment)}
              >
                {onboardingEquipmentLabels[equipment] ?? equipment}
              </button>
            ))}
          </div>
          <div className="template-row" aria-label="Mẫu lịch tập thiết lập ban đầu">
            {(Object.entries(onboardingTemplateLabels) as [AppState["activeTemplate"], string][]).map(([id, label]) => (
              <button key={id} className={props.activeTemplate === id ? "active" : ""} onClick={() => props.applyTemplate(id as AppState["activeTemplate"])}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {props.step === 4 && (
        <div className="onboarding-grid">
          <label>
            <span>Mục tiêu nước</span>
            <input type="number" value={props.profile.waterTargetMl} onChange={(event) => props.updateProfile({ waterTargetMl: Number(event.target.value) })} />
          </label>
          <label>
            <span>Đơn vị nước</span>
            <select value={props.profile.unitVolume} onChange={(event) => props.updateProfile({ unitVolume: event.target.value as AppState["profile"]["unitVolume"] })}>
              <option value="ml">ml</option>
              <option value="oz">oz</option>
            </select>
          </label>
          <label>
            <span>Giờ dậy</span>
            <input type="number" min="0" max="23" value={props.profile.wakeHour} onChange={(event) => props.updateProfile({ wakeHour: Number(event.target.value) })} />
          </label>
          <label>
            <span>Giờ ngủ</span>
            <input type="number" min="0" max="23" value={props.profile.sleepHour} onChange={(event) => props.updateProfile({ sleepHour: Number(event.target.value) })} />
          </label>
          <button className="secondary-button inline-suggestion" onClick={() => props.updateProfile({ waterTargetMl: suggestedWater })}>
            Gợi ý {suggestedWater}ml
          </button>
        </div>
      )}

      {props.step === 5 && (
        <div className="onboarding-grid">
          <label>
            <span>Creatine</span>
            <input type="number" min="1" max="20" value={props.profile.creatineAmountG} onChange={(event) => props.updateProfile({ creatineAmountG: Number(event.target.value) })} />
          </label>
          <label>
            <span>Giờ uống</span>
            <input type="number" min="0" max="23" value={props.profile.creatineHour} onChange={(event) => props.updateProfile({ creatineHour: Number(event.target.value) })} />
          </label>
          <SwitchField
            className="onboarding-switch"
            label="Nhắc uống nước"
            checked={props.notificationSettings.hydrationEnabled}
            onChange={(checked) => props.updateNotificationSettings({ hydrationEnabled: checked })}
          />
          <SwitchField
            className="onboarding-switch"
            label="Nhắc creatine"
            checked={props.notificationSettings.creatineEnabled}
            onChange={(checked) => props.updateNotificationSettings({ creatineEnabled: checked })}
          />
          <button className="secondary-button inline-suggestion" onClick={props.requestNotifications}>
            Quyền thông báo: {notificationPermissionLabel(props.notificationPermission)}
          </button>
          <p className="privacy-note inline-suggestion">Có thể bỏ qua nhắc nhở bây giờ. Bạn sẽ chỉnh lại trong Settings nếu cần.</p>
        </div>
      )}

      {props.step === 6 && (
        <div className="stack compact-stack">
          <div className="onboarding-review-grid">
            <div><span>Mục tiêu</span><strong>{props.profile.trainingGoal ?? "muscle"}</strong></div>
            <div><span>Kinh nghiệm</span><strong>{props.profile.experienceLevel ?? "intermediate"}</strong></div>
            <div><span>Lịch</span><strong>{props.profile.workoutDays.length} ngày/tuần</strong></div>
            <div><span>Dụng cụ</span><strong>{(props.profile.availableEquipment ?? []).map((item) => onboardingEquipmentLabels[item] ?? item).join(", ")}</strong></div>
            <div><span>Nước</span><strong>{props.profile.waterTargetMl}ml/ngày</strong></div>
            <div><span>Dữ liệu</span><strong>{props.profile.syncPreference === "account-sync" ? "Cloud khi đăng nhập" : "Local-first"}</strong></div>
          </div>
          <div className="onboarding-grid">
            <label>
              <span>Tên hiển thị</span>
              <input value={props.profile.name} onChange={(event) => props.updateProfile({ name: event.target.value })} />
            </label>
            <label>
              <span>Email tùy chọn</span>
              <input type="email" value={props.profile.email} onChange={(event) => props.updateProfile({ email: event.target.value })} />
            </label>
            <label>
              <span>Đơn vị cân nặng</span>
              <select value={props.profile.unitWeight} onChange={(event) => props.updateProfile({ unitWeight: event.target.value as AppState["profile"]["unitWeight"] })}>
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </label>
            <label>
              <span>Timezone</span>
              <input value={props.profile.timezone} onChange={(event) => props.updateProfile({ timezone: event.target.value })} />
            </label>
            <label className="wide-field">
              <span>Chế độ dữ liệu</span>
              <select
                value={props.profile.syncPreference ?? "local-first"}
                onChange={(event) => props.updateProfile({ syncPreference: event.target.value as AppState["profile"]["syncPreference"] })}
              >
                <option value="local-first">Local-first, đồng bộ sau khi đăng nhập</option>
                <option value="account-sync">Ưu tiên tài khoản cloud</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div className="split-actions">
        <button className="secondary-button" onClick={() => props.setStep(props.step - 1)} disabled={!canGoBack}>
          Quay lại
        </button>
        {canGoNext ? (
          <button className="primary-button training-bg" onClick={() => props.setStep(props.step + 1)} disabled={Boolean(validationMessage)}>
            Tiếp tục
          </button>
        ) : (
          <button className="primary-button training-bg" onClick={props.completeOnboarding} disabled={Boolean(validationMessage)}>
            Hoàn tất thiết lập
          </button>
        )}
      </div>
    </section>
  );
}
