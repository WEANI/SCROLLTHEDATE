/**
 * Gère le chargement et l'affichage d'une séquence d'images pour le hero
 * scrub — alternative à un fichier vidéo unique (cf. api/lib/videoFrames.ts
 * côté serveur, échange du 06/09/2026). Contourne la limite de taille par
 * fichier de Supabase Storage (chaque image pèse quelques dizaines de Ko,
 * jamais un seul gros fichier) ET élimine toute la classe de bugs de
 * lecture <video> rencontrés en conditions réelles cette même session
 * (frame noire iOS au-delà du buffer, mise en mémoire tampon qui bloque le
 * scroll, position du moov atom…) : une image chargée (ou la plus proche
 * déjà chargée, sinon) n'a aucune de ces subtilités de seek.
 *
 * Stratégie de chargement : préchargement séquentiel en arrière-plan depuis
 * l'image 0 (`pump`, appelé à chaque tick — même esprit que `preload="auto"`
 * pour une vidéo), PLUS une fenêtre prioritaire autour de la position de
 * scroll courante (`prioritize`) pour rester réactif même si l'utilisateur
 * scrolle plus vite que le préchargement de fond ne progresse.
 */
export class FrameSequence {
  private images = new Map<number, HTMLImageElement>()
  private loading = new Set<number>()
  private lastDrawnIndex = -1
  private sequentialCursor = 0
  private destroyed = false
  private baseUrl: string
  private count: number

  constructor(baseUrl: string, count: number) {
    this.baseUrl = baseUrl
    this.count = count
  }

  private urlFor(index: number): string {
    return `${this.baseUrl}${String(index + 1).padStart(5, '0')}.jpg`
  }

  private load(index: number) {
    if (index < 0 || index >= this.count) return
    if (this.images.has(index) || this.loading.has(index)) return
    this.loading.add(index)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      this.loading.delete(index)
      if (this.destroyed) return
      this.images.set(index, img)
    }
    img.onerror = () => {
      this.loading.delete(index)
    }
    img.src = this.urlFor(index)
  }

  /** Préchargement séquentiel en arrière-plan — à appeler à chaque tick ; ne fait rien de plus une fois toutes les images chargées ou en cours. */
  pump(concurrency = 4) {
    let inflight = this.loading.size
    while (inflight < concurrency && this.sequentialCursor < this.count) {
      this.load(this.sequentialCursor)
      this.sequentialCursor++
      inflight++
    }
  }

  /** Priorise une petite fenêtre autour de `index` — l'utilisateur a scrollé au-delà de ce que le préchargement séquentiel a déjà couvert. */
  prioritize(index: number, radius = 6) {
    for (let d = 0; d <= radius; d++) {
      this.load(index + d)
      if (d > 0) this.load(index - d)
    }
  }

  get loadedCount(): number {
    return this.images.size
  }

  /**
   * Dessine la meilleure image disponible pour `index` — elle-même si déjà
   * chargée, sinon la plus proche déjà chargée (jamais de cadre vide ou
   * noir, même comportement que le repli sur le dernier frame décodé d'un
   * <video>). Ne redessine pas si l'image effectivement affichée n'a pas
   * changé depuis le dernier appel — évite un travail canvas inutile à
   * chaque tick de la boucle de scroll.
   */
  draw(canvas: HTMLCanvasElement, index: number) {
    const clamped = Math.min(this.count - 1, Math.max(0, index))
    let picked = clamped
    let img = this.images.get(clamped)
    if (!img) {
      for (let d = 1; d < this.count && !img; d++) {
        if (this.images.has(clamped - d)) {
          img = this.images.get(clamped - d)
          picked = clamped - d
        } else if (this.images.has(clamped + d)) {
          img = this.images.get(clamped + d)
          picked = clamped + d
        }
      }
    }
    if (!img) return // rien encore chargé — le poster CSS en fond reste visible

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (this.lastDrawnIndex === picked && canvas.width === Math.round(w) * 2) return
    this.lastDrawnIndex = picked

    const ctx = canvas.getContext('2d')
    if (!ctx || w === 0 || h === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const targetW = Math.round(w * dpr)
    const targetH = Math.round(h * dpr)
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW
      canvas.height = targetH
    }
    // `object-fit: cover` manuel — un canvas n'a pas cette propriété CSS.
    const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const dx = (targetW - dw) / 2
    const dy = (targetH - dh) / 2
    ctx.clearRect(0, 0, targetW, targetH)
    ctx.drawImage(img, dx, dy, dw, dh)
  }

  destroy() {
    this.destroyed = true
    this.images.clear()
    this.loading.clear()
  }
}
