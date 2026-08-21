import { describe, expect, it } from "vitest";
import { getVapidPublicKey, isWebPushConfigured, sendWebPush } from "./push";

describe("web push integration", () => {
  it("detects missing VAPID env", () => {
    expect(isWebPushConfigured({})).toBe(false);
  });

  it("detects configured VAPID env with the public client key", () => {
    const env = {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:test@example.com"
    };

    expect(getVapidPublicKey(env)).toBe("public");
    expect(isWebPushConfigured(env)).toBe(true);
  });

  it("returns missing-env without sending", async () => {
    const result = await sendWebPush(
      { endpoint: "https://push.test", keys: { p256dh: "p256dh", auth: "auth" } },
      { title: "Test", body: "Body" },
      {}
    );

    expect(result).toBe("missing-env");
  });
});
