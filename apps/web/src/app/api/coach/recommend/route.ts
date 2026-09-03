import { coachRecommend } from "@/lib/api";
import { jsonFail, jsonOk, withApiErrorHandling } from "@/lib/server-response";

export async function POST(request: Request) {
  return withApiErrorHandling({ method: "POST", path: "/api/coach/recommend", request }, async () => {
    const result = await coachRecommend();
    if (!result.ok) return jsonFail({ method: "POST", path: "/api/coach/recommend", request }, result.error, 400);
    return jsonOk({ method: "POST", path: "/api/coach/recommend", request }, result.data);
  });
}
