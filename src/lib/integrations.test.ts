import { describe, expect, it, vi } from "vitest";
import {
  aiCoachRecommendation,
  createSupabaseRestRequest,
  createSupabaseServiceRoleRequest,
  getIntegrationStatus,
  verifySupabaseProduction
} from "./integrations";

describe("integration contracts", () => {
  it("reports missing and configured integrations", () => {
    expect(getIntegrationStatus({}).supabase).toBe("missing-env");
    expect(
      getIntegrationStatus({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
        VAPID_PRIVATE_KEY: "private",
        VAPID_SUBJECT: "mailto:test@example.com",
        GEMINI_API_KEY: "gemini",
        CRON_SECRET: "secret"
      })
    ).toEqual({
      supabase: "configured",
      supabaseServiceRole: "configured",
      ai: "gemini",
      webPush: "configured",
      cronSecret: "configured"
    });
  });

  it("builds Supabase service-role requests", () => {
    const request = createSupabaseServiceRoleRequest("profiles?select=id", { method: "GET" }, {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service"
    });

    expect(request.url).toBe("https://project.supabase.co/rest/v1/profiles?select=id");
    expect(request.headers.get("apikey")).toBe("service");
    expect(request.headers.get("Authorization")).toBe("Bearer service");
  });

  it("verifies Supabase production tables with masked status output", async () => {
    const fetchMock = vi.fn(async () => new Response("[]", { status: 200 }));
    const result = await verifySupabaseProduction(
      {
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service"
      },
      fetchMock as unknown as typeof fetch
    );

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("service-role");
    expect(result.checks.map((check) => check.table)).toContain("hydration_logs");
    expect(fetchMock).toHaveBeenCalled();
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

  it("uses OpenAI mode and parses provider JSON", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        output_text: JSON.stringify({
          title: "Hold bench",
          reason: "Recovery is average.",
          action: "hold",
          nextWeightKg: 50
        })
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const recommendation = await aiCoachRecommendation({
      exerciseName: "Bench",
      targetWeightKg: 50,
      targetRepsMax: 10,
      recentSets: [{ actualWeightKg: 50, actualReps: 8, rpe: 9 }],
      env: { OPENAI_API_KEY: "test" }
    });

    expect(recommendation.mode).toBe("openai");
    expect(recommendation.title).toBe("Hold bench");
    vi.unstubAllGlobals();
  });
});
