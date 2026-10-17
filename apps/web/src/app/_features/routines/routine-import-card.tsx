"use client";

import { Plus } from "lucide-react";
import type { RoutineImportPreview } from "@evolvefit/shared";
import React from "react";

export function RoutineImportCard(props: {
  routineImportPreview: RoutineImportPreview | null;
  previewRoutineImport: (file: File) => void;
  downloadRoutineSampleXlsx: () => void;
  confirmRoutineImport: (mode: "replace" | "append") => void;
  clearRoutineImport: () => void;
}) {
  return (
    <section className="card import-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Nhập lịch tập</p>
          <h2>Xem trước CSV</h2>
        </div>
        <Plus size={20} />
      </div>
      <p>Cột CSV/XLSX: buổi, ngày, bài tập, nhóm cơ, số set, rep tối thiểu, rep tối đa, tạ, giây nghỉ, ghi chú.</p>
      <div className="split-actions">
        <a className="secondary-button import-button" href="/samples/evolvefit-routine-template.csv" download>
          Tải CSV mẫu
        </a>
        <button className="secondary-button" onClick={props.downloadRoutineSampleXlsx}>
          Tải XLSX mẫu
        </button>
        <label className="secondary-button import-button">
          Chọn CSV/XLSX
          <input
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={(event) => event.target.files?.[0] && props.previewRoutineImport(event.target.files[0])}
          />
        </label>
      </div>
      {props.routineImportPreview && (
        <div className="import-preview">
          <div className="section-heading">
            <strong>{props.routineImportPreview.fileName}</strong>
            <span className="sync-pill">{props.routineImportPreview.rows.length} dòng</span>
          </div>
          {props.routineImportPreview.errors.length ? (
            <div className="import-errors">
              {props.routineImportPreview.errors.map((error) => (
                <span key={error}>{error}</span>
              ))}
            </div>
          ) : (
            <>
              <div className="import-table">
                {props.routineImportPreview.rows.slice(0, 6).map((row) => (
                  <div key={row.id}>
                    <span>Dòng {row.sourceLine}</span>
                    <strong>{row.name}</strong>
                    <em>
                      {row.session} / {row.day} - {row.muscleGroup} - {row.targetSets} x {row.targetRepsMin}-{row.targetRepsMax} -{" "}
                      {row.targetWeightKg}kg
                    </em>
                  </div>
                ))}
              </div>
              <div className="split-actions">
                <button className="secondary-button" onClick={() => props.confirmRoutineImport("append")}>
                  Thêm vào lịch
                </button>
                <button className="primary-button training-bg" onClick={() => props.confirmRoutineImport("replace")}>
                  Thay lịch hiện tại
                </button>
              </div>
            </>
          )}
          <button className="secondary-button" onClick={props.clearRoutineImport}>
            Xóa bản xem trước
          </button>
        </div>
      )}
    </section>
  );
}
