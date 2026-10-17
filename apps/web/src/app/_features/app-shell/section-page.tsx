"use client";

import React from "react";
import EvolveFitApp from "./evolvefit-app";
import type { AppTab } from "./app-section-router";

export function EvolveFitSectionPage({ section }: { section: AppTab }) {
  return <EvolveFitApp initialTab={section} />;
}
