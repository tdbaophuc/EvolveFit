import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createAppDataExport } from "@evolvefit/shared";
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
  getMarketplaceExercise,
  getMarketplaceExerciseSubstitutions,
  getRoutineTemplate,
  getWorkoutToday,
  addMarketplaceExerciseToRoutine,
  applyRoutineTemplate,
  cloneMarketplaceExercise,
  cloneRoutineTemplatePreview,
  listExercises,
  listMarketplaceExerciseCatalog,
  listRoutineTemplateCatalog,
  listRoutines,
  listSupplements,
  logHydration,
  logSupplement,
  notificationConfig,
  notificationStatus,
  patchHydrationLog,
  pauseWorkoutSessionById,
  previewRoutineTemplate,
  previewWorkoutPlanner,
  recalculateAchievements,
  recalculateProgression,
  recordRoutineTemplateFeedback,
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
import { createAppUrl, RedirectNotAllowedError, resolveAuthRedirect } from "../lib/app-url";
import { isProductionLike } from "../lib/config";
import { validateSyncItemEnvelope, validateSyncPayload } from "../lib/sync-validation";
import {
  adminDashboardSummary,
  adminSupportUserLookup,
  createAdminMarketplaceExercise,
  createAdminRoutineTemplate,
  listAdminAuditLogs,
  listAdminMarketplaceExercises,
  listAdminRoles,
  listAdminRoutineTemplates,
  recordAdminAuditLog,
  requireAdminPermission,
  resolveAdminActor,
  updateAdminMarketplaceExercise,
  updateAdminRoutineTemplate,
  type AdminActor,
  type AdminPermission,
  type AdminRole
} from "../lib/admin";
import { AdminStoreError } from "../lib/admin-store";
import {
  AuthError,
  authCookieName,
  createCodeChallenge,
  createCodeVerifier,
  createOauthState,
  createSessionCookieValue,
  deleteSupabaseUser,
  createSupabaseOAuthUrl,
  exchangeSupabaseOAuthCode,
  bearerTokenFromAuthorization,
  getAuthSession,
  oauthCodeVerifierCookieName,
  oauthStateCookieName,
  parseSessionCookieValue,
  publicSession,
  refreshSession,
  requestPasswordReset,
  resetPassword,
  sessionMaxAgeSeconds,
  signIn,
  signOut,
  signUp,
  verifySupabaseJwt,
  type AuthMode,
  type AuthSession
} from "../lib/auth";
import { currentApiState, runWithApiRuntime, type ApiRuntime } from "../lib/api-runtime";
import { getIntegrationStatus, verifySupabaseProduction } from "../lib/integrations";
import { listClientErrors, listRequestLogs, normalizeErrorCode, recordClientError, requestIdResponseHeader, sanitizeRequestId } from "../lib/observability";
import { jsonFail, jsonOk, withApiErrorHandling } from "../lib/server-response";
import { observabilitySnapshot } from "../lib/observability";
import type { ApiResult } from "../types";
import { demoUser, type ApiUser } from "../lib/repositories";

type IdParams = { id: string };
type ValidationIssue = { field: string; message: string };
const openApiSpecPath = existsSync(join(process.cwd(), "docs/api-v1.openapi.json"))
  ? join(process.cwd(), "docs/api-v1.openapi.json")
  : join(process.cwd(), "../../docs/api-v1.openapi.json");

export function registerApiRoutes(app: FastifyInstance, env: NodeJS.ProcessEnv = process.env) {
  app.addHook("preHandler", async (request, reply) => {
    const issues = validateRouteRequest(request);
    if (!issues.length) return;
    return sendErrorEnvelope(reply, request, "Validation failed", 400, issues);
  });

  app.get("/api/health", (request, reply) =>
    withApiErrorHandling({ method: "GET", path: "/api/health", request, reply }, () =>
      jsonOk({ method: "GET", path: "/api/health", request, reply }, {
        app: "evolvefit",
        version: env.npm_package_version ?? "0.1.0",
        runtime: "nodejs-fastify",
        checkedAt: new Date().toISOString(),
        // Configuration details are only exposed outside production; ops can use the admin endpoints.
        ...(isProductionLike(env)
          ? {}
          : {
              integrations: getIntegrationStatus(env),
              storageAdapter: env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase-ready" : "memory-fallback"
            })
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
    withAdminContext(request, reply, "ops:read", async () => verifySupabaseProduction(env), { loadState: false })
  );

  app.get("/api/docs/openapi", (request, reply) => {
    if (isProductionLike(env) && env.API_PUBLIC_DOCS !== "true") return sendErrorEnvelope(reply, request, "Not found", 404);
    const spec = JSON.parse(readFileSync(openApiSpecPath, "utf8"));
    reply.header(requestIdResponseHeader(), request.requestId).header("cache-control", "public, max-age=300");
    return spec;
  });

  app.get("/api/admin/dashboard", (request, reply) =>
    withAdminContext(request, reply, "admin:dashboard", async ({ state, actor }) => ({
      actor: adminActorPayload(actor),
      summary: adminDashboardSummary(state, await request.adminStore.countAudit())
    }))
  );
  app.get("/api/admin/governance/health", (request, reply) =>
    withAdminContext(request, reply, "admin:dashboard", ({ actor }) => ({
      actor: adminActorPayload(actor),
      mode: request.apiRepository.mode,
      bootstrapConfigured: Boolean(env.ADMIN_BOOTSTRAP_EMAILS),
      checkedAt: new Date().toISOString()
    }))
  );
  app.get("/api/admin/roles", (request, reply) =>
    withAdminContext(request, reply, "audit:read", async () => {
      const items = await listAdminRoles(env, request.adminStore);
      return { items, total: items.length };
    }, { loadState: false })
  );
  app.post("/api/admin/roles", (request, reply) =>
    withAdminContext(request, reply, "roles:write", async ({ actor }) => {
      const body = bodyAs<{ email: string; role: AdminRole; revoke?: boolean }>(request);
      if (body.revoke && body.email.toLowerCase() === actor.user.email.toLowerCase()) throw new AdminRouteError("cannot revoke your own role", 400);
      const result = body.revoke
        ? await request.adminStore.revokeRole({ email: body.email, role: body.role })
        : await request.adminStore.grantRole({ email: body.email, role: body.role, grantedBy: actor.user });
      return result ?? { email: body.email, role: body.role, revoked: true };
    }, { mutation: { action: "admin.role.write", resourceType: "admin_role" }, loadState: false })
  );
  app.get("/api/admin/exercises", (request, reply) =>
    withAdminContext(request, reply, "content:read", ({ state }) => listAdminMarketplaceExercises(state, request.query as Record<string, never>))
  );
  app.post("/api/admin/exercises", (request, reply) =>
    withAdminContext(request, reply, "content:write", ({ state }) => createAdminMarketplaceExercise(state, bodyAs(request)), {
      mutation: { action: "admin.exercise.create", resourceType: "exercise" }
    })
  );
  app.patch<{ Params: IdParams }>("/api/admin/exercises/:id", (request, reply) =>
    withAdminContext(request, reply, "content:write", ({ state }) => {
      const exercise = updateAdminMarketplaceExercise(state, request.params.id, bodyAs(request));
      if (!exercise) throw new AdminRouteError("exercise not found", 404);
      return exercise;
    }, { mutation: { action: "admin.exercise.update", resourceType: "exercise", resourceId: request.params.id } })
  );
  app.get("/api/admin/routine-templates", (request, reply) =>
    withAdminContext(request, reply, "content:read", ({ state }) => listAdminRoutineTemplates(state, request.query as Record<string, never>))
  );
  app.post("/api/admin/routine-templates", (request, reply) =>
    withAdminContext(request, reply, "content:write", ({ state }) => createAdminRoutineTemplate(state, bodyAs(request)), {
      mutation: { action: "admin.routineTemplate.create", resourceType: "routine_template" }
    })
  );
  app.patch<{ Params: IdParams }>("/api/admin/routine-templates/:id", (request, reply) =>
    withAdminContext(request, reply, "content:write", ({ state }) => {
      const template = updateAdminRoutineTemplate(state, request.params.id, bodyAs(request));
      if (!template) throw new AdminRouteError("routine template not found", 404);
      return template;
    }, { mutation: { action: "admin.routineTemplate.update", resourceType: "routine_template", resourceId: request.params.id } })
  );
  app.get("/api/admin/feedback", (request, reply) =>
    withAdminContext(request, reply, "support:read", () => ({ items: [], total: 0, redacted: true }))
  );
  app.get("/api/admin/users", (request, reply) =>
    withAdminContext(request, reply, "support:read", ({ actor }) => ({ items: adminSupportUserLookup([actor.user], String((request.query as Record<string, unknown>).query ?? "")), redacted: true }))
  );
  app.get("/api/admin/audit-logs", (request, reply) =>
    withAdminContext(request, reply, "audit:read", () => listAdminAuditLogs(request.adminStore, request.query as Record<string, never>), { loadState: false })
  );

  app.get("/api/auth/session", async (request, reply) => {
    const cookieSession = readSessionCookie(request);
    const token = bearerTokenFromAuthorization(request.headers.authorization) ?? cookieSession?.accessToken;
    if (token && env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const user = await verifySupabaseJwt({ token, env });
        reply.header(requestIdResponseHeader(), request.requestId);
        return {
          ok: true,
          data: publicSession({ ...(cookieSession ?? { mode: "email" }), email: user.email, accessToken: token }, exposeTokens(env)),
          requestId: request.requestId
        };
      } catch {
        return sendErrorEnvelope(reply, request, "Unauthorized", 401);
      }
    }
    reply.header(requestIdResponseHeader(), request.requestId);
    return { ok: true, data: publicSession(cookieSession ?? getAuthSession(), exposeTokens(env)), requestId: request.requestId };
  });

  app.post("/api/auth/sign-in", async (request, reply) => {
    const body = bodyAs<{ email?: string; password?: string; mode?: AuthMode }>(request);
    try {
      const session = await signIn({
        email: body?.email ?? "local@evolvefit.app",
        password: body?.password,
        mode: body?.mode,
        oauthStartUrl: createAppUrl("/api/auth/oauth/google", fullUrl(request), env).toString(),
        env
      });
      setSessionCookie(reply, request, session);
      reply.header(requestIdResponseHeader(), request.requestId);
      return { ok: true, data: publicSession(session, exposeTokens(env)), requestId: request.requestId };
    } catch (error) {
      return sendAuthError(reply, request, error, "Sign-in failed", 401);
    }
  });

  app.post("/api/auth/sign-up", async (request, reply) => {
    const body = bodyAs<{ email?: string; password?: string; redirectTo?: string }>(request);
    if (!body?.email || !body.password) {
      return sendErrorEnvelope(reply, request, "email and password are required", 400);
    }
    try {
      const redirectTo = resolveAuthRedirect(body.redirectTo, fullUrl(request), env);
      const session = await signUp({ email: body.email, password: body.password, redirectTo, env });
      setSessionCookie(reply, request, session);
      reply.header(requestIdResponseHeader(), request.requestId);
      return { ok: true, data: publicSession(session, exposeTokens(env)), requestId: request.requestId };
    } catch (error) {
      return sendAuthError(reply, request, error, "Sign-up failed", 400);
    }
  });

  app.post("/api/auth/sign-out", (request, reply) => {
    reply.clearCookie(authCookieName, sessionCookieOptions(env, 0));
    reply.header(requestIdResponseHeader(), request.requestId);
    return { ok: true, data: signOut() };
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const cookieSession = readSessionCookie(request);
    const body = bodyAs<{ refreshToken?: string }>(request);
    const refreshToken = body?.refreshToken ?? cookieSession?.refreshToken;
    if (!refreshToken) {
      return sendErrorEnvelope(reply, request, "refresh token is required", 401);
    }
    try {
      const session = await refreshSession({ refreshToken, previous: cookieSession, env });
      setSessionCookie(reply, request, session);
      reply.header(requestIdResponseHeader(), request.requestId);
      return { ok: true, data: publicSession(session, exposeTokens(env)), requestId: request.requestId };
    } catch (error) {
      return sendAuthError(reply, request, error, "Refresh failed", 401);
    }
  });

  app.post("/api/auth/password/forgot", async (request, reply) => {
    const body = bodyAs<{ email?: string; redirectTo?: string }>(request);
    if (!body?.email) {
      return sendErrorEnvelope(reply, request, "email is required", 400);
    }
    try {
      const redirectTo = resolveAuthRedirect(body.redirectTo, fullUrl(request), env);
      const result = await requestPasswordReset({ email: body.email, redirectTo, env });
      reply.header(requestIdResponseHeader(), request.requestId);
      return { ok: true, data: result, requestId: request.requestId };
    } catch (error) {
      return sendAuthError(reply, request, error, "Password reset request failed", 400);
    }
  });

  app.post("/api/auth/password/reset", async (request, reply) => {
    const body = bodyAs<{ accessToken?: string; password?: string }>(request);
    if (!body?.accessToken || !body.password) {
      return sendErrorEnvelope(reply, request, "access token and password are required", 400);
    }
    try {
      const result = await resetPassword({ accessToken: body.accessToken, password: body.password, env });
      reply.header(requestIdResponseHeader(), request.requestId);
      return { ok: true, data: result, requestId: request.requestId };
    } catch (error) {
      return sendAuthError(reply, request, error, "Password reset failed", 400);
    }
  });

  app.get("/api/auth/oauth/google", async (request, reply) => {
    const redirectTo = createAppUrl("/api/auth/callback", fullUrl(request), env).toString();
    const verifier = createCodeVerifier();
    const challenge = await createCodeChallenge(verifier);
    const state = createOauthState();
    const oauthUrl = createSupabaseOAuthUrl("google", redirectTo, env, { codeChallenge: challenge, state });
    if (!oauthUrl) return sendErrorEnvelope(reply, request, "Supabase OAuth env is missing", 503);
    // The provider redirects back cross-site, so these short-lived cookies must not be SameSite=Strict.
    const cookieOptions = { ...sessionCookieOptions(env, 60 * 10), sameSite: oauthSameSite(env) };
    reply.setCookie(oauthCodeVerifierCookieName, verifier, cookieOptions);
    reply.setCookie(oauthStateCookieName, state, cookieOptions);
    return reply.redirect(oauthUrl);
  });

  app.get("/api/auth/callback", async (request, reply) => {
    const url = new URL(fullUrl(request));
    const accessToken = url.searchParams.get("access_token");
    const refreshToken = url.searchParams.get("refresh_token") ?? undefined;
    const expiresAt = Number(url.searchParams.get("expires_at"));
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (code) {
      const verifier = request.cookies[oauthCodeVerifierCookieName];
      const expectedState = request.cookies[oauthStateCookieName];
      if (!verifier || !expectedState || !state || !safeEqual(expectedState, state)) {
        return sendErrorEnvelope(reply, request, "OAuth state or verifier is invalid", 400);
      }
      try {
        const session = await exchangeSupabaseOAuthCode({
          code,
          codeVerifier: verifier,
          redirectTo: createAppUrl("/api/auth/callback", fullUrl(request), env).toString(),
          env
        });
        const verified = await verifySupabaseJwt({ token: session.accessToken ?? "", env });
        setSessionCookie(reply, request, { ...session, email: verified.email });
        reply.clearCookie(oauthCodeVerifierCookieName, sessionCookieOptions(env, 0));
        reply.clearCookie(oauthStateCookieName, sessionCookieOptions(env, 0));
        return reply.redirect(createAppUrl("/", fullUrl(request), env).toString());
      } catch (error) {
        return sendAuthError(reply, request, error, "OAuth callback failed", 400);
      }
    }

    if (!accessToken) return sendErrorEnvelope(reply, request, "access_token or code is required", 400);
    // Implicit-flow tokens arrive via URL: only accept them after Supabase confirms who they belong to.
    try {
      const verified = await verifySupabaseJwt({ token: accessToken, env });
      setSessionCookie(reply, request, {
        mode: "google",
        email: verified.email,
        accessToken,
        refreshToken,
        expiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : undefined
      });
    } catch {
      return sendErrorEnvelope(reply, request, "OAuth callback failed", 400);
    }
    return reply.redirect(createAppUrl("/", fullUrl(request), env).toString());
  });

  app.get("/api/account/export", async (request, reply) =>
    withDataContext(request, reply, () => {
      return { ok: true, data: createAppDataExport(currentApiState()) };
    })
  );

  app.delete("/api/auth/account", async (request, reply) => {
    try {
      const user = await resolveApiUser(request);
      const dataDeletion = await request.apiRepository.deleteUserData(user);
      const authDeletion = user.mode === "supabase" ? await deleteSupabaseUser({ userId: user.id, env }) : { deleted: true, mode: "missing-env" as const };
      reply.clearCookie(authCookieName, sessionCookieOptions(env, 0));
      reply.header(requestIdResponseHeader(), request.requestId);
      return {
        ok: true,
        data: {
          email: user.email,
          dataDeleted: dataDeletion.deleted,
          authDeleted: authDeletion.deleted,
          authDeletionMode: authDeletion.mode,
          tables: dataDeletion.tables ?? []
        },
        requestId: request.requestId
      };
    } catch (error) {
      const status = error instanceof AuthRequiredError ? error.status : 500;
      return sendErrorEnvelope(reply, request, status >= 500 ? "Account deletion failed" : error instanceof Error ? error.message : "Account deletion failed", status);
    }
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
  app.get("/api/exercises/marketplace", (request, reply) => withDataContext(request, reply, () => listMarketplaceExerciseCatalog(request.query as Record<string, never>)));
  app.get<{ Params: IdParams }>("/api/exercises/marketplace/:id", (request, reply) => withDataContext(request, reply, () => getMarketplaceExercise(request.params.id), { errorStatus: 404 }));
  app.get<{ Params: IdParams }>("/api/exercises/marketplace/:id/substitutions", (request, reply) =>
    withDataContext(request, reply, () => getMarketplaceExerciseSubstitutions(request.params.id, request.query as Record<string, never>), { errorStatus: 404 })
  );
  app.post<{ Params: IdParams }>("/api/exercises/marketplace/:id/clone", (request, reply) =>
    withDataContext(request, reply, () => cloneMarketplaceExercise(request.params.id, bodyAs(request)), { errorStatus: 404, persist: true })
  );
  app.post<{ Params: IdParams }>("/api/exercises/marketplace/:id/add-to-routine", (request, reply) =>
    withDataContext(request, reply, () => addMarketplaceExerciseToRoutine(request.params.id, bodyAs(request)), { errorStatus: 404, persist: true })
  );
  app.post("/api/exercises", (request, reply) => withDataContext(request, reply, () => createExercise(bodyAs(request)), { errorStatus: 400, persist: true }));
  app.patch<{ Params: IdParams }>("/api/exercises/:id", (request, reply) => withDataContext(request, reply, () => updateExercise(request.params.id, bodyAs(request)), { errorStatus: 400, persist: true }));
  app.delete<{ Params: IdParams }>("/api/exercises/:id", (request, reply) => withDataContext(request, reply, () => deleteExercise(request.params.id), { errorStatus: 404, persist: true }));

  app.get("/api/routine-templates", (request, reply) => withDataContext(request, reply, () => listRoutineTemplateCatalog(request.query as Record<string, never>)));
  app.get<{ Params: IdParams }>("/api/routine-templates/:id", (request, reply) => withDataContext(request, reply, () => getRoutineTemplate(request.params.id), { errorStatus: 404 }));
  app.post<{ Params: IdParams }>("/api/routine-templates/:id/preview", (request, reply) =>
    withDataContext(request, reply, () => previewRoutineTemplate(request.params.id, bodyAs(request)), { errorStatus: 404 })
  );
  app.post<{ Params: IdParams }>("/api/routine-templates/:id/apply", (request, reply) =>
    withDataContext(request, reply, () => applyRoutineTemplate(request.params.id, bodyAs(request)), { errorStatus: 404, persist: true })
  );
  app.post<{ Params: IdParams }>("/api/routine-templates/:id/clone", (request, reply) =>
    withDataContext(request, reply, () => cloneRoutineTemplatePreview(request.params.id, bodyAs(request)), { errorStatus: 404 })
  );
  app.post<{ Params: IdParams }>("/api/routine-templates/:id/feedback", (request, reply) =>
    withDataContext(request, reply, () => recordRoutineTemplateFeedback(request.params.id, bodyAs(request)), { errorStatus: 404 })
  );

  app.get("/api/workouts/today", (request, reply) => withDataContext(request, reply, () => getWorkoutToday()));
  app.post("/api/workouts/planner/preview", (request, reply) => withDataContext(request, reply, () => previewWorkoutPlanner(bodyAs(request)), { errorStatus: 400 }));
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
  app.post("/api/notifications/subscribe", (request, reply) =>
    withDataContext(request, reply, () => {
      // userId always comes from the authenticated runtime, never from the request body.
      const input = { ...bodyAs<Parameters<typeof subscribeNotifications>[0]>(request) };
      delete input.userId;
      return subscribeNotifications(input);
    }, { errorStatus: 400, persist: true })
  );
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
    withAdminContext(request, reply, "ops:read", () => {
      const requestId = (request.query as { requestId?: string }).requestId;
      return {
        ...observabilitySnapshot(env),
        requestId,
        logs: listRequestLogs(requestId),
        clientErrors: listClientErrors(requestId)
      };
    }, { loadState: false })
  );
  app.post("/api/client-errors", (request, reply) =>
    withApiErrorHandling({ method: "POST", path: "/api/client-errors", request, reply }, () => {
      const body = bodyAs<{ requestId?: string; message?: string; digest?: string; stack?: string; path?: string; userAgent?: string }>(request);
      if (!body?.message?.trim()) return jsonFail({ method: "POST", path: "/api/client-errors", request, reply }, "message is required", 400);
      const report = recordClientError({
        requestId: sanitizeRequestId(body.requestId) ?? request.requestId,
        message: body.message.trim(),
        digest: body.digest,
        // Stack traces are only kept outside production; they may contain source paths and user data.
        stack: isProductionLike(env) ? undefined : body.stack?.slice(0, 4000),
        path: body.path,
        userAgent: request.headers["user-agent"]?.toString()
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
    const runtime: ApiRuntime = { user, repository: request.apiRepository, state, mutations: [], env: request.apiEnv };
    const result = await runWithApiRuntime(runtime, handler);
    if (options.persist && result.ok) {
      const mutations = runtime.mutations.splice(0);
      if (mutations.length) await request.apiRepository.applyResourceMutations(user, mutations, state);
    }
    return sendResult(reply, result, options.errorStatus ?? 200);
  } catch (error) {
    const status = error instanceof AuthRequiredError ? error.status : 500;
    return sendErrorEnvelope(reply, request, status >= 500 ? "Unexpected API error" : error instanceof Error ? error.message : "Unexpected API error", status);
  }
}

async function withAdminContext(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: AdminPermission,
  handler: (context: { actor: AdminActor; state: ReturnType<typeof currentApiState> }) => unknown | Promise<unknown>,
  options: { mutation?: { action: string; resourceType: string; resourceId?: string }; loadState?: boolean } = {}
) {
  try {
    const user = await resolveApiUser(request);
    const actor = await resolveAdminActor(user, request.apiEnv, request.adminStore);
    const authorized = requireAdminPermission(actor, permission);
    if (!authorized.ok) {
      recordAdminDenied(request, user, permission);
      return sendErrorEnvelope(reply, request, authorized.error, authorized.status);
    }

    const state = options.loadState === false ? undefined : await request.apiRepository.loadUserState(user);
    // Audit only the affected resource, never a snapshot of the admin's whole app state.
    const before = options.mutation && state ? auditResourceSnapshot(state, options.mutation.resourceType, options.mutation.resourceId) : undefined;
    const data = await handler({ actor: authorized.actor, state: state as ReturnType<typeof currentApiState> });
    if (options.mutation) {
      if (state) await request.apiRepository.saveUserState(user, state);
      await recordAdminAuditLog(request.adminStore, {
        actorUserId: user.id,
        actorEmail: user.email,
        action: options.mutation.action,
        resourceType: options.mutation.resourceType,
        resourceId: options.mutation.resourceId ?? resourceIdOf(data),
        before,
        after: data,
        requestId: request.requestId,
        ip: request.ip,
        userAgent: request.headers["user-agent"]?.toString()
      });
    }
    reply.header(requestIdResponseHeader(), request.requestId);
    return { ok: true, data, requestId: request.requestId };
  } catch (error) {
    const status = error instanceof AdminRouteError || error instanceof AdminStoreError ? error.status : error instanceof AuthRequiredError ? error.status : 500;
    if (status >= 500) console.error("[api] admin request failed", { requestId: request.requestId, error: error instanceof Error ? error.message : String(error) });
    return sendErrorEnvelope(reply, request, status >= 500 ? "Unexpected API error" : error instanceof Error ? error.message : "Unexpected API error", status);
  }
}

function auditResourceSnapshot(state: ReturnType<typeof currentApiState>, resourceType: string, resourceId?: string): unknown {
  if (!resourceId) return undefined;
  if (resourceType === "exercise") return state.exerciseLibrary.find((item) => item.id === resourceId || (item as { slug?: string }).slug === resourceId);
  if (resourceType === "routine_template") return state.routineTemplatesMarketplace.find((item) => item.id === resourceId || item.slug === resourceId);
  return undefined;
}

function resourceIdOf(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as { id?: unknown; email?: unknown; role?: unknown };
  if (typeof record.id === "string") return record.id;
  if (typeof record.email === "string" && typeof record.role === "string") return `${record.email}:${record.role}`;
  return undefined;
}

class AdminRouteError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function adminActorPayload(actor: AdminActor) {
  return {
    email: actor.user.email,
    roles: actor.roles,
    permissions: actor.permissions
  };
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
    // Local demo mode only (startup refuses memory mode in production). The cookie is sealed, so the email cannot be forged.
    const session = readSessionCookie(request);
    return demoUser(session?.email ?? "phuc@example.com");
  }

  if (allowDemoFallback && isCronAuthorized(request, request.apiEnv) && request.apiEnv.CRON_USER_ID) {
    return {
      id: request.apiEnv.CRON_USER_ID,
      email: request.apiEnv.CRON_USER_EMAIL ?? "cron@evolvefit.app",
      accessToken: request.apiEnv.SUPABASE_SERVICE_ROLE_KEY,
      mode: "supabase"
    };
  }

  const session = readSessionCookie(request);
  const token = bearerTokenFromAuthorization(request.headers.authorization) ?? session?.accessToken;
  if (!token) throw new AuthRequiredError("Unauthorized", 401);
  try {
    const user = await verifySupabaseJwt({ token, env: request.apiEnv });
    return { id: user.id, email: user.email, accessToken: token, mode: "supabase" };
  } catch {
    throw new AuthRequiredError("Unauthorized", 401);
  }
}

function readSessionCookie(request: FastifyRequest): AuthSession | undefined {
  return parseSessionCookieValue(request.cookies[authCookieName], request.apiEnv);
}

function exposeTokens(env: NodeJS.ProcessEnv): boolean {
  return env.AUTH_EXPOSE_TOKENS === "true";
}

function sendAuthError(reply: FastifyReply, request: FastifyRequest, error: unknown, fallback: string, status: number) {
  if (error instanceof RedirectNotAllowedError) return sendErrorEnvelope(reply, request, error.message, 400);
  if (error instanceof AuthError) return sendErrorEnvelope(reply, request, error.message, error.status);
  // Unknown errors may carry upstream/internal details: log server-side, return a generic message.
  console.error("[api] auth error", { requestId: request.requestId, error: error instanceof Error ? error.message : String(error) });
  return sendErrorEnvelope(reply, request, fallback, status);
}

function recordAdminDenied(request: FastifyRequest, user: ApiUser, permission: AdminPermission) {
  console.warn("[api] admin access denied", { requestId: request.requestId, userId: user.id, permission, path: request.url.split("?")[0] });
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sendResult(reply: FastifyReply, result: ApiResult<unknown>, errorStatus = 200) {
  if (!result.ok) reply.code(errorStatus);
  if (!result.ok) return { ...result, errorCode: result.errorCode ?? normalizeErrorCode(result.error), requestId: reply.getHeader(requestIdResponseHeader()) };
  return { ...result, requestId: reply.getHeader(requestIdResponseHeader()) };
}

function bodyAs<T>(request: FastifyRequest): T {
  return (request.body ?? {}) as T;
}

function requireCronAuth(request: FastifyRequest, reply: FastifyReply, env: NodeJS.ProcessEnv) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    sendErrorEnvelope(reply, request, "CRON_SECRET is not configured", 503);
    return false;
  }
  if (!isCronAuthorized(request, env)) {
    sendErrorEnvelope(reply, request, "Unauthorized", 401);
    return false;
  }
  return true;
}

function isCronAuthorized(request: FastifyRequest, env: NodeJS.ProcessEnv) {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const bearer = bearerTokenFromAuthorization(request.headers.authorization);
  const header = request.headers["x-cron-secret"];
  return Boolean((bearer && safeEqual(bearer, secret)) || (typeof header === "string" && safeEqual(header, secret)));
}

async function readinessStatus(env: NodeJS.ProcessEnv) {
  if (env.API_DATA_MODE !== "supabase") {
    // Memory mode is a local demo; it is never "ready" for production traffic.
    const ready = !isProductionLike(env);
    return {
      ready,
      mode: "memory",
      storageAdapter: "memory",
      checkedAt: new Date().toISOString(),
      reason: ready ? "ready" : "Memory mode is not allowed in production"
    };
  }

  const supabase = await verifySupabaseProduction(env).catch(() => ({ ok: false }));
  const ready = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY && supabase.ok);
  // Per-table details stay behind the admin-only /api/supabase/verify endpoint.
  return {
    ready,
    mode: "supabase",
    storageAdapter: "supabase",
    checkedAt: new Date().toISOString(),
    reason: ready ? "ready" : "Supabase production dependencies are not ready"
  };
}

function setSessionCookie(reply: FastifyReply, request: FastifyRequest, session: AuthSession) {
  const env = request.apiEnv;
  // Supabase sessions need a token; local demo sessions (memory mode only) are identified by email.
  if (!session.accessToken && request.apiRepository.mode !== "memory") return;
  if (session.mode === "google" && !session.accessToken) return;
  const maxAge = sessionMaxAgeSeconds(env);
  reply.setCookie(authCookieName, createSessionCookieValue(session, env, maxAge), sessionCookieOptions(env, maxAge));
}

function cookieSameSite(env: NodeJS.ProcessEnv): "none" | "strict" | "lax" {
  return env.COOKIE_SAMESITE === "none" ? "none" : env.COOKIE_SAMESITE === "strict" ? "strict" : "lax";
}

function oauthSameSite(env: NodeJS.ProcessEnv): "none" | "lax" {
  return cookieSameSite(env) === "none" ? "none" : "lax";
}

function sessionCookieOptions(env: NodeJS.ProcessEnv, maxAge: number) {
  const sameSite = cookieSameSite(env);
  return {
    httpOnly: true,
    sameSite,
    secure: isProductionLike(env) || env.COOKIE_SECURE === "true" || sameSite === "none",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge
  };
}

/** Request URL used only as a development fallback; production always uses APP_BASE_URL (see createAppUrl). */
function fullUrl(request: FastifyRequest): string {
  return `${request.protocol}://${request.host || "localhost"}${request.url}`;
}

function sendErrorEnvelope(reply: FastifyReply, request: FastifyRequest, error: string, status: number, details?: unknown) {
  const errorCode = normalizeErrorCode(error);
  return reply.header(requestIdResponseHeader(), request.requestId).code(status).send({ ok: false, error, errorCode, details, requestId: request.requestId });
}

function validateRouteRequest(request: FastifyRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const method = request.method.toUpperCase();
  const path = request.routeOptions.url ?? request.url.split("?")[0] ?? request.url;
  const params = (request.params ?? {}) as Record<string, unknown>;
  const query = (request.query ?? {}) as Record<string, unknown>;
  const body = (request.body ?? {}) as Record<string, unknown>;

  if (path.includes(":id")) requireText(params.id, "params.id", issues, { max: 200 });
  if (method !== "GET" && method !== "DELETE" && !isPlainObject(request.body ?? {})) {
    issues.push({ field: "body", message: "body must be an object" });
    return issues;
  }

  if (path === "/api/auth/session" || path === "/api/auth/oauth/google" || path === "/api/auth/callback" || path === "/api/auth/account") return issues;
  if (path === "/api/observability/logs") {
    optionalText(query.requestId, "query.requestId", issues, { max: 120 });
    return issues;
  }
  if (path.startsWith("/api/admin")) {
    optionalInteger(query.page === undefined ? undefined : Number(query.page), "query.page", issues, { min: 1, max: 10000 });
    optionalInteger(query.pageSize === undefined ? undefined : Number(query.pageSize), "query.pageSize", issues, { min: 1, max: 100 });
    optionalText(query.query, "query.query", issues, { max: 160 });
    optionalEnum(query.status, "query.status", ["all", "draft", "published", "archived", "pending-review"], issues);
    optionalText(query.action, "query.action", issues, { max: 120 });
    optionalText(query.resourceType, "query.resourceType", issues, { max: 120 });
    if (path === "/api/admin/roles" && method === "POST") {
      requireEmail(body.email, "body.email", issues);
      requireEnum(body.role, "body.role", ["super-admin", "content-admin", "support"], issues);
      optionalBoolean(body.revoke, "body.revoke", issues);
    }
    if (path === "/api/admin/exercises" && method === "POST") {
      requireText(body.name, "body.name", issues, { min: 1, max: 160 });
      validateExerciseBody(body, issues);
      optionalEnum(body.status, "body.status", ["draft", "published", "archived", "pending-review"], issues);
    }
    if (path === "/api/admin/exercises/:id" && method === "PATCH") {
      optionalText(body.name, "body.name", issues, { min: 1, max: 160 });
      validateExerciseBody(body, issues);
      optionalEnum(body.status, "body.status", ["draft", "published", "archived", "pending-review"], issues);
    }
    if (path === "/api/admin/routine-templates" && method === "POST") {
      requireText(body.name, "body.name", issues, { min: 1, max: 160 });
      optionalEnum(body.status, "body.status", ["draft", "published", "archived"], issues);
      optionalEnum(body.targetGoal, "body.targetGoal", ["strength", "muscle", "fat-loss", "health"], issues);
      optionalInteger(body.daysPerWeek, "body.daysPerWeek", issues, { min: 1, max: 7 });
      optionalInteger(body.minutesPerSession, "body.minutesPerSession", issues, { min: 15, max: 180 });
    }
    if (path === "/api/admin/routine-templates/:id" && method === "PATCH") {
      optionalText(body.name, "body.name", issues, { min: 1, max: 160 });
      optionalEnum(body.status, "body.status", ["draft", "published", "archived"], issues);
      optionalEnum(body.targetGoal, "body.targetGoal", ["strength", "muscle", "fat-loss", "health"], issues);
      optionalInteger(body.daysPerWeek, "body.daysPerWeek", issues, { min: 1, max: 7 });
      optionalInteger(body.minutesPerSession, "body.minutesPerSession", issues, { min: 15, max: 180 });
    }
    return issues;
  }
  if (path === "/api/notifications/status" || path === "/api/notifications/config") {
    optionalText(query.localProfileId, "query.localProfileId", issues, { max: 320 });
    return issues;
  }
  if (path === "/api/exercises/marketplace" && method === "GET") {
    optionalText(query.query, "query.query", issues, { max: 160 });
    optionalText(query.muscleGroup, "query.muscleGroup", issues, { max: 120 });
    optionalEnum(query.equipment, "query.equipment", ["all", "barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"], issues);
    optionalEnum(query.movementPattern, "query.movementPattern", ["all", "push", "pull", "squat", "hinge", "lunge", "carry", "isolation", "core"], issues);
    optionalEnum(query.difficulty, "query.difficulty", ["all", "beginner", "intermediate", "advanced"], issues);
    optionalText(query.tag, "query.tag", issues, { max: 80 });
    optionalEnum(query.sort, "query.sort", ["name", "muscle", "difficulty"], issues);
    optionalInteger(query.page === undefined ? undefined : Number(query.page), "query.page", issues, { min: 1, max: 10000 });
    optionalInteger(query.pageSize === undefined ? undefined : Number(query.pageSize), "query.pageSize", issues, { min: 1, max: 50 });
    return issues;
  }
  if (path === "/api/exercises/marketplace/:id/substitutions" && method === "GET") {
    optionalText(query.equipment, "query.equipment", issues, { max: 200 });
    optionalInteger(query.limit === undefined ? undefined : Number(query.limit), "query.limit", issues, { min: 1, max: 20 });
    return issues;
  }
  if (path === "/api/routine-templates" && method === "GET") {
    optionalText(query.query, "query.query", issues, { max: 160 });
    optionalEnum(query.goal, "query.goal", ["all", "strength", "muscle", "fat-loss", "health"], issues);
    optionalEnum(query.equipment, "query.equipment", ["all", "barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"], issues);
    optionalEnum(query.experienceLevel, "query.experienceLevel", ["all", "beginner", "intermediate", "advanced"], issues);
    optionalText(query.tag, "query.tag", issues, { max: 80 });
    optionalEnum(query.sort, "query.sort", ["name", "goal", "days", "compatibility"], issues);
    optionalInteger(query.daysPerWeek === undefined || query.daysPerWeek === "all" ? undefined : Number(query.daysPerWeek), "query.daysPerWeek", issues, { min: 1, max: 7 });
    optionalInteger(query.page === undefined ? undefined : Number(query.page), "query.page", issues, { min: 1, max: 10000 });
    optionalInteger(query.pageSize === undefined ? undefined : Number(query.pageSize), "query.pageSize", issues, { min: 1, max: 50 });
    return issues;
  }
  if (path === "/api/routine-templates/:id/preview" || path === "/api/routine-templates/:id/clone") {
    optionalText(body.routineName, "body.routineName", issues, { min: 1, max: 160 });
    return issues;
  }
  if (path === "/api/routine-templates/:id/apply") {
    optionalText(body.routineName, "body.routineName", issues, { min: 1, max: 160 });
    optionalText(body.idempotencyKey, "body.idempotencyKey", issues, { min: 1, max: 160 });
    return issues;
  }
  if (path === "/api/routine-templates/:id/feedback") {
    requireEnum(body.decision, "body.decision", ["accepted", "rejected"], issues);
    optionalBoolean(body.favorite, "body.favorite", issues);
    optionalText(body.feedback, "body.feedback", issues, { max: 1000 });
    return issues;
  }

  if (path === "/api/auth/sign-in") {
    optionalEmail(body.email, "body.email", issues);
    optionalText(body.password, "body.password", issues, { min: 1, max: 200 });
    optionalEnum(body.mode, "body.mode", ["local", "email", "google"], issues);
    return issues;
  }
  if (path === "/api/auth/sign-up") {
    requireEmail(body.email, "body.email", issues);
    requireText(body.password, "body.password", issues, { min: 8, max: 200 });
    optionalUrl(body.redirectTo, "body.redirectTo", issues);
    return issues;
  }
  if (path === "/api/auth/refresh") {
    optionalText(body.refreshToken, "body.refreshToken", issues, { min: 1, max: 4096 });
    return issues;
  }
  if (path === "/api/auth/password/forgot") {
    requireEmail(body.email, "body.email", issues);
    optionalUrl(body.redirectTo, "body.redirectTo", issues);
    return issues;
  }
  if (path === "/api/auth/password/reset") {
    requireText(body.accessToken, "body.accessToken", issues, { min: 1, max: 4096 });
    requireText(body.password, "body.password", issues, { min: 8, max: 200 });
    return issues;
  }
  if (path === "/api/hydration/log" && method === "POST") {
    requireNumber(body.amountMl, "body.amountMl", issues, { min: 1, max: 10000 });
    return issues;
  }
  if (path === "/api/hydration/log/:id") {
    if (method === "PATCH") requireNumber(body.amountMl, "body.amountMl", issues, { min: 1, max: 10000 });
    return issues;
  }
  if (path === "/api/supplements" && method === "POST") {
    requireText(body.name, "body.name", issues, { min: 1, max: 120 });
    requireNumber(body.defaultAmount, "body.defaultAmount", issues, { min: 0.001, max: 100000 });
    optionalEnum(body.unit, "body.unit", ["g", "mg", "capsule"], issues);
    return issues;
  }
  if (path === "/api/supplements/log") {
    requireText(body.name, "body.name", issues, { min: 1, max: 120 });
    requireNumber(body.amount, "body.amount", issues, { min: 0, max: 100000 });
    optionalText(body.supplementId, "body.supplementId", issues, { max: 200 });
    optionalEnum(body.unit, "body.unit", ["g", "mg", "capsule"], issues);
    optionalEnum(body.status, "body.status", ["taken", "skipped"], issues);
    optionalText(body.skippedReason, "body.skippedReason", issues, { max: 500 });
    return issues;
  }
  if (path === "/api/supplements/:id/reminder") {
    if (method === "PATCH") requireInteger(body.reminderHour, "body.reminderHour", issues, { min: 0, max: 23 });
    if (method === "PUT") {
      optionalText(body.name, "body.name", issues, { min: 1, max: 120 });
      optionalNumber(body.defaultAmount, "body.defaultAmount", issues, { min: 0.001, max: 100000 });
      optionalInteger(body.reminderHour, "body.reminderHour", issues, { min: 0, max: 23 });
      optionalNumberArray(body.scheduleHours, "body.scheduleHours", issues, { integer: true, min: 0, max: 23 });
      optionalBoolean(body.active, "body.active", issues);
    }
    return issues;
  }
  if (path === "/api/routines" && method === "POST") {
    requireText(body.name, "body.name", issues, { min: 1, max: 160 });
    optionalInteger(body.daysPerWeek, "body.daysPerWeek", issues, { min: 1, max: 14 });
    validateRoutineDays(body.days, issues);
    return issues;
  }
  if (path === "/api/routines/:id" && method === "PATCH") {
    optionalText(body.name, "body.name", issues, { min: 1, max: 160 });
    optionalInteger(body.daysPerWeek, "body.daysPerWeek", issues, { min: 1, max: 14 });
    validateRoutineDays(body.days, issues);
    optionalText(body.baseUpdatedAt, "body.baseUpdatedAt", issues, { max: 80 });
    optionalEnum(body.conflictResolution, "body.conflictResolution", ["confirm"], issues);
    return issues;
  }
  if (path === "/api/exercises" && method === "POST") {
    requireText(body.name, "body.name", issues, { min: 1, max: 160 });
    validateExerciseBody(body, issues);
    return issues;
  }
  if (path === "/api/exercises/:id" && method === "PATCH") {
    optionalText(body.name, "body.name", issues, { min: 1, max: 160 });
    validateExerciseBody(body, issues);
    return issues;
  }
  if (path === "/api/exercises/marketplace/:id/clone") {
    optionalText(body.name, "body.name", issues, { min: 1, max: 160 });
    validateExerciseBody(body, issues);
    return issues;
  }
  if (path === "/api/exercises/marketplace/:id/add-to-routine") {
    optionalText(body.routineId, "body.routineId", issues, { max: 200 });
    optionalText(body.workoutDayId, "body.workoutDayId", issues, { max: 200 });
    return issues;
  }
  if (path === "/api/workouts/sessions") {
    optionalText(body.routineId, "body.routineId", issues, { max: 200 });
    optionalText(body.workoutDayId, "body.workoutDayId", issues, { max: 200 });
    optionalText(body.sessionName, "body.sessionName", issues, { max: 160 });
    optionalStringArray(body.sessionExerciseOrder, "body.sessionExerciseOrder", issues);
    return issues;
  }
  if (path === "/api/workouts/planner/preview") {
    optionalEnum(body.goal, "body.goal", ["strength", "muscle", "fat-loss", "health"], issues);
    optionalInteger(body.daysPerWeek, "body.daysPerWeek", issues, { min: 1, max: 6 });
    optionalStringArray(body.equipment, "body.equipment", issues);
    optionalEnum(body.experienceLevel, "body.experienceLevel", ["beginner", "intermediate", "advanced"], issues);
    optionalInteger(body.minutesPerSession, "body.minutesPerSession", issues, { min: 20, max: 120 });
    optionalStringArray(body.musclePriority, "body.musclePriority", issues);
    return issues;
  }
  if (path === "/api/workouts/sessions/:id/reorder") {
    optionalArray(body.queue, "body.queue", issues);
    return issues;
  }
  if (path === "/api/workouts/sets") return validateWorkoutSetBody(body, issues, true);
  if (path === "/api/workouts/sets/:id" && method === "PATCH") return validateWorkoutSetBody(body, issues, false);
  if (path === "/api/progression/recalculate") {
    requireText(body.exerciseId, "body.exerciseId", issues, { min: 1, max: 200 });
    return issues;
  }
  if (path === "/api/sync/batch") {
    requireArray(body.items, "body.items", issues, { max: 250 });
    optionalText(body.idempotencyKey, "body.idempotencyKey", issues, { max: 200 });
    if (Array.isArray(body.items)) {
      for (const [index, item] of body.items.entries()) {
        const error = validateSyncItemEnvelope(item, index);
        if (error) {
          issues.push({ field: `body.items.${index}`, message: error });
          if (issues.length >= 20) break;
        }
      }
    }
    return issues;
  }
  if (path === "/api/leaderboards/visibility") {
    requireBoolean(body.isPublic, "body.isPublic", issues);
    return issues;
  }
  if (path === "/api/coach/recommendations/:id/feedback") {
    requireEnum(body.decision, "body.decision", ["accepted", "rejected"], issues);
    optionalText(body.feedback, "body.feedback", issues, { max: 1000 });
    return issues;
  }
  if (path === "/api/notifications/subscribe") {
    requireText(body.endpoint, "body.endpoint", issues, { min: 1, max: 2048 });
    if (!body.p256dh && !isPlainObject(body.keys)) issues.push({ field: "body.p256dh", message: "p256dh is required" });
    if (!body.auth && !isPlainObject(body.keys)) issues.push({ field: "body.auth", message: "auth is required" });
    optionalText(body.p256dh, "body.p256dh", issues, { max: 200 });
    optionalText(body.auth, "body.auth", issues, { max: 64 });
    if (isPlainObject(body.keys)) {
      optionalText(body.keys.p256dh, "body.keys.p256dh", issues, { max: 200 });
      optionalText(body.keys.auth, "body.keys.auth", issues, { max: 64 });
    }
    optionalText(body.localProfileId, "body.localProfileId", issues, { max: 320 });
    optionalText(body.platform, "body.platform", issues, { max: 40 });
    return issues;
  }
  if (path === "/api/notifications/unsubscribe") {
    requireText(body.endpoint, "body.endpoint", issues, { min: 1, max: 2048 });
    return issues;
  }
  if (path === "/api/notifications/test") {
    optionalText(body.endpoint, "body.endpoint", issues, { max: 2048 });
    optionalText(body.localProfileId, "body.localProfileId", issues, { max: 320 });
    return issues;
  }
  if (path === "/api/client-errors") {
    requireText(body.message, "body.message", issues, { min: 1, max: 2000 });
    optionalText(body.requestId, "body.requestId", issues, { max: 120 });
    optionalText(body.digest, "body.digest", issues, { max: 200 });
    optionalText(body.stack, "body.stack", issues, { max: 4000 });
    optionalText(body.path, "body.path", issues, { max: 500 });
    optionalText(body.userAgent, "body.userAgent", issues, { max: 500 });
  }
  return issues;
}

function validateRoutineDays(value: unknown, issues: ValidationIssue[]) {
  if (value === undefined || value === null) return;
  requireArray(value, "body.days", issues, { max: 14 });
  if (!Array.isArray(value)) return;
  // Reuse the sync schema so REST and offline sync accept exactly the same routine shape.
  const validated = validateSyncPayloadForRoutine(value);
  if (validated) issues.push({ field: "body.days", message: validated });
}

function validateExerciseBody(body: Record<string, unknown>, issues: ValidationIssue[]): ValidationIssue[] {
  optionalText(body.muscleGroup, "body.muscleGroup", issues, { max: 120 });
  optionalEnum(body.equipment, "body.equipment", ["barbell", "dumbbell", "cable", "machine", "bodyweight", "kettlebell", "other"], issues);
  optionalEnum(body.movementPattern, "body.movementPattern", ["push", "pull", "squat", "hinge", "lunge", "carry", "isolation", "core"], issues);
  optionalText(body.notes, "body.notes", issues, { max: 1000 });
  optionalStringArray(body.primaryMuscles, "body.primaryMuscles", issues);
  optionalStringArray(body.secondaryMuscles, "body.secondaryMuscles", issues);
  optionalStringArray(body.cues, "body.cues", issues);
  optionalStringArray(body.commonMistakes, "body.commonMistakes", issues);
  optionalStringArray(body.substitutions, "body.substitutions", issues);
  optionalStringArray(body.contraindications, "body.contraindications", issues);
  optionalStringArray(body.equipmentAlternatives, "body.equipmentAlternatives", issues);
  optionalStringArray(body.tags, "body.tags", issues);
  optionalText(body.mediaUrl, "body.mediaUrl", issues, { max: 2048 });
  if (typeof body.mediaUrl === "string" && body.mediaUrl && !/^https:\/\//i.test(body.mediaUrl)) issues.push({ field: "body.mediaUrl", message: "must be an https URL" });
  optionalEnum(body.difficulty, "body.difficulty", ["beginner", "intermediate", "advanced"], issues);
  optionalEnum(body.forceType, "body.forceType", ["push", "pull", "static", "mixed"], issues);
  optionalBoolean(body.unilateral, "body.unilateral", issues);
  optionalText(body.source, "body.source", issues, { max: 240 });
  optionalText(body.license, "body.license", issues, { max: 240 });
  return issues;
}

function validateWorkoutSetBody(body: Record<string, unknown>, issues: ValidationIssue[], required: boolean): ValidationIssue[] {
  const text = required ? requireText : optionalText;
  const number = required ? requireNumber : optionalNumber;
  text(body.exerciseId, "body.exerciseId", issues, { min: 1, max: 200 });
  text(body.exerciseName, "body.exerciseName", issues, { min: 1, max: 160 });
  optionalText(body.sessionId, "body.sessionId", issues, { max: 200 });
  optionalEnum(body.setType, "body.setType", ["warmup", "working", "drop", "failure", "skipped"], issues);
  number(body.targetWeightKg, "body.targetWeightKg", issues, { min: 0, max: 10000 });
  number(body.targetReps, "body.targetReps", issues, { min: 0, max: 1000 });
  number(body.actualWeightKg, "body.actualWeightKg", issues, { min: 0, max: 10000 });
  number(body.actualReps, "body.actualReps", issues, { min: 0, max: 1000 });
  optionalNumber(body.rpe, "body.rpe", issues, { min: 0, max: 10 });
  optionalText(body.completedAt, "body.completedAt", issues, { max: 80 });
  return issues;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requireText(value: unknown, field: string, issues: ValidationIssue[], options: { min?: number; max?: number } = {}) {
  if (typeof value !== "string") {
    issues.push({ field, message: "must be a string" });
    return;
  }
  if ((options.min ?? 0) > value.length) issues.push({ field, message: `must be at least ${options.min} characters` });
  if (options.max !== undefined && value.length > options.max) issues.push({ field, message: `must be at most ${options.max} characters` });
}

function optionalText(value: unknown, field: string, issues: ValidationIssue[], options: { min?: number; max?: number } = {}) {
  if (value === undefined || value === null || value === "") return;
  requireText(value, field, issues, options);
}

function requireEmail(value: unknown, field: string, issues: ValidationIssue[]) {
  requireText(value, field, issues, { min: 3, max: 320 });
  if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) issues.push({ field, message: "must be a valid email" });
}

function optionalEmail(value: unknown, field: string, issues: ValidationIssue[]) {
  if (value === undefined || value === null || value === "") return;
  requireEmail(value, field, issues);
}

function validateSyncPayloadForRoutine(days: unknown[]): string | undefined {
  const result = validateSyncPayload("routine.create", { name: "validation", days });
  return result.ok ? undefined : result.error.replace(/^payload\./, "body.");
}

function optionalUrl(value: unknown, field: string, issues: ValidationIssue[]) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string") {
    issues.push({ field, message: "must be a URL string" });
    return;
  }
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) issues.push({ field, message: "must be an http(s) URL" });
  } catch {
    issues.push({ field, message: "must be a URL string" });
  }
}

function requireNumber(value: unknown, field: string, issues: ValidationIssue[], options: { min?: number; max?: number } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ field, message: "must be a finite number" });
    return;
  }
  if (options.min !== undefined && value < options.min) issues.push({ field, message: `must be at least ${options.min}` });
  if (options.max !== undefined && value > options.max) issues.push({ field, message: `must be at most ${options.max}` });
}

function optionalNumber(value: unknown, field: string, issues: ValidationIssue[], options: { min?: number; max?: number } = {}) {
  if (value === undefined || value === null) return;
  requireNumber(value, field, issues, options);
}

function requireInteger(value: unknown, field: string, issues: ValidationIssue[], options: { min?: number; max?: number } = {}) {
  requireNumber(value, field, issues, options);
  if (typeof value === "number" && !Number.isInteger(value)) issues.push({ field, message: "must be an integer" });
}

function optionalInteger(value: unknown, field: string, issues: ValidationIssue[], options: { min?: number; max?: number } = {}) {
  if (value === undefined || value === null) return;
  requireInteger(value, field, issues, options);
}

function requireBoolean(value: unknown, field: string, issues: ValidationIssue[]) {
  if (typeof value !== "boolean") issues.push({ field, message: "must be a boolean" });
}

function optionalBoolean(value: unknown, field: string, issues: ValidationIssue[]) {
  if (value === undefined || value === null) return;
  requireBoolean(value, field, issues);
}

function requireEnum(value: unknown, field: string, allowed: string[], issues: ValidationIssue[]) {
  if (typeof value !== "string" || !allowed.includes(value)) issues.push({ field, message: `must be one of: ${allowed.join(", ")}` });
}

function optionalEnum(value: unknown, field: string, allowed: string[], issues: ValidationIssue[]) {
  if (value === undefined || value === null || value === "") return;
  requireEnum(value, field, allowed, issues);
}

function requireArray(value: unknown, field: string, issues: ValidationIssue[], options: { max?: number } = {}) {
  if (!Array.isArray(value)) {
    issues.push({ field, message: "must be an array" });
    return;
  }
  if (options.max !== undefined && value.length > options.max) issues.push({ field, message: `must contain at most ${options.max} items` });
}

function optionalArray(value: unknown, field: string, issues: ValidationIssue[]) {
  if (value === undefined || value === null) return;
  requireArray(value, field, issues);
}

function optionalStringArray(value: unknown, field: string, issues: ValidationIssue[]) {
  if (value === undefined || value === null) return;
  requireArray(value, field, issues);
  if (Array.isArray(value) && value.some((item) => typeof item !== "string")) issues.push({ field, message: "must contain only strings" });
}

function optionalNumberArray(value: unknown, field: string, issues: ValidationIssue[], options: { integer?: boolean; min?: number; max?: number }) {
  if (value === undefined || value === null) return;
  requireArray(value, field, issues);
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (options.integer) optionalInteger(item, `${field}.${index}`, issues, options);
    else optionalNumber(item, `${field}.${index}`, issues, options);
  });
}
