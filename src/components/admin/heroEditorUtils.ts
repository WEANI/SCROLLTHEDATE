/** Utilitaires des écrans de réglage du hero (sortis à part pour le rechargement à chaud de Vite). */

/** Cible de l'aperçu du compte à rebours — 100 jours après le chargement de la page (jamais échue, contrairement à une date fixe). */
export const COUNTDOWN_PREVIEW_TARGET = new Date(Date.now() + 100 * 86400000).toISOString();

export function fmtTimecode(sec: number) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}
