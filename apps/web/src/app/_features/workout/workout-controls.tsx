"use client";

import { Minus, Plus } from "lucide-react";
import React from "react";
import type { PlateCalculation } from "@evolvefit/shared";

export function Stepper(props: {
  label: string;
  value: number;
  step: number;
  suffix?: string;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const update = (direction: -1 | 1) => {
    const next = Math.round((props.value + props.step * direction) * 10) / 10;
    props.onChange(Math.min(props.max ?? 999, Math.max(props.min ?? 0, next)));
  };

  return (
    <div className="stepper">
      <span>{props.label}</span>
      <button onClick={() => update(-1)} aria-label={`Giảm ${props.label}`}>
        <Minus size={18} />
      </button>
      <strong>
        {props.value}
        {props.suffix}
      </strong>
      <button onClick={() => update(1)} aria-label={`Tăng ${props.label}`}>
        <Plus size={18} />
      </button>
    </div>
  );
}

export function PlateCalculatorReadout(props: { calculation: PlateCalculation }) {
  const { calculation } = props;
  const plateText = calculation.platesPerSide.length
    ? calculation.platesPerSide.map((plate) => `${plate.count}x${plate.weightKg}`).join(" + ")
    : "chỉ thanh đòn";

  return (
    <div className="plate-readout" aria-label="Bộ tính đĩa tạ">
      <span>Đĩa mỗi bên</span>
      <strong>{plateText}</strong>
      <em>
        Thanh đòn {calculation.barbellKg}kg
        {calculation.remainderKg > 0 ? ` | gần nhất ${calculation.matchedWeightKg}kg, thiếu ${calculation.remainderKg}kg` : ""}
      </em>
    </div>
  );
}
