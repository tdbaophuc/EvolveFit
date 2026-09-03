import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  coachRecommendationFeedback,
  coachRecommend,
  createExercise,
  createRoutine,
  createSupplement,
  createWorkoutSet,
  deleteExercise,
  deleteHydrationLog,
  deleteRoutine,
  deleteWorkoutSet,
  finishWorkoutSessionById,
  getAchievementsAndLeaderboard,
  getHydrationToday,
  getWorkoutToday,
  listExercises,
  listRoutines,
  listSupplements,
  logHydration,
  logSupplement,
  notificationConfig,
  notificationStatus,
  patchHydrationLog,
  pauseWorkoutSessionById,
  recalculateAchievements,
  recalculateProgression,
  reorderWorkoutSession,
  resumeWorkoutSessionById,
  sendCreatineReminderEvents,
  sendHydrationReminderEvents,
  sendMonthlyAchievementEvents,
  sendTestNotification,
  startWorkoutSession,
  subscribeNotifications,
  syncBatch,
  unsubscribeNotifications,
  updateExercise,
  updateLeaderboardVisibility,
  updateRoutine,
  updateSupplement,
  updateSupplementReminder,
  updateWorkoutSet
} from "../lib/api";
import { createAppUrl } from "../lib/app-url";
import {
  authCookieName,
  createCodeChallenge,
  createCodeVerifier,
  createOauthState,
  createSessionCookieValue,
  createSupabaseOAuthUrl,
  exchangeSupabaseOAuthCode,
  getAuthSession,
  oauthCodeVerifierCookieName,
  oauthStateCookieName,
  parseSessionCookieValue,
  sessionFromSupabaseTokens,
  signIn,
  signOut,
  signUp,
  type AuthMode
} from "../lib/auth";
import { getIntegrationStatus, verifySupabaseProduction } from "../lib/integrations";
import { listClientErrors, listRequestLogs, recordClientError, requestIdResponseHeader } from "../lib/observability";
import { jsonFail, jsonOk, withApiErrorHandling } from "../lib/server-response";
import { observabilitySnapshot } from "../lib/observability";
import type { ApiResult } from "../types";

type IdParams = { id: string };
const openApiSpecPath = existsSync(join(process.cwd(), "docs/api-v1.openapi.json"))
  ? join(process.cwd(), "docs/api-v1.openapi.json")
  : join(process.cwd(), "../../docs/api-v1.openapi.json");

export function registerApiRoutes(app: FastifyInstance, env: NodeJS.ProcessEnv = process.env) {
  app.get("/api/health", (request, reply) =>
    withApiErrorHandling({ method: "GET", path: "/api/health", request, reply }, () =>
      jsonOk({ method: "GET", path: "/api/health", request, reply }, {
        app: "evolvefit",
        version: env.npm_package_version ?? "0.1.0",
        runtime: "nodejs-fastify",
        checkedAt: new Date().toISOString(),
        integrations: getIntegrationStatus(env),
        storageAdapter: env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase-ready" : "memory-fallback"
      })
    )
  );

  app.get("/api/integrations/status", (request, reply) =>
    withApiErrorHandling({ method: "GET", path: "/api/integrations/status", request, reply }, () =>
      jsonOk({ method: "GET", path: "/api/integrations/status", request, reply }, getIntegrationStatus(env))
    )
  );

  app.get("/api/supabase/verify", (request, reply) =>
    withApiErrorHandling({ method: "GET", path: "/api/supabase/verify", request, reply }, async () =>
      jsonOk({ method: "GET", path: "/api/supabase/verify", request, reply }, await verifySupabaseProduction(env))
    )
  );

  app.get("/api/docs/openapi", (request, reply) => {
    const spec = JSON.parse(readFileSync(openApiSpecPath, "utf8"));
    reply.header(requestIdResponseHeader(), request.requestId).header("cache-control", "public, max-age=300");
    return spec;
  });

  app.get("/api/auth/session", (request, reply) => {
    const cookie = request.cookies[authCookieName];
    reply.header(requestIdResponseHeader(), request.requestId);
    return { ok: true, data: parseSessionCookieValue(cookie) ?? getAuthSession(), requestId: request.requestId };
  });

  app.post("/api/auth/sign-in", async (request, reply) => {
    const body = bodyAs<{ email?: string; password?: string; mode?: AuthMode }>(request);
    try {
      const session = await signIn({
        email: body?.email ?? "local@evolvefit.app",
        password: body?.password,
        mode: body?.mode,
        env
      });
      setSessionCookie(reply, session);
      reply.header(requestIdResponseHeader(), request.requestId);
      return { ok: true, data: session, requestId: request.requestId };
    } catch (error) {
      reply.header(requestIdResponseHeader(), request.requestId).code(401);
      return { ok: false, error: error instanceof Error ? error.message : "Sign-in failed", requestId: request.requestId };
    }
  });

  app.post("/api/auth/sign-up", async (request, reply) => {
    const body = bodyAs<{ email?: string; password?: string }>(request);
    if (!body?.email || !body.password) {
      reply.header(requestIdResponseHeader(), request.requestId).code(400);
      return { ok: false, error: "email and password are required", requestId: request.requestId };
    }
    try {
      const session = await signUp({ email: body.email, password: body.password, env });
      setSessionCookie(reply, session);
      reply.header(requestIdResponseHeader(), request.requestId);
      return { ok: true, data: session, requestId: request.requestId };
    } catch (error) {
      reply.header(requestIdResponseHeader(), request.requestId).code(400);
      return { ok: false, error: error instanceof Error ? error.message : "Sign-up failed", requestId: request.requestId };
    }
  });

  app.post("/api/auth/sign-out", (_request, reply) => {
    reply.clearCookie(authCookieName, { path: "/" });
    return { ok: true, data: signOut() };
  });

  app.get("/api/auth/oauth/google", async (request, reply) => {
    const redirectTo = createAppUrl("/api/auth/callback", fullUrl(request), env).toString();
    const verifier = createCodeVerifier();
    const challenge = await createCodeChallenge(verifier);
    const state = createOauthState();
    const oauthUrl = createSupabaseOAuthUrl("google", redirectTo, env, { codeChallenge: challenge, state });
    if (!oauthUrl) return reply.code(503).send({ ok: false, error: "Supabase OAuth env is missing" });
    const cookieOptions = sessionCookieOptions(60 * 10);
    reply.setCookie(oauthCodeVerifierCookieName, verifier, cookieOptions);
    reply.setCookie(oauthStateCookieName, state, cookieOptions);
    return reply.redirect(oauthUrl);
  });

  app.get("/api/auth/callback", async (request, reply) => {
    const url = new URL(fullUrl(request));
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token") ?? undefined;
    const email = url.searchParams.get("email") ?? undefined;
    const expiresAt = Number(url.searchParams.get("expires_at"));
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (code) {
      const verifier = request.cookies[oauthCodeVerifierCookieName];
      const expectedState = request.cookies[oauthStateCookieName];
      if (!verifier || !expectedState || expectedState !== state) {
        return reply.code(400).send({ ok: false, error: "OAuth state or verifier is invalid" });
      }
      try {
        const session = await exchangeSupabaseOAuthCode({
          code,
          codeVerifier: verifier,
          redirectTo: createAppUrl("/api/auth/callback", fullUrl(request), env).toString(),
          env
        });
        setSessionCookie(reply, session);
        reply.clearCookie(oauthCodeVerifierCookieName, { path: "/" });
        reply.clearCookie(oauthStateCookieName, { path: "/" });
        return reply.redirect(createAppUrl("/", fullUrl(request), env).toString());
      } catch (error) {
        return reply.code(400).send({ ok: false, error: error instanceof Error ? error.message : "OAuth callback failed" });
      }
    }

    if (!accessToken) return reply.code(400).send({ ok: false, error: "access_token or code is required" });
    const session = sessionFromSupabaseTokens({
      accessToken,
      refreshToken,
      email,
      expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
      mode: "google"
    });
    setSessionCookie(reply, session);
    return reply.redirect(createAppUrl("/", fullUrl(request), env).toString());
  });

  app.get("/api/hydration/today", (_request, reply) => sendResult(reply, getHydrationToday()));
  app.post("/api/hydration/log", (request, reply) => sendResult(reply, logHydration(Number(bodyAs<{ amountMl?: number }>(request)?.amountMl)), 400));
  app.patch<{ Params: IdParams }>("/api/hydration/log/:id", (request, reply) =>
    sendResult(reply, patchHydrationLog(request.params.id, Number(bodyAs<{ amountMl?: number }>(request)?.amountMl)))
  );
  app.delete<{ Params: IdParams }>("/api/hydration/log/:id", (request, reply) => sendResult(reply, deleteHydrationLog(request.params.id)));

  app.get("/api/supplements", (_request, reply) => sendResult(reply, listSupplements()));
  app.post("/api/supplements", (request, reply) => sendResult(reply, createSupplement(bodyAs(request)), 400));
  app.post("/api/supplements/log", (request, reply) => sendResult(reply, logSupplement(bodyAs(request)), 400));
  app.patch<{ Params: IdParams }>("/api/supplements/:id/reminder", (request, reply) =>
    sendResult(reply, updateSupplementReminder(request.params.id, Number(bodyAs<{ reminderHour?: number }>(request)?.reminderHour)))
  );
  app.put<{ Params: IdParams }>("/api/supplements/:id/reminder", (request, reply) =>
    sendResult(reply, updateSupplement(request.params.id, bodyAs(request)))
  );

  app.get("/api/routines", (_request, reply) => sendResult(reply, listRoutines()));
  app.post("/api/routines", (request, reply) => sendResult(reply, createRoutine(bodyAs(request)), 400));
  app.patch<{ Params: IdParams }>("/api/routines/:id", (request, reply) => sendResult(reply, updateRoutine(request.params.id, bodyAs(request)), 400));
  app.delete<{ Params: IdParams }>("/api/routines/:id", (request, reply) => sendResult(reply, deleteRoutine(request.params.id), 404));

  app.get("/api/exercises", (_request, reply) => sendResult(reply, listExercises()));
  app.post("/api/exercises", (request, reply) => sendResult(reply, createExercise(bodyAs(request)), 400));
  app.patch<{ Params: IdParams }>("/api/exercises/:id", (request, reply) => sendResult(reply, updateExercise(request.params.id, bodyAs(request)), 400));
  app.delete<{ Params: IdParams }>("/api/exercises/:id", (request, reply) => sendResult(reply, deleteExercise(request.params.id), 404));

  app.get("/api/workouts/today", (_request, reply) => sendResult(reply, getWorkoutToday()));
  app.post("/api/workouts/sessions", (request, reply) => sendResult(reply, startWorkoutSession(bodyAs(request)), 400));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/finish", (request, reply) => sendResult(reply, finishWorkoutSessionById(request.params.id), 404));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/pause", (request, reply) => sendResult(reply, pauseWorkoutSessionById(request.params.id), 404));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/resume", (request, reply) => sendResult(reply, resumeWorkoutSessionById(request.params.id), 404));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/reorder", (request, reply) =>
    sendResult(reply, reorderWorkoutSession(request.params.id, bodyAs<{ queue?: never[] }>(request)?.queue ?? []), 400)
  );
  app.post("/api/workouts/sets", (request, reply) => sendResult(reply, createWorkoutSet(bodyAs(request)), 400));
  app.patch<{ Params: IdParams }>("/api/workouts/sets/:id", (request, reply) => sendResult(reply, updateWorkoutSet(request.params.id, bodyAs(request)), 404));
  app.delete<{ Params: IdParams }>("/api/workouts/sets/:id", (request, reply) => sendResult(reply, deleteWorkoutSet(request.params.id), 404));

  app.post("/api/progression/recalculate", (request, reply) =>
    sendResult(reply, recalculateProgression(String(bodyAs<{ exerciseId?: string }>(request)?.exerciseId ?? "")), 400)
  );
  app.post("/api/sync/batch", (request, reply) => sendResult(reply, syncBatch(bodyAs(request)), 400));

  app.get("/api/achievements/me", (_request, reply) => sendResult(reply, getAchievementsAndLeaderboard()));
  app.post("/api/achievements/recalculate", (_request, reply) => sendResult(reply, recalculateAchievements()));
  app.get("/api/leaderboards", (_request, reply) => sendResult(reply, getAchievementsAndLeaderboard()));
  app.patch("/api/leaderboards/visibility", (request, reply) =>
    sendResult(reply, updateLeaderboardVisibility(Boolean(bodyAs<{ isPublic?: boolean }>(request)?.isPublic)))
  );

  app.post("/api/coach/recommend", (request, reply) =>
    withApiErrorHandling({ method: "POST", path: "/api/coach/recommend", request, reply }, async () =>
      jsonOk({ method: "POST", path: "/api/coach/recommend", request, reply }, await unwrap(coachRecommend()))
    )
  );
  app.post<{ Params: IdParams }>("/api/coach/recommendations/:id/feedback", (request, reply) =>
    withApiErrorHandling({ method: "POST", path: "/api/coach/recommendations/:id/feedback", request, reply }, async () => {
      const result = coachRecommendationFeedback({
        recommendationId: request.params.id,
        decision: bodyAs<{ decision?: never }>(request)?.decision ?? "accepted",
        feedback: bodyAs<{ feedback?: string }>(request)?.feedback
      });
      return result.ok
        ? jsonOk({ method: "POST", path: "/api/coach/recommendations/:id/feedback", request, reply }, result.data)
        : jsonFail({ method: "POST", path: "/api/coach/recommendations/:id/feedback", request, reply }, result.error, 404);
    })
  );

  app.get("/api/notifications/config", (_request, reply) => sendResult(reply, notificationConfig(env)));
  app.get("/api/notifications/status", (request, reply) =>
    sendResult(reply, notificationStatus(String((request.query as { localProfileId?: string }).localProfileId ?? ""), env))
  );
  app.post("/api/notifications/subscribe", (request, reply) => sendResult(reply, subscribeNotifications(bodyAs(request)), 400));
  app.post("/api/notifications/unsubscribe", (request, reply) =>
    sendResult(reply, unsubscribeNotifications(String(bodyAs<{ endpoint?: string }>(request)?.endpoint ?? "")), 400)
  );
  app.post("/api/notifications/test", async (request, reply) => sendResult(reply, await sendTestNotification(bodyAs(request))));

  app.post("/api/cron/hydration-reminders", async (request, reply) => {
    if (!requireCronAuth(request, reply, env)) return reply;
    return sendResult(reply, await sendHydrationReminderEvents());
  });
  app.post("/api/cron/creatine-reminders", async (request, reply) => {
    if (!requireCronAuth(request, reply, env)) return reply;
    return sendResult(reply, await sendCreatineReminderEvents());
  });
  app.post("/api/cron/monthly-achievements", async (request, reply) => {
    if (!requireCronAuth(request, reply, env)) return reply;
    return sendResult(reply, await sendMonthlyAchievementEvents());
  });

  app.get("/api/observability/logs", (request, reply) =>
    withApiErrorHandling({ method: "GET", path: "/api/observability/logs", request, reply }, () => {
      const requestId = (request.query as { requestId?: string }).requestId;
      return jsonOk(
        { method: "GET", path: "/api/observability/logs", request, reply },
        {
          ...observabilitySnapshot(env),
          requestId,
          logs: listRequestLogs(requestId),
          clientErrors: listClientErrors(requestId)
        }
      );
    })
  );
  app.post("/api/client-errors", (request, reply) =>
    withApiErrorHandling({ method: "POST", path: "/api/client-errors", request, reply }, () => {
      const body = bodyAs<{ requestId?: string; message?: string; digest?: string; stack?: string; path?: string; userAgent?: string }>(request);
      if (!body?.message?.trim()) return jsonFail({ method: "POST", path: "/api/client-errors", request, reply }, "message is required", 400);
      const report = recordClientError({
        requestId: body.requestId ?? request.requestId,
        message: body.message.trim(),
        digest: body.digest,
        stack: body.stack?.slice(0, 4000),
        path: body.path,
        userAgent: body.userAgent
      });
      return jsonOk({ method: "POST", path: "/api/client-errors", request, reply }, { requestId: report.requestId, reportedAt: report.reportedAt });
    })
  );
}

function sendResult(reply: FastifyReply, result: ApiResult<unknown>, errorStatus = 200) {
  if (!result.ok) reply.code(errorStatus);
  return result;
}

function bodyAs<T>(request: FastifyRequest): T {
  return (request.body ?? {}) as T;
}

async function unwrap<T>(result: Promise<ApiResult<T>> | ApiResult<T>): Promise<T> {
  const resolved = await result;
  if (!resolved.ok) throw new Error(resolved.error);
  return resolved.data;
}

function requireCronAuth(request: FastifyRequest, reply: FastifyReply, env: NodeJS.ProcessEnv) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    reply.code(503).send({ ok: false, error: "CRON_SECRET is not configured" });
    return false;
  }
  if (request.headers.authorization !== `Bearer ${secret}`) {
    reply.code(401).send({ ok: false, error: "Unauthorized" });
    return false;
  }
  return true;
}

function setSessionCookie(reply: FastifyReply, session: { accessToken?: string; expiresAt?: number }) {
  if (!session.accessToken) return;
  reply.setCookie(authCookieName, createSessionCookieValue(session as never), sessionCookieOptions(
    session.expiresAt ? Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)) : 60 * 60 * 24 * 30
  ));
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}

function fullUrl(request: FastifyRequest): string {
  const proto = request.headers["x-forwarded-proto"]?.toString() ?? "http";
  const host = request.headers.host ?? "localhost";
  return `${proto}://${host}${request.url}`;
}
