import { describe, expect, it } from "vitest";
import { isWebPushConfigured, sendWebPush } from "./push";

describe("web push integration", () => {
  it("detects missing VAPID env", () => {
    expect(isWebPushConfigured({})).toBe(false);
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
