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
  runScheduledCronJob,
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
  bearerTokenFromAuthorization,
  getAuthSession,
  oauthCodeVerifierCookieName,
  oauthStateCookieName,
  parseSessionCookieValue,
  sessionFromSupabaseTokens,
  signIn,
  signOut,
  signUp,
  verifySupabaseJwt,
  type AuthMode
} from "../lib/auth";
import { runWithApiRuntime } from "../lib/api-runtime";
import { getIntegrationStatus, verifySupabaseProduction } from "../lib/integrations";
import { listClientErrors, listRequestLogs, recordClientError, requestIdResponseHeader } from "../lib/observability";
import { jsonFail, jsonOk, withApiErrorHandling } from "../lib/server-response";
import { observabilitySnapshot } from "../lib/observability";
import type { ApiResult } from "../types";
import { demoUser, type ApiUser } from "../lib/repositories";

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

  app.get("/api/ready", (request, reply) =>
    withApiErrorHandling({ method: "GET", path: "/api/ready", request, reply }, async () => {
      const readiness = await readinessStatus(env);
      if (!readiness.ready) return jsonFail({ method: "GET", path: "/api/ready", request, reply }, readiness.reason ?? "Backend dependencies are not ready", 503);
      return jsonOk({ method: "GET", path: "/api/ready", request, reply }, readiness);
    })
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

  app.get("/api/auth/session", async (request, reply) => {
    const cookie = request.cookies[authCookieName];
    const token = bearerTokenFromAuthorization(request.headers.authorization) ?? parseSessionCookieValue(cookie)?.accessToken;
    if (token && env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const user = await verifySupabaseJwt({ token, env });
        reply.header(requestIdResponseHeader(), request.requestId);
        return { ok: true, data: { mode: "email", email: user.email, accessToken: token }, requestId: request.requestId };
      } catch {
        reply.header(requestIdResponseHeader(), request.requestId).code(401);
        return { ok: false, error: "Unauthorized", requestId: request.requestId };
      }
    }
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

  app.get("/api/hydration/today", (request, reply) => withDataContext(request, reply, () => getHydrationToday()));
  app.post("/api/hydration/log", (request, reply) => withDataContext(request, reply, () => logHydration(Number(bodyAs<{ amountMl?: number }>(request)?.amountMl)), { errorStatus: 400, persist: true }));
  app.patch<{ Params: IdParams }>("/api/hydration/log/:id", (request, reply) =>
    withDataContext(request, reply, () => patchHydrationLog(request.params.id, Number(bodyAs<{ amountMl?: number }>(request)?.amountMl)), { persist: true })
  );
  app.delete<{ Params: IdParams }>("/api/hydration/log/:id", (request, reply) => withDataContext(request, reply, () => deleteHydrationLog(request.params.id), { persist: true }));

  app.get("/api/supplements", (request, reply) => withDataContext(request, reply, () => listSupplements()));
  app.post("/api/supplements", (request, reply) => withDataContext(request, reply, () => createSupplement(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.post("/api/supplements/log", (request, reply) => withDataContext(request, reply, () => logSupplement(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.patch<{ Params: IdParams }>("/api/supplements/:id/reminder", (request, reply) =>
    withDataContext(request, reply, () => updateSupplementReminder(request.params.id, Number(bodyAs<{ reminderHour?: number }>(request)?.reminderHour)), { persist: true })
  );
  app.put<{ Params: IdParams }>("/api/supplements/:id/reminder", (request, reply) =>
    withDataContext(request, reply, () => updateSupplement(request.params.id, bodyAs(request)), { persist: true })
  );

  app.get("/api/routines", (request, reply) => withDataContext(request, reply, () => listRoutines()));
  app.post("/api/routines", (request, reply) => withDataContext(request, reply, () => createRoutine(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.patch<{ Params: IdParams }>("/api/routines/:id", (request, reply) => withDataContext(request, reply, () => updateRoutine(request.params.id, bodyAs(request)), { errorStatus: 400, persist: true }));
  app.delete<{ Params: IdParams }>("/api/routines/:id", (request, reply) => withDataContext(request, reply, () => deleteRoutine(request.params.id), { errorStatus: 404, persist: true }));

  app.get("/api/exercises", (request, reply) => withDataContext(request, reply, () => listExercises()));
  app.post("/api/exercises", (request, reply) => withDataContext(request, reply, () => createExercise(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.patch<{ Params: IdParams }>("/api/exercises/:id", (request, reply) => withDataContext(request, reply, () => updateExercise(request.params.id, bodyAs(request)), { errorStatus: 400, persist: true }));
  app.delete<{ Params: IdParams }>("/api/exercises/:id", (request, reply) => withDataContext(request, reply, () => deleteExercise(request.params.id), { errorStatus: 404, persist: true }));

  app.get("/api/workouts/today", (request, reply) => withDataContext(request, reply, () => getWorkoutToday()));
  app.post("/api/workouts/sessions", (request, reply) => withDataContext(request, reply, () => startWorkoutSession(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/finish", (request, reply) => withDataContext(request, reply, () => finishWorkoutSessionById(request.params.id), { errorStatus: 404, persist: true }));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/pause", (request, reply) => withDataContext(request, reply, () => pauseWorkoutSessionById(request.params.id), { errorStatus: 404, persist: true }));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/resume", (request, reply) => withDataContext(request, reply, () => resumeWorkoutSessionById(request.params.id), { errorStatus: 404, persist: true }));
  app.post<{ Params: IdParams }>("/api/workouts/sessions/:id/reorder", (request, reply) =>
    withDataContext(request, reply, () => reorderWorkoutSession(request.params.id, bodyAs<{ queue?: never[] }>(request)?.queue ?? []), { errorStatus: 400, persist: true })
  );
  app.post("/api/workouts/sets", (request, reply) => withDataContext(request, reply, () => createWorkoutSet(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.patch<{ Params: IdParams }>("/api/workouts/sets/:id", (request, reply) => withDataContext(request, reply, () => updateWorkoutSet(request.params.id, bodyAs(request)), { errorStatus: 404, persist: true }));
  app.delete<{ Params: IdParams }>("/api/workouts/sets/:id", (request, reply) => withDataContext(request, reply, () => deleteWorkoutSet(request.params.id), { errorStatus: 404, persist: true }));

  app.post("/api/progression/recalculate", (request, reply) =>
    withDataContext(request, reply, () => recalculateProgression(String(bodyAs<{ exerciseId?: string }>(request)?.exerciseId ?? "")), { errorStatus: 400 })
  );
  app.post("/api/sync/batch", (request, reply) => withDataContext(request, reply, () => syncBatch(bodyAs(request)), { errorStatus: 400, persist: true }));

  app.get("/api/achievements/me", (request, reply) => withDataContext(request, reply, () => getAchievementsAndLeaderboard()));
  app.post("/api/achievements/recalculate", (request, reply) => withDataContext(request, reply, () => recalculateAchievements(), { persist: true }));
  app.get("/api/leaderboards", (request, reply) => withDataContext(request, reply, () => getAchievementsAndLeaderboard()));
  app.patch("/api/leaderboards/visibility", (request, reply) =>
    withDataContext(request, reply, () => updateLeaderboardVisibility(Boolean(bodyAs<{ isPublic?: boolean }>(request)?.isPublic)), { persist: true })
  );

  app.post("/api/coach/recommend", (request, reply) =>
    withDataContext(request, reply, async () => coachRecommend(), { persist: true })
  );
  app.post<{ Params: IdParams }>("/api/coach/recommendations/:id/feedback", (request, reply) =>
    withDataContext(request, reply, () =>
      coachRecommendationFeedback({
        recommendationId: request.params.id,
        decision: bodyAs<{ decision?: never }>(request)?.decision ?? "accepted",
        feedback: bodyAs<{ feedback?: string }>(request)?.feedback
      }), { errorStatus: 404, persist: true }
    )
  );

  app.get("/api/notifications/config", (_request, reply) => sendResult(reply, notificationConfig(env)));
  app.get("/api/notifications/status", (request, reply) =>
    withDataContext(request, reply, () => notificationStatus(String((request.query as { localProfileId?: string }).localProfileId ?? ""), env))
  );
  app.post("/api/notifications/subscribe", (request, reply) => withDataContext(request, reply, () => subscribeNotifications(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.post("/api/notifications/unsubscribe", (request, reply) =>
    withDataContext(request, reply, () => unsubscribeNotifications(String(bodyAs<{ endpoint?: string }>(request)?.endpoint ?? "")), { errorStatus: 400, persist: true })
  );
  app.post("/api/notifications/test", (request, reply) => withDataContext(request, reply, () => sendTestNotification(bodyAs(request))));

  app.post("/api/cron/hydration-reminders", async (request, reply) => {
    if (!requireCronAuth(request, reply, env)) return reply;
    return withDataContext(request, reply, () => runScheduledCronJob("hydration-reminders", () => sendHydrationReminderEvents()), { persist: true, allowDemoFallback: true });
  });
  app.post("/api/cron/creatine-reminders", async (request, reply) => {
    if (!requireCronAuth(request, reply, env)) return reply;
    return withDataContext(request, reply, () => runScheduledCronJob("creatine-reminders", () => sendCreatineReminderEvents()), { persist: true, allowDemoFallback: true });
  });
  app.post("/api/cron/monthly-achievements", async (request, reply) => {
    if (!requireCronAuth(request, reply, env)) return reply;
    return withDataContext(request, reply, () => runScheduledCronJob("monthly-achievements", () => sendMonthlyAchievementEvents()), { allowDemoFallback: true });
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

async function withDataContext(
  request: FastifyRequest,
  reply: FastifyReply,
  handler: () => ApiResult<unknown> | Promise<ApiResult<unknown>>,
  options: { errorStatus?: number; persist?: boolean; allowDemoFallback?: boolean } = {}
) {
  try {
    const user = await resolveApiUser(request, options.allowDemoFallback);
    const state = await request.apiRepository.loadUserState(user);
    const result = await runWithApiRuntime({ user, repository: request.apiRepository, state }, handler);
    if (options.persist && result.ok) {
      await request.apiRepository.saveUserState(user, state);
    }
    return sendResult(reply, result, options.errorStatus ?? 200);
  } catch (error) {
    const status = error instanceof AuthRequiredError ? error.status : 500;
    reply.code(status);
    return { ok: false, error: error instanceof Error ? error.message : "Unexpected API error", requestId: request.requestId };
  }
}

class AuthRequiredError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function resolveApiUser(request: FastifyRequest, allowDemoFallback = false): Promise<ApiUser> {
  if (request.apiRepository.mode === "memory") {
    const session = parseSessionCookieValue(request.cookies[authCookieName]);
    return demoUser(session?.email ?? getAuthSession().email);
  }

  if (allowDemoFallback && isCronAuthorized(request, request.apiEnv) && request.apiEnv.CRON_USER_ID) {
    return {
      id: request.apiEnv.CRON_USER_ID,
      email: request.apiEnv.CRON_USER_EMAIL ?? "cron@evolvefit.app",
      accessToken: request.apiEnv.SUPABASE_SERVICE_ROLE_KEY,
      mode: "supabase"
    };
  }

  const session = parseSessionCookieValue(request.cookies[authCookieName]);
  const token = bearerTokenFromAuthorization(request.headers.authorization) ?? session?.accessToken;
  if (!token) {
    if (allowDemoFallback) return demoUser();
    throw new AuthRequiredError("Unauthorized", 401);
  }
  try {
    const user = await verifySupabaseJwt({ token, env: request.apiEnv });
    return { id: user.id, email: user.email, accessToken: token, mode: "supabase" };
  } catch {
    if (allowDemoFallback) return demoUser();
    throw new AuthRequiredError("Unauthorized", 401);
  }
}

function sendResult(reply: FastifyReply, result: ApiResult<unknown>, errorStatus = 200) {
  if (!result.ok) reply.code(errorStatus);
  return { ...result, requestId: reply.getHeader(requestIdResponseHeader()) };
}

function bodyAs<T>(request: FastifyRequest): T {
  return (request.body ?? {}) as T;
}

function requireCronAuth(request: FastifyRequest, reply: FastifyReply, env: NodeJS.ProcessEnv) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    reply.code(503).send({ ok: false, error: "CRON_SECRET is not configured", requestId: request.requestId });
    return false;
  }
  if (!isCronAuthorized(request, env)) {
    reply.code(401).send({ ok: false, error: "Unauthorized", requestId: request.requestId });
    return false;
  }
  return true;
}

function isCronAuthorized(request: FastifyRequest, env: NodeJS.ProcessEnv) {
  const secret = env.CRON_SECRET;
  return Boolean(secret && (request.headers.authorization === `Bearer ${secret}` || request.headers["x-cron-secret"] === secret));
}

async function readinessStatus(env: NodeJS.ProcessEnv) {
  if (env.API_DATA_MODE !== "supabase") {
    return {
      ready: true,
      mode: "memory",
      storageAdapter: "memory",
      checkedAt: new Date().toISOString(),
      integrations: getIntegrationStatus(env)
    };
  }

  const supabase = await verifySupabaseProduction(env);
  const ready = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY && supabase.ok);
  return {
    ready,
    mode: "supabase",
    storageAdapter: "supabase",
    checkedAt: new Date().toISOString(),
    reason: ready ? "ready" : "Supabase production dependencies are not ready",
    integrations: getIntegrationStatus(env),
    supabase
  };
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
