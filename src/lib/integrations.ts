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
): Promise<Recommendation & { mode: "gemini" }> {
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

  if (!response.ok) return { ...fallback, source: "ai-assisted", mode: "gemini" };
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
): Promise<Recommendation & { mode: "openai" }> {
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

  if (!response.ok) return { ...fallback, source: "ai-assisted", mode: "openai" };
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
      "Return only JSON with title, reason, action, nextWeightKg. Keep advice conservative, training-focused, and not medical.",
    input,
    ruleFallback: fallback
  });
}

function parseAiRecommendation<TMode extends "gemini" | "openai">(
  text: string | undefined,
  fallback: Recommendation,
  mode: TMode
): Recommendation & { mode: TMode } {
  if (!text) return { ...fallback, source: "ai-assisted", mode };
  try {
    const parsed = JSON.parse(text) as Partial<Recommendation>;
    return {
      title: parsed.title ?? fallback.title,
      reason: parsed.reason ?? fallback.reason,
      source: "ai-assisted",
      action: parsed.action ?? fallback.action,
      nextWeightKg: Number.isFinite(parsed.nextWeightKg) ? Number(parsed.nextWeightKg) : fallback.nextWeightKg,
      mode
    };
  } catch {
    return { ...fallback, source: "ai-assisted", mode };
  }
}
