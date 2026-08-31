import type { User } from "@db/schema";
import { supabaseAdmin } from "./supabaseAdmin";
import { env } from "./env";
import { linkAuthUser } from "../queries/users";

/**
 * Transforme un acheteur invité en vrai compte, APRÈS paiement confirmé.
 *
 * Le checkout invité (cf. `orders.createCheckout`) crée seulement une ligne
 * `users` locale, sans compte Supabase Auth : c'est ce qui permet de ne rien
 * demander avant le paiement, et de ne créer aucun compte pour les paniers
 * abandonnés. Une fois le paiement encaissé, on crée ici le compte Supabase
 * correspondant — sans mot de passe — et on renvoie un lien à usage unique
 * permettant au client d'en choisir un.
 *
 * Renvoie `null` si rien n'est à faire (compte déjà existant) ou si la
 * création échoue : un échec ne doit JAMAIS faire échouer le webhook Stripe,
 * sinon Stripe rejouerait l'événement et le client ne recevrait pas son email
 * de confirmation alors qu'il a bien payé.
 */
export async function provisionAccountForGuest(user: User): Promise<string | null> {
  if (user.authUserId || !user.email) return null;

  try {
    // L'utilisateur peut déjà exister côté Supabase Auth sans que notre ligne
    // locale ne le sache (ligne invitée créée avant qu'un compte ne soit
    // ouvert par ailleurs) — l'erreur est alors attendue et sans gravité,
    // generateLink ci-dessous nous rendra son identifiant de toute façon.
    const created = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
    });
    if (created.error && !/already|registered|exists/i.test(created.error.message)) {
      console.error("[guest-account] création du compte impossible :", created.error.message);
      return null;
    }

    // `recovery` sert ici de « définir votre mot de passe » : le compte vient
    // d'être créé sans mot de passe, ce lien ouvre une session le temps d'en
    // choisir un.
    const link = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: user.email,
      options: { redirectTo: `${env.appUrl}/definir-mot-de-passe` },
    });
    if (link.error || !link.data?.user) {
      console.error(
        "[guest-account] lien de définition du mot de passe impossible :",
        link.error?.message ?? "utilisateur absent de la réponse",
      );
      return null;
    }

    await linkAuthUser(user.id, link.data.user.id);
    return link.data.properties?.action_link ?? null;
  } catch (err) {
    console.error(
      "[guest-account] échec inattendu :",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
