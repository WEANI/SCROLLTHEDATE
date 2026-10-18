import type { Context } from "hono";
import { z } from "zod";
import { allowRequest, clientIp } from "./lib/rateLimit";
import { deviceOf, referrerHostOf, visitorFingerprint } from "./queries/inviteViews";
import { browserOf, isBot, osOf, recordSiteEvent } from "./queries/siteEvents";

/**
 * Réception d'un événement de fréquentation (cf. table siteEvents et
 * src/lib/analytics.ts). Répond toujours 204 : une statistique ne doit
 * jamais gêner la navigation, et un robot n'a pas à savoir qu'il est ignoré.
 */
const clip = (max: number) => z.string().trim().max(1000).transform((v) => v.slice(0, max));
const eventSchema = z.object({
  k: z.enum(["pageview", "engagement", "click", "event"]),
  n: clip(40).optional(),
  p: clip(200),
  t: clip(300).optional(),
  r: z.string().max(1000).optional(),
  us: clip(80).optional(),
  um: clip(80).optional(),
  uc: clip(120).optional(),
  l: clip(10).optional(),
  z: clip(60).optional(),
  s: z.number().int().min(0).max(1800).optional(),
  d: z.number().int().min(0).max(100).optional(),
});

/** Pages jamais mesurées ici : espaces privés et faire-part publiés (comptés à part, cf. inviteViews). */
const EXCLUDED = /^\/(admin|espace|login|definir-mot-de-passe|faire-part)(\/|$)/;

export async function handleSiteEvent(c: Context) {
  try {
    const ua = c.req.header("user-agent") ?? "";
    if (isBot(ua)) return c.body(null, 204);
    const ip = clientIp(c.req.raw.headers);
    if (!allowRequest(`t:${ip}`, 120, 60_000)) return c.body(null, 204);

    const parsed = eventSchema.safeParse(JSON.parse(await c.req.text()));
    if (!parsed.success) return c.body(null, 204);
    const e = parsed.data;
    const path = e.p.split(/[?#]/)[0] || "/";
    if (!path.startsWith("/") || EXCLUDED.test(path)) return c.body(null, 204);

    const selfHost = (() => {
      try {
        return new URL(c.req.url).hostname;
      } catch {
        return null;
      }
    })();
    await recordSiteEvent({
      kind: e.k,
      name: e.n || null,
      path,
      target: e.t || null,
      visitorHash: visitorFingerprint(ip, ua),
      referrerHost: e.k === "pageview" ? referrerHostOf(e.r ?? null, selfHost) : null,
      utmSource: e.us || null,
      utmMedium: e.um || null,
      utmCampaign: e.uc || null,
      device: deviceOf(ua),
      browser: browserOf(ua),
      os: osOf(ua),
      lang: e.l ? e.l.slice(0, 2).toLowerCase() : null,
      tz: e.z || null,
      seconds: e.s ?? null,
      depth: e.d ?? null,
    });
  } catch (err) {
    console.warn("[site-events] événement ignoré :", err instanceof Error ? err.message : err);
  }
  return c.body(null, 204);
}
