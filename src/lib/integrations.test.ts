import { describe, expect, it } from "vitest";
import { aiCoachRecommendation, createSupabaseRestRequest, getIntegrationStatus } from "./integrations";

describe("integration contracts", () => {
  it("reports missing and configured integrations", () => {
    expect(getIntegrationStatus({}).supabase).toBe("missing-env");
    expect(
      getIntegrationStatus({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        VAPID_PUBLIC_KEY: "public",
        VAPID_PRIVATE_KEY: "private",
        GEMINI_API_KEY: "gemini",
        CRON_SECRET: "secret"
      })
    ).toEqual({
      supabase: "configured",
      ai: "gemini",
      webPush: "configured",
      cronSecret: "configured"
    });
  });

  it("builds Supabase REST requests with auth headers", () => {
    const request = createSupabaseRestRequest("hydration_logs", { method: "POST" }, {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon"
    });

    expect(request.url).toBe("https://project.supabase.co/rest/v1/hydration_logs");
    expect(request.headers.get("apikey")).toBe("anon");
    expect(request.method).toBe("POST");
  });

  it("falls back to rule coach when AI env is missing", async () => {
    const recommendation = await aiCoachRecommendation({
      exerciseName: "Bench",
      targetWeightKg: 50,
      targetRepsMax: 10,
      recentSets: [{ actualWeightKg: 50, actualReps: 10, rpe: 8 }],
      env: {}
    });

    expect(recommendation.mode).toBe("rule-fallback");
    expect(recommendation.action).toBe("increase");
  });
});
