"use client";

import { calculatePlatesPerSide, warmUpSetSuggestions, type PlateSettings, type WorkoutExercise, type WorkoutSetType } from "@evolvefit/shared";
import React from "react";
import { PlateCalculatorReadout, Stepper } from "./workout-controls";
import { setTypeLabels } from "./workout-labels";

export function LiveSetControlsCard(props: {
  activeExercise: WorkoutExercise;
  plateSettings: PlateSettings;
  setType: WorkoutSetType;
  setSetType: (value: WorkoutSetType) => void;
  setWeight: number;
  setSetWeight: (value: number) => void;
  setReps: number;
  setSetReps: (value: number) => void;
  setRpe: number;
  setSetRpe: (value: number) => void;
}) {
  const plateCalculation = calculatePlatesPerSide(props.setWeight, props.plateSettings);
  const warmUpSuggestions = warmUpSetSuggestions({
    workingWeightKg: props.activeExercise.targetWeightKg,
    workingReps: props.activeExercise.targetRepsMin
  });

  return (
    <section className="control-card card">
      <div className="template-row set-type-row" aria-label="Loại set">
        {(["warmup", "working", "drop", "failure"] as WorkoutSetType[]).map((type) => (
          <button key={type} className={props.setType === type ? "active" : ""} onClick={() => props.setSetType(type)}>
            {setTypeLabels[type]}
          </button>
        ))}
      </div>
      {warmUpSuggestions.length > 0 && (
        <div className="chip-row warmup-row" aria-label="Gợi ý khởi động">
          {warmUpSuggestions.map((suggestion) => (
            <button
              key={`${suggestion.percent}-${suggestion.weightKg}`}
              className="tiny-chip"
              onClick={() => {
                props.setSetType("warmup");
                props.setSetWeight(suggestion.weightKg);
                props.setSetReps(suggestion.reps);
              }}
            >
              {suggestion.percent}%: {suggestion.weightKg}kg x {suggestion.reps}
            </button>
          ))}
        </div>
      )}
      <div className="plate-stepper-block">
        <Stepper label="Tạ" value={props.setWeight} suffix="kg" step={2.5} onChange={props.setSetWeight} />
        <PlateCalculatorReadout calculation={plateCalculation} />
      </div>
      <Stepper label="Reps" value={props.setReps} step={1} onChange={props.setSetReps} />
      <Stepper label="RPE" value={props.setRpe} step={1} min={1} max={10} onChange={props.setSetRpe} />
      <div className="quick-adjust-grid" aria-label="Chỉnh nhanh set hiện tại">
        <button onClick={() => props.setSetWeight(Math.max(0, props.setWeight - 1))}>-1kg</button>
        <button onClick={() => props.setSetWeight(props.setWeight + 2.5)}>+2.5kg</button>
        <button onClick={() => props.setSetReps(Math.max(0, props.setReps - 1))}>-1 rep</button>
        <button onClick={() => props.setSetReps(props.setReps + 1)}>+1 rep</button>
      </div>
    </section>
  );
}
