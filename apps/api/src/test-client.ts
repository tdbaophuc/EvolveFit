import type { FastifyInstance, InjectOptions } from "fastify";
import { csrfHeaderName } from "./app";

/** Browser-like client: keeps cookies between calls and sends the CSRF header like the web app does. */
export function createTestClient(app: FastifyInstance) {
  const jar = new Map<string, string>();
  return async (input: string | InjectOptions) => {
    const options: InjectOptions = typeof input === "string" ? { method: "GET", url: input } : input;
    const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
    const response = await app.inject({
      ...options,
      headers: { [csrfHeaderName]: "web", ...(cookie ? { cookie } : {}), ...(options.headers ?? {}) }
    });
    for (const setCookie of response.cookies as { name: string; value: string; maxAge?: number }[]) {
      if (!setCookie.value || setCookie.maxAge === 0) jar.delete(setCookie.name);
      else jar.set(setCookie.name, setCookie.value);
    }
    return response;
  };
}
