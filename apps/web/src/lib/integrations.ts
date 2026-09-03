import { coachGuardrailCopy, progressiveOverloadRecommendation, type Recommendation, type WorkoutSet } from "@evolvefit/shared";
import { isWebPushConfigured } from "./push";
import { normalizeSupabaseProjectUrl } from "./supabase-url";

export type IntegrationStatus = {
  supabase: "configured" | "missing-env";
  supabaseServiceRole: "configured" | "missing-env";
  ai: "gemini" | "openai" | "rule-fallback";
  webPush: "configured" | "missing-env";
  cronSecret: "configured" | "missing-env";
  healthPlatform: "native-bridge-required";
};

export function getIntegrationStatus(env: NodeJS.ProcessEnv = process.env): IntegrationStatus {
  return {
    supabase: env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "configured" : "missing-env",
    supabaseServiceRole: env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing-env",
    ai: env.GEMINI_API_KEY ? "gemini" : env.OPENAI_API_KEY ? "openai" : "rule-fallback",
    webPush: isWebPushConfigured(env) ? "configured" : "missing-env",
    cronSecret: env.CRON_SECRET ? "configured" : "missing-env",
    healthPlatform: "native-bridge-required"
  };
}

export function createSupabaseRestRequest(
  path: string,
  init: RequestInit = {},
  env: NodeJS.ProcessEnv = process.env,
  accessToken?: string
): Request {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase env is missing");

  return new Request(`${normalizeSupabaseProjectUrl(url)}/rest/v1/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken ?? anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {})
    }
  });
}

export function createSupabaseServiceRoleRequest(path: string, init: RequestInit = {}, env: NodeJS.ProcessEnv = process.env): Request {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase service-role env is missing");

  return new Request(`${normalizeSupabaseProjectUrl(url)}/rest/v1/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {})
    }
  });
}

export async function verifySupabaseProduction(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<{
  ok: boolean;
  mode: "service-role" | "missing-env";
  checks: { table: string; ok: boolean; status?: number }[];
}> {
  const tables = [
    "profiles",
    "drink_modules",
    "hydration_logs",
    "supplements",
    "supplement_logs",
    "routines",
    "workout_days",
    "routine_exercises",
    "exercise_library",
    "workout_sessions",
    "workout_sets",
    "body_metrics",
    "achievements",
    "leaderboard_profiles",
    "push_subscriptions",
    "sync_events"
  ];
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, mode: "missing-env", checks: tables.map((table) => ({ table, ok: false })) };
  }

  const checks = await Promise.all(
    tables.map(async (table) => {
      const response = await fetchImpl(createSupabaseServiceRoleRequest(`${table}?select=id&limit=1`, { method: "GET" }, env));
      return { table, ok: response.ok, status: response.status };
    })
  );

  return { ok: checks.every((check) => check.ok), mode: "service-role", checks };
}

export async function aiCoachRecommendation(input: {
  exerciseName: string;
  targetWeightKg: number;
  targetRepsMax: number;
  recentSets: Pick<WorkoutSet, "actualWeightKg" | "actualReps" | "rpe">[];
  recoveryNote?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<Recommendation> {
  const env = input.env ?? process.env;
  const fallback = progressiveOverloadRecommendation(input);
  if (!fallback.aiEligible) return fallback;

  if (env.GEMINI_API_KEY) {
    return callGemini(input, fallback, env.GEMINI_API_KEY);
  }

  if (env.OPENAI_API_KEY) {
    return callOpenAI(input, fallback, env.OPENAI_API_KEY);
  }

  return { ...fallback, mode: "rule-fallback" };
}

async function callGemini(
  input: {
    exerciseName: string;
    targetWeightKg: number;
    targetRepsMax: number;
    recentSets: Pick<WorkoutSet, "actualWeightKg" | "actualReps" | "rpe">[];
    recoveryNote?: string;
  },
  fallback: Recommendation,
  apiKey: string
): Promise<Recommendation> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: coachPrompt(input, fallback) }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );

  if (!response.ok) return fallback;
  const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return parseAiRecommendation(payload.candidates?.[0]?.content?.parts?.[0]?.text, fallback, "gemini");
}

async function callOpenAI(
  input: {
    exerciseName: string;
    targetWeightKg: number;
    targetRepsMax: number;
    recentSets: Pick<WorkoutSet, "actualWeightKg" | "actualReps" | "rpe">[];
    recoveryNote?: string;
  },
  fallback: Recommendation,
  apiKey: string
): Promise<Recommendation> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: coachPrompt(input, fallback),
      text: { format: { type: "json_object" } }
    })
  });

  if (!response.ok) return fallback;
  const payload = (await response.json()) as { output_text?: string };
  return parseAiRecommendation(payload.output_text, fallback, "openai");
}

function coachPrompt(
  input: {
    exerciseName: string;
    targetWeightKg: number;
    targetRepsMax: number;
    recentSets: Pick<WorkoutSet, "actualWeightKg" | "actualReps" | "rpe">[];
    recoveryNote?: string;
  },
  fallback: Recommendation
) {
  return JSON.stringify({
    instruction:
      "Return only JSON with title, reason, action, nextWeightKg, dataBasis, suggestedAction. Keep advice conservative, training-focused, and not medical. Do not diagnose, treat injuries, recommend ignoring pain, or replace a qualified professional.",
    input,
    ruleFirstInsight: fallback,
    guardrail: coachGuardrailCopy()
  });
}

function parseAiRecommendation(
  text: string | undefined,
  fallback: Recommendation,
  mode: "gemini" | "openai"
): Recommendation {
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as Partial<Recommendation>;
    const title = parsed.title ?? fallback.title;
    const reason = parsed.reason ?? fallback.reason;
    const suggestedAction = parsed.suggestedAction ?? fallback.suggestedAction;
    if (containsUnsafeMedicalAdvice(`${title} ${reason} ${suggestedAction}`)) return fallback;
    return {
      title,
      reason,
      source: "ai-assisted",
      action: parsed.action ?? fallback.action,
      nextWeightKg: Number.isFinite(parsed.nextWeightKg) ? Number(parsed.nextWeightKg) : fallback.nextWeightKg,
      dataBasis: Array.isArray(parsed.dataBasis) && parsed.dataBasis.length ? parsed.dataBasis.map(String).slice(0, 5) : fallback.dataBasis,
      suggestedAction,
      guardrail: coachGuardrailCopy(),
      aiEligible: true,
      mode
    };
  } catch {
    return fallback;
  }
}

function containsUnsafeMedicalAdvice(text: string): boolean {
  return /\b(diagnose|treat injury|ignore pain|push through pain|stop medication|medical emergency|chest pain.*continue)\b/i.test(text);
}
