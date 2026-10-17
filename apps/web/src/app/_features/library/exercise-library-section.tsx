"use client";

import { Dumbbell, Plus, Trash2 } from "lucide-react";
import {
  normalizeExerciseDefinition,
  type EquipmentType,
  type ExerciseDefinition,
  type MovementPattern
} from "@evolvefit/shared";
import React from "react";
import { ConfirmActionButton } from "../ui/confirm-action-button";
import {
  equipmentLabels,
  movementPatternLabels,
  muscleFilterLabels,
  muscleGroupLabel
} from "../workout/workout-labels";

const muscleFilterOptions = ["all", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Custom", "Ngực", "Lưng", "Chân", "Vai", "Tay", "Tùy chỉnh"];
const equipmentOptions = ["all", "barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"];
const difficultyOptions = ["all", "beginner", "intermediate", "advanced"];
const movementPatternOptions = ["push", "pull", "squat", "hinge", "lunge", "carry", "isolation", "core"];

const text = {
  eyebrow: "Thư viện bài tập",
  title: "Chọn hoặc tùy chỉnh",
  search: "Tìm kiếm",
  searchPlaceholder: "Tìm theo tên bài, nhóm cơ, dụng cụ...",
  muscle: "Nhóm cơ",
  equipment: "Dụng cụ",
  difficulty: "Độ khó",
  all: "Tất cả",
  hideAdvanced: "Ẩn bộ lọc nâng cao",
  showAdvanced: "Mở bộ lọc nâng cao",
  builtIn: "Có sẵn",
  details: "Chi tiết",
  empty: "Trống",
  noMarketplace: "Không có bài marketplace phù hợp",
  tryFilters: "Thử bỏ bớt filter hoặc tìm theo nhóm cơ khác.",
  marketplaceDetail: "Chi tiết marketplace",
  applyCue: "Áp dụng khi thêm vào lịch cá nhân.",
  mistake: "Lỗi thường gặp",
  techniqueReminder: "Dùng để nhắc kỹ thuật trước set.",
  clone: "Tạo bản riêng",
  addToDay: "Thêm vào ngày tập",
  hideCustom: "Ẩn bài tự tạo",
  showCustom: "Mở bài tự tạo",
  custom: "Tùy chỉnh",
  edit: "Sửa",
  deleteCustom: "Xóa bài tùy chỉnh",
  confirmDelete: "Xác nhận xóa",
  noCustom: "Chưa có bài tự tạo",
  customHint: "Thêm bài riêng nếu marketplace chưa có biến thể bạn cần.",
  customName: "Tên tùy chỉnh",
  pattern: "Kiểu chuyển động",
  addCustom: "Thêm bài tùy chỉnh"
};

export function ExerciseLibrarySection(props: {
  showAdvancedLibrary: boolean;
  setShowAdvancedLibrary: (value: boolean) => void;
  marketplaceExercises: ExerciseDefinition[];
  customExerciseLibrary: ExerciseDefinition[];
  selectedMarketplaceExercise: ExerciseDefinition | null;
  selectMarketplaceExercise: (id: string) => void;
  addExerciseFromLibrary: (definition: ExerciseDefinition) => void;
  cloneExerciseFromMarketplace: (definition: ExerciseDefinition) => void;
  updateExerciseDefinition: (id: string, patch: Partial<ExerciseDefinition>) => void;
  deleteExerciseDefinition: (id: string) => void;
  addCustomExerciseDefinition: () => void;
  librarySearch: string;
  setLibrarySearch: (value: string) => void;
  libraryMuscleFilter: string;
  setLibraryMuscleFilter: (value: string) => void;
  libraryEquipmentFilter: string;
  setLibraryEquipmentFilter: (value: string) => void;
  libraryDifficultyFilter: string;
  setLibraryDifficultyFilter: (value: string) => void;
  libraryTagFilter: string;
  setLibraryTagFilter: (value: string) => void;
  newLibraryExerciseName: string;
  setNewLibraryExerciseName: (value: string) => void;
  newLibraryMuscleGroup: string;
  setNewLibraryMuscleGroup: (value: string) => void;
  newLibraryEquipment: EquipmentType;
  setNewLibraryEquipment: (value: EquipmentType) => void;
  newLibraryPattern: MovementPattern;
  setNewLibraryPattern: (value: MovementPattern) => void;
}) {
  const selectedMarketplaceExercise = props.selectedMarketplaceExercise ? normalizeExerciseDefinition(props.selectedMarketplaceExercise) : null;
  const marketplaceTags = Array.from(new Set(props.marketplaceExercises.flatMap((exercise) => normalizeExerciseDefinition(exercise).tags ?? []))).slice(0, 12);
  const [showCustomLibraryTools, setShowCustomLibraryTools] = React.useState(false);

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{text.eyebrow}</p>
          <h2>{text.title}</h2>
        </div>
        <Plus size={20} />
      </div>

      <div className="exercise-edit-grid">
        <label className="wide-field">
          <span>{text.search}</span>
          <input value={props.librarySearch} onChange={(event) => props.setLibrarySearch(event.target.value)} placeholder={text.searchPlaceholder} />
        </label>
        <label>
          <span>{text.muscle}</span>
          <select value={props.libraryMuscleFilter} onChange={(event) => props.setLibraryMuscleFilter(event.target.value)}>
            {muscleFilterOptions.map((item) => <option key={item} value={item}>{muscleFilterLabels[item] ?? item}</option>)}
          </select>
        </label>
        <label>
          <span>{text.equipment}</span>
          <select value={props.libraryEquipmentFilter} onChange={(event) => props.setLibraryEquipmentFilter(event.target.value)}>
            {equipmentOptions.map((item) => <option key={item} value={item}>{equipmentLabels[item] ?? item}</option>)}
          </select>
        </label>
        <label>
          <span>{text.difficulty}</span>
          <select value={props.libraryDifficultyFilter} onChange={(event) => props.setLibraryDifficultyFilter(event.target.value)}>
            {difficultyOptions.map((item) => <option key={item} value={item}>{item === "all" ? text.all : item}</option>)}
          </select>
        </label>
      </div>

      <button className="secondary-button disclosure-toggle" onClick={() => props.setShowAdvancedLibrary(!props.showAdvancedLibrary)} aria-expanded={props.showAdvancedLibrary}>
        {props.showAdvancedLibrary ? text.hideAdvanced : text.showAdvanced}
      </button>
      {props.showAdvancedLibrary && (
        <div className="exercise-edit-grid">
          <label>
            <span>Tag</span>
            <select value={props.libraryTagFilter} onChange={(event) => props.setLibraryTagFilter(event.target.value)}>
              {["all", ...marketplaceTags].map((item) => <option key={item} value={item}>{item === "all" ? text.all : item}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className="exercise-library plan-list">
        {props.marketplaceExercises.slice(0, 12).map((exercise) => {
          const normalized = normalizeExerciseDefinition(exercise);
          return (
            <div key={exercise.id} className="exercise-result-card">
              <div className="exercise-result-icon" aria-hidden="true">
                <Dumbbell size={18} />
              </div>
              <button className="exercise-select exercise-result-copy" onClick={() => props.addExerciseFromLibrary(exercise)}>
                <strong>{normalized.name}</strong>
                <em>{muscleGroupLabel(normalized.muscleGroup)} - {equipmentLabels[normalized.equipment] ?? normalized.equipment} - {normalized.difficulty}</em>
                <span className="tiny-chip">{normalized.catalogSource === "marketplace" ? "Marketplace" : text.builtIn}</span>
              </button>
              <div className="row-actions">
                <button className="secondary-button exercise-detail-button" onClick={() => props.selectMarketplaceExercise(exercise.id)}>{text.details}</button>
              </div>
            </div>
          );
        })}
        {!props.marketplaceExercises.length && <div><span>{text.empty}</span><strong>{text.noMarketplace}</strong><em>{text.tryFilters}</em></div>}
      </div>

      {selectedMarketplaceExercise && (
        <div className="import-preview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{text.marketplaceDetail}</p>
              <h2>{selectedMarketplaceExercise.name}</h2>
            </div>
            <span className="sync-pill">{selectedMarketplaceExercise.version ?? 1}</span>
          </div>
          <p>{muscleGroupLabel(selectedMarketplaceExercise.muscleGroup)} - {equipmentLabels[selectedMarketplaceExercise.equipment] ?? selectedMarketplaceExercise.equipment} - {selectedMarketplaceExercise.difficulty}</p>
          <div className="chip-row">
            {(selectedMarketplaceExercise.primaryMuscles ?? []).map((item) => <span key={item} className="tiny-chip">{item}</span>)}
            {(selectedMarketplaceExercise.tags ?? []).slice(0, 4).map((item) => <span key={item} className="tiny-chip">{item}</span>)}
          </div>
          <div className="import-table">
            {(selectedMarketplaceExercise.cues ?? []).slice(0, 3).map((cue) => <div key={cue}><span>Cue</span><strong>{cue}</strong><em>{text.applyCue}</em></div>)}
            {(selectedMarketplaceExercise.commonMistakes ?? []).slice(0, 2).map((mistake) => <div key={mistake}><span>{text.mistake}</span><strong>{mistake}</strong><em>{text.techniqueReminder}</em></div>)}
          </div>
          <div className="split-actions">
            <button className="secondary-button" onClick={() => props.cloneExerciseFromMarketplace(selectedMarketplaceExercise)}>{text.clone}</button>
            <button className="primary-button training-bg" onClick={() => props.addExerciseFromLibrary(selectedMarketplaceExercise)}>{text.addToDay}</button>
          </div>
        </div>
      )}

      <button className="secondary-button disclosure-toggle" onClick={() => setShowCustomLibraryTools(!showCustomLibraryTools)} aria-expanded={showCustomLibraryTools}>
        {showCustomLibraryTools ? text.hideCustom : text.showCustom}
      </button>
      {showCustomLibraryTools && (
        <div className="custom-library-panel">
          <div className="exercise-library plan-list">
            {props.customExerciseLibrary.slice(0, 6).map((exercise) => (
              <div key={exercise.id} className="exercise-result-card">
                <div className="exercise-result-icon" aria-hidden="true">
                  <Dumbbell size={18} />
                </div>
                <button className="exercise-select exercise-result-copy" onClick={() => props.addExerciseFromLibrary(exercise)}>
                  <strong>{exercise.name}</strong>
                  <em>{muscleGroupLabel(exercise.muscleGroup)} - {equipmentLabels[exercise.equipment] ?? exercise.equipment}</em>
                  <span className="tiny-chip">{text.custom}</span>
                </button>
                <div className="row-actions">
                  <button className="secondary-button exercise-detail-button" onClick={() => props.updateExerciseDefinition(exercise.id, { name: `${exercise.name}*` })}>{text.edit}</button>
                  <ConfirmActionButton className="danger-button" label={text.deleteCustom} confirmLabel={text.confirmDelete} ariaLabel={text.deleteCustom} onConfirm={() => props.deleteExerciseDefinition(exercise.id)}>
                    <Trash2 size={14} />
                  </ConfirmActionButton>
                </div>
              </div>
            ))}
            {!props.customExerciseLibrary.length && <div><span>{text.empty}</span><strong>{text.noCustom}</strong><em>{text.customHint}</em></div>}
          </div>
          <div className="exercise-edit-grid">
            <label><span>{text.customName}</span><input value={props.newLibraryExerciseName} onChange={(event) => props.setNewLibraryExerciseName(event.target.value)} /></label>
            <label><span>{text.muscle}</span><input value={props.newLibraryMuscleGroup} onChange={(event) => props.setNewLibraryMuscleGroup(event.target.value)} /></label>
            <label><span>{text.equipment}</span><select value={props.newLibraryEquipment} onChange={(event) => props.setNewLibraryEquipment(event.target.value as EquipmentType)}>{equipmentOptions.slice(1).map((item) => <option key={item} value={item}>{equipmentLabels[item] ?? item}</option>)}</select></label>
            <label><span>{text.pattern}</span><select value={props.newLibraryPattern} onChange={(event) => props.setNewLibraryPattern(event.target.value as MovementPattern)}>{movementPatternOptions.map((item) => <option key={item} value={item}>{movementPatternLabels[item] ?? item}</option>)}</select></label>
            <button className="secondary-button" onClick={props.addCustomExerciseDefinition}>{text.addCustom}</button>
          </div>
        </div>
      )}
    </section>
  );
}
