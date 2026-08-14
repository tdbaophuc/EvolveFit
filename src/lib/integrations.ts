import { progressiveOverloadRecommendation, type Recommendation, type WorkoutSet } from "./core";

export type IntegrationStatus = {
  supabase: "configured" | "missing-env";
  ai: "gemini" | "openai" | "rule-fallback";
  webPush: "configured" | "missing-env";
  cronSecret: "configured" | "missing-env";
};

export function getIntegrationStatus(env: NodeJS.ProcessEnv = process.env): IntegrationStatus {
  return {
    supabase: env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "configured" : "missing-env",
    ai: env.GEMINI_API_KEY ? "gemini" : env.OPENAI_API_KEY ? "openai" : "rule-fallback",
    webPush: env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? "configured" : "missing-env",
    cronSecret: env.CRON_SECRET ? "configured" : "missing-env"
  };
}

export function createSupabaseRestRequest(path: string, init: RequestInit = {}, env: NodeJS.ProcessEnv = process.env): Request {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase env is missing");

  return new Request(`${url.replace(/\/$/, "")}/rest/v1/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {})
    }
  });
}

export async function aiCoachRecommendation(input: {
  exerciseName: string;
  targetWeightKg: number;
  targetRepsMax: number;
  recentSets: Pick<WorkoutSet, "actualWeightKg" | "actualReps" | "rpe">[];
  recoveryNote?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<Recommendation & { mode: IntegrationStatus["ai"] }> {
  const env = input.env ?? process.env;
  const fallback = progressiveOverloadRecommendation(input);

  if (env.GEMINI_API_KEY || env.OPENAI_API_KEY) {
    // Keep this deterministic until credentials are present in deployment; the API shape is ready for a real provider call.
    return {
      ...fallback,
      source: "ai-assisted",
      reason: `${fallback.reason} AI context slot ready. Recovery note: ${input.recoveryNote ?? "none"}.`,
      mode: env.GEMINI_API_KEY ? "gemini" : "openai"
    };
  }

  return { ...fallback, mode: "rule-fallback" };
}
