"use client";

import { CalendarCheck } from "lucide-react";
import React from "react";
import {
  previewRoutineTemplateApply,
  type EquipmentType,
  type RoutineTemplate,
  type RoutineTemplatePreview
} from "@evolvefit/shared";
import type { AppState } from "@evolvefit/shared";

const goalOptions: ("all" | RoutineTemplate["targetGoal"])[] = ["all", "strength", "muscle", "fat-loss", "health"];
const equipmentOptions: ("all" | EquipmentType)[] = ["all", "barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"];

const text = {
  eyebrow: "Marketplace lịch tập",
  title: "Chọn template có sẵn",
  search: "Tìm template",
  goal: "Mục tiêu",
  equipment: "Thiết bị",
  all: "Tất cả",
  daysPerWeek: "ngày/tuần",
  minutesPerSession: "phút/buổi",
  details: "Chi tiết",
  empty: "Trống",
  noTemplate: "Không có template phù hợp",
  tryFilters: "Thử bỏ bớt filter hoặc tìm theo mục tiêu khác.",
  duration: "Thời lượng",
  experience: "Kinh nghiệm",
  close: "Đóng chi tiết",
  customize: "Tùy biến trước khi lưu",
  apply: "Áp dụng",
  selected: "Đã chọn",
  selectedHint: "Bấm Chi tiết để xem layout tuần, cảnh báo thiếu dụng cụ và hành động áp dụng.",
  chooseTemplate: "Chọn một template để xem chi tiết",
  copyNotice: "Template public chỉ được copy thành routine của bạn khi áp dụng.",
  exerciseUnit: "bài"
};

export function RoutineTemplateMarketplace(props: {
  profile: AppState["profile"];
  routineTemplateCatalog: RoutineTemplate[];
  selectedRoutineTemplate: RoutineTemplate | null;
  routineTemplatePreview: RoutineTemplatePreview | null;
  routineTemplateSearch: string;
  setRoutineTemplateSearch: (value: string) => void;
  routineTemplateGoalFilter: "all" | RoutineTemplate["targetGoal"];
  setRoutineTemplateGoalFilter: (value: "all" | RoutineTemplate["targetGoal"]) => void;
  routineTemplateEquipmentFilter: "all" | EquipmentType;
  setRoutineTemplateEquipmentFilter: (value: "all" | EquipmentType) => void;
  selectRoutineTemplate: (id: string) => void;
  previewRoutineTemplate: (template: RoutineTemplate) => void;
  applyRoutineMarketplaceTemplate: (template: RoutineTemplate, customize?: boolean) => void;
}) {
  const [showTemplateDetail, setShowTemplateDetail] = React.useState(false);

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
        </div>
        <CalendarCheck size={20} />
      </div>

      <div className="exercise-edit-grid">
        <label className="wide-field">
          <span>{text.search}</span>
          <input value={props.routineTemplateSearch} onChange={(event) => props.setRoutineTemplateSearch(event.target.value)} placeholder="PPL, home, strength..." />
        </label>
        <label>
          <span>{text.goal}</span>
          <select value={props.routineTemplateGoalFilter} onChange={(event) => props.setRoutineTemplateGoalFilter(event.target.value as "all" | RoutineTemplate["targetGoal"])}>
            {goalOptions.map((goal) => <option key={goal} value={goal}>{goal === "all" ? text.all : goal}</option>)}
          </select>
        </label>
        <label>
          <span>{text.equipment}</span>
          <select value={props.routineTemplateEquipmentFilter} onChange={(event) => props.setRoutineTemplateEquipmentFilter(event.target.value as "all" | EquipmentType)}>
            {equipmentOptions.map((equipment) => <option key={equipment} value={equipment}>{equipment === "all" ? text.all : equipment}</option>)}
          </select>
        </label>
      </div>

      <div className="exercise-marketplace-grid">
        <div className="timeline compact">
          {props.routineTemplateCatalog.slice(0, 8).map((template) => {
            const preview = previewRoutineTemplateApply(template, {
              trainingGoal: props.profile.trainingGoal,
              experienceLevel: props.profile.experienceLevel,
              availableEquipment: props.profile.availableEquipment
            });
            const selected = props.selectedRoutineTemplate?.id === template.id;
            return (
              <div key={template.id} className={selected ? "template-result active" : "template-result"}>
                <button className="template-select-card" onClick={() => { props.selectRoutineTemplate(template.id); setShowTemplateDetail(false); }}>
                  <span>{template.targetGoal} - {template.daysPerWeek} {text.daysPerWeek}</span>
                  <strong>{template.name}</strong>
                  <em>{template.minutesPerSession} {text.minutesPerSession} - fit {preview.compatibility.score}%</em>
                </button>
                <button className="secondary-button" onClick={() => { props.selectRoutineTemplate(template.id); props.previewRoutineTemplate(template); setShowTemplateDetail(true); }}>
                  {text.details}
                </button>
              </div>
            );
          })}
          {!props.routineTemplateCatalog.length && <div><span>{text.empty}</span><strong>{text.noTemplate}</strong><em>{text.tryFilters}</em></div>}
        </div>

        <div className="library-detail">
          {props.selectedRoutineTemplate && props.routineTemplatePreview && showTemplateDetail ? (
            <>
              <div>
                <p className="eyebrow">{props.selectedRoutineTemplate.creatorName} - v{props.selectedRoutineTemplate.version}</p>
                <h3>{props.selectedRoutineTemplate.name}</h3>
                <p>{props.selectedRoutineTemplate.summary}</p>
              </div>
              <div className="metric-grid compact">
                <div><span>Fit score</span><strong>{props.routineTemplatePreview.compatibility.score}%</strong></div>
                <div><span>{text.daysPerWeek}</span><strong>{props.selectedRoutineTemplate.daysPerWeek}</strong></div>
                <div><span>{text.duration}</span><strong>{props.selectedRoutineTemplate.minutesPerSession}p</strong></div>
                <div><span>{text.experience}</span><strong>{props.selectedRoutineTemplate.experienceLevel}</strong></div>
              </div>
              {props.routineTemplatePreview.compatibility.warnings.length > 0 && (
                <div className="sync-conflict">
                  {props.routineTemplatePreview.compatibility.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              )}
              <div className="timeline compact">
                {props.routineTemplatePreview.routine.days.map((day) => (
                  <div key={day.id}>
                    <span>{day.day} - {day.exercises.length} {text.exerciseUnit}</span>
                    <strong>{day.name}</strong>
                    <em>{day.exercises.map((exercise) => exercise.name).join(", ")}</em>
                  </div>
                ))}
              </div>
              <div className="split-actions">
                <button className="secondary-button" onClick={() => setShowTemplateDetail(false)}>{text.close}</button>
                <button className="secondary-button" onClick={() => props.applyRoutineMarketplaceTemplate(props.selectedRoutineTemplate!, true)}>{text.customize}</button>
                <button className="primary-button training-bg" onClick={() => props.applyRoutineMarketplaceTemplate(props.selectedRoutineTemplate!)}>{text.apply}</button>
              </div>
            </>
          ) : props.selectedRoutineTemplate ? (
            <div><span>{text.selected}</span><strong>{props.selectedRoutineTemplate.name}</strong><em>{text.selectedHint}</em></div>
          ) : (
            <div><span>{text.empty}</span><strong>{text.chooseTemplate}</strong><em>{text.copyNotice}</em></div>
          )}
        </div>
      </div>
    </section>
  );
}
