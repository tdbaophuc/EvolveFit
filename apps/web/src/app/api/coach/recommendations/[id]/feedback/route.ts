import { coachRecommendationFeedback, readJson } from "@/lib/api";
import { jsonFail, jsonOk, withApiErrorHandling } from "@/lib/server-response";
import type { RecommendationDecision } from "@evolvefit/shared";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withApiErrorHandling({ method: "POST", path: "/api/coach/recommendations/[id]/feedback", request }, async () => {
    const body = await readJson<{ decision?: RecommendationDecision["decision"]; feedback?: string }>(request);
    if (body?.decision !== "accepted" && body?.decision !== "rejected") {
      return jsonFail({ method: "POST", path: "/api/coach/recommendations/[id]/feedback", request }, "decision must be accepted or rejected", 400);
    }
    const result = coachRecommendationFeedback({ recommendationId: id, decision: body.decision, feedback: body.feedback });
    if (!result.ok) return jsonFail({ method: "POST", path: "/api/coach/recommendations/[id]/feedback", request }, result.error, 404);
    return jsonOk({ method: "POST", path: "/api/coach/recommendations/[id]/feedback", request }, result.data);
  });
}
