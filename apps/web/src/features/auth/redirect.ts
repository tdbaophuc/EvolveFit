/** Only same-app paths are allowed as post-auth destinations (prevents open redirects via ?next=). */
export function safeNextPath(next: string | null | undefined, fallback = "/today"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/^\/(sign-in|sign-up|forgot-password|reset-password)(\/|$|\?)/.test(next)) return fallback;
  return next;
}

export function signInHref(next?: string, email?: string | null): string {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (email) params.set("email", email);
  const query = params.toString();
  return `/sign-in${query ? `?${query}` : ""}`;
}

/** Recovery links from Supabase carry the token in the URL fragment (`#access_token=...&type=recovery`). */
export function recoveryTokenFromUrl(href: string): string | null {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const fromHash = fragment.get("access_token");
  if (fromHash && (!fragment.get("type") || fragment.get("type") === "recovery")) return fromHash;
  return url.searchParams.get("token") ?? url.searchParams.get("access_token");
}
