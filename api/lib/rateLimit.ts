/**
 * Limiteur de débit minimaliste, en mémoire.
 *
 * Sert à protéger les rares procédures accessibles SANS authentification —
 * aujourd'hui `orders.createCheckout`, qui crée un PaymentIntent Stripe et
 * des lignes en base : jusqu'au 31/08/2026 l'obligation d'avoir un compte
 * jouait ce rôle de garde-fou, elle a disparu avec le checkout invité
 * (création de compte APRÈS paiement).
 *
 * Volontairement en mémoire : le service tourne sur une seule instance
 * Railway, et cette limite n'est pas une frontière de sécurité (elle freine
 * l'abus automatisé, elle ne protège aucun secret). Si le service passe un
 * jour à plusieurs instances, il faudra la déplacer en base ou dans un cache
 * partagé — sinon la limite est multipliée par le nombre d'instances.
 */

type Hits = { count: number; resetAt: number };

const buckets = new Map<string, Hits>();

/** Purge paresseuse : évite que la Map ne grossisse indéfiniment. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, hits] of buckets) {
    if (hits.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Renvoie `true` si l'appel est autorisé, `false` s'il dépasse la limite.
 * Fenêtre glissante simple : `max` appels par `windowMs` et par clé.
 */
export function allowRequest(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const hits = buckets.get(key);
  if (!hits || hits.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (hits.count >= max) return false;
  hits.count += 1;
  return true;
}

/**
 * Adresse IP de l'appelant, telle que vue derrière le proxy Railway.
 * `x-forwarded-for` peut contenir une liste "client, proxy1, proxy2" — la
 * première entrée est le client d'origine. Repli sur une clé constante si
 * l'en-tête est absent : mieux vaut une limite globale (trop stricte) que
 * pas de limite du tout.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first || headers.get("x-real-ip") || "unknown";
}
