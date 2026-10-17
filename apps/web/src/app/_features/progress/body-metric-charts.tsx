"use client";

import type { BodyMetricChartDataset, BodyMetricRangeDays } from "@evolvefit/shared";
import React from "react";
import { EmptyState } from "../ui/feedback";

export function BodyMetricCharts(props: {
  dataset: BodyMetricChartDataset;
  range: BodyMetricRangeDays;
  setRange: (range: BodyMetricRangeDays) => void;
}) {
  const weightValues = props.dataset.points.flatMap((point) =>
    [point.weight, point.smoothedWeight, props.dataset.weightGoal].filter((value): value is number => value !== undefined)
  );
  const bodyFatValues = props.dataset.points.flatMap((point) =>
    [point.bodyFatPercent, point.smoothedBodyFatPercent, props.dataset.bodyFatGoal].filter((value): value is number => value !== undefined)
  );
  const weightMin = Math.min(...weightValues, 0);
  const weightMax = Math.max(...weightValues, 1);
  const bodyFatMin = Math.min(...bodyFatValues, 0);
  const bodyFatMax = Math.max(...bodyFatValues, 1);
  const heightFor = (value: number, min: number, max: number) => `${Math.max(8, ((value - min) / Math.max(1, max - min)) * 100)}%`;

  return (
    <div className="body-chart-panel">
      <div className="segmented-control" aria-label="Khoảng thời gian chỉ số cơ thể">
        {[7, 30, 90].map((range) => (
          <button key={range} className={props.range === range ? "active" : ""} onClick={() => props.setRange(range as BodyMetricRangeDays)}>
            {range}n
          </button>
        ))}
      </div>
      {props.dataset.hasWeightData ? (
        <div className="body-chart">
          <div className="section-heading">
            <h2>Xu hướng cân nặng</h2>
            <span className="sync-pill">{props.dataset.weightGoal ? `Mục tiêu ${props.dataset.weightGoal}${props.dataset.unit}` : "Chưa có mục tiêu"}</span>
          </div>
          <div className="body-chart-bars" aria-label={`Biểu đồ cân nặng ${props.range} ngày`}>
            {props.dataset.points.map((point, index) => (
              <span key={`${point.date}-${index}`} title={`${point.date}: ${point.weight}${props.dataset.unit}`} style={{ height: heightFor(point.smoothedWeight, weightMin, weightMax) }} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="Chưa có biểu đồ cân nặng" text="Thêm chỉ số cơ thể để xem cân nặng trong 7, 30 hoặc 90 ngày." />
      )}
      {props.dataset.hasBodyFatData ? (
        <div className="body-chart">
          <div className="section-heading">
            <h2>Xu hướng mỡ cơ thể</h2>
            <span className="sync-pill">{props.dataset.bodyFatGoal ? `Mục tiêu ${props.dataset.bodyFatGoal}%` : "Chưa có mục tiêu"}</span>
          </div>
          <div className="body-chart-bars body-fat-chart" aria-label={`Biểu đồ mỡ cơ thể ${props.range} ngày`}>
            {props.dataset.points
              .filter((point) => point.smoothedBodyFatPercent !== undefined)
              .map((point, index) => (
                <span key={`${point.date}-${index}`} title={`${point.date}: ${point.bodyFatPercent}%`} style={{ height: heightFor(point.smoothedBodyFatPercent ?? 0, bodyFatMin, bodyFatMax) }} />
              ))}
          </div>
        </div>
      ) : (
        <EmptyState title="Chưa có biểu đồ mỡ cơ thể" text="Thêm phần trăm mỡ cơ thể vào ít nhất một chỉ số để hiển thị biểu đồ này." />
      )}
    </div>
  );
}
