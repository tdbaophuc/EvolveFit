export type ApiResult<T = unknown> =
  | { ok: true; data: T; requestId?: string }
  | { ok: false; error: string; errorCode?: string; details?: unknown; requestId?: string };
