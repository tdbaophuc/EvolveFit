import { describe, expect, it } from "vitest";
import { POST as subscribePost } from "./subscribe/route";
import { POST as unsubscribePost } from "./unsubscribe/route";

describe("notification API routes", () => {
  it("subscribes and unsubscribes browser push subscriptions", async () => {
    const subscribeResponse = await subscribePost(
      new Request("http://localhost/api/notifications/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://push.test/route",
          keys: { p256dh: "route-key", auth: "route-auth" },
          localProfileId: "route-profile",
          platform: "vitest"
        })
      })
    );

    const subscribePayload = await subscribeResponse.json();
    expect(subscribePayload.ok).toBe(true);
    expect(subscribePayload.data.localProfileId).toBe("route-profile");

    const unsubscribeResponse = await unsubscribePost(
      new Request("http://localhost/api/notifications/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: "https://push.test/route" })
      })
    );

    const unsubscribePayload = await unsubscribeResponse.json();
    expect(unsubscribePayload).toEqual({ ok: true, data: { endpoint: "https://push.test/route" } });
  });
});
