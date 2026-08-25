import { afterAll, describe, expect, it } from "vitest";
import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | undefined;

describe("REDIS_URL integration", () => {
  it("connects and responds to a lightweight PING", async () => {
    const restUrl = process.env.UPSTASH_REDIS_REST_URL;
    const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (restUrl && restToken) {
      const response = await fetch(`${restUrl.replace(/\/$/, "")}/ping`, {
        headers: { Authorization: `Bearer ${restToken}` },
      });
      expect(response.ok, "Upstash REST credentials must be accepted").toBe(true);
      await expect(response.json()).resolves.toMatchObject({ result: "PONG" });
      return;
    }

    const url = process.env.REDIS_URL;
    expect(url, "REDIS_URL must be configured").toMatch(/^rediss?:\/\//);

    client = createClient({ url });
    await client.connect();
    await expect(client.ping()).resolves.toBe("PONG");
  }, 15_000);
});

afterAll(async () => {
  if (client?.isOpen) await client.quit();
});
