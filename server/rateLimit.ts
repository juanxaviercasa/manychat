import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ENV } from "./_core/env";

const redis = ENV.upstashRedisRestUrl && ENV.upstashRedisRestToken
  ? new Redis({ url: ENV.upstashRedisRestUrl, token: ENV.upstashRedisRestToken })
  : null;

const campaignLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "mimanychat:campaign:user",
  analytics: false,
}) : null;

const contactLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  prefix: "mimanychat:campaign:contact",
  analytics: false,
}) : null;

export type RateLimitResult = { success: boolean; limit: number; remaining: number; reset: number; mode: "upstash" | "unconfigured" };

export async function enforceCampaignRateLimit(input: { ownerId: number; contactId?: number; channel: string }): Promise<RateLimitResult> {
  if (!campaignLimiter || !contactLimiter) {
    return { success: true, limit: 0, remaining: 0, reset: 0, mode: "unconfigured" };
  }

  const [userLimit, contactLimit] = await Promise.all([
    campaignLimiter.limit(`user:${input.ownerId}:${input.channel.toLowerCase()}`),
    contactLimiter.limit(`contact:${input.ownerId}:${input.contactId ?? "unknown"}:${input.channel.toLowerCase()}`),
  ]);

  const strictest = userLimit.remaining <= contactLimit.remaining ? userLimit : contactLimit;
  return { success: userLimit.success && contactLimit.success, limit: strictest.limit, remaining: strictest.remaining, reset: strictest.reset, mode: "upstash" };
}

export function rateLimitStatusMessage(result: RateLimitResult) {
  if (result.mode === "unconfigured") return "Redis no está configurado: el envío productivo permanece bloqueado.";
  if (!result.success) return "Límite anti-spam alcanzado. Espera antes de volver a enviar.";
  return `${result.remaining} acciones disponibles antes de la siguiente ventana.`;
}
