// מדדים ממוחשבים מהתמונה עצמה. עובד גם על צילום של ציור מנייר.
// אלה מדדים תיאוריים שחושבו בקוד, בלי מודל. הם משמשים קירוב לשני פריטי FEATS בלבד: ניצול השטח ובולטות הצבע.
import type { Computed } from '../content/feats'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function rgbToHsv(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  let h = 0
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, mx ? d / mx : 0, mx / 255]
}

const toScore = (pct: number, cuts: number[]) => cuts.filter((c) => pct >= c).length

export async function analyzeImage(src: string): Promise<Computed> {
  const img = await loadImage(src)
  const scale = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  if (w < 8 || h < 8)
    return { coverage: 0, colorShare: 0, colors: [], colorCount: 0, quadrants: [0, 0, 0, 0], centerOffset: 0, edgeDensity: 0, proxies: { space: 0, prominence_of_color: 0 } }

  // הנייר: חציון הבהירות בשולי התמונה
  const border: number[] = []
  for (let x = 0; x < w; x += 2) {
    for (const y of [1, h - 2]) {
      const i = (y * w + x) * 4
      border.push((d[i] + d[i + 1] + d[i + 2]) / 3)
    }
  }
  border.sort((a, b) => a - b)
  const paperL = border[Math.floor(border.length / 2)] ?? 245
  const thresh = Math.max(18, paperL * 0.12)

  let marked = 0
  let colored = 0
  const quad = [0, 0, 0, 0]
  let sx = 0
  let sy = 0
  let edges = 0
  const hueBins = new Array(12).fill(0)
  const binRgb = Array.from({ length: 12 }, () => [0, 0, 0])
  const lum = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      lum[y * w + x] = (d[i] + d[i + 1] + d[i + 2]) / 3
    }
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const k = y * w + x
      const i = k * 4
      const isMark = paperL - lum[k] > thresh || rgbToHsv(d[i], d[i + 1], d[i + 2])[1] > 0.35
      if (!isMark) continue
      marked++
      sx += x
      sy += y
      quad[(y < h / 2 ? 0 : 2) + (x < w / 2 ? 1 : 0)]++
      const [hu, sat, val] = rgbToHsv(d[i], d[i + 1], d[i + 2])
      if (sat > 0.3 && val > 0.2) {
        colored++
        const b = Math.floor(hu / 30) % 12
        hueBins[b]++
        binRgb[b][0] += d[i]
        binRgb[b][1] += d[i + 1]
        binRgb[b][2] += d[i + 2]
      }
      const gx = lum[k + 1] - lum[k - 1]
      const gy = lum[k + w] - lum[k - w]
      if (Math.hypot(gx, gy) > 40) edges++
    }
  const total = (w - 2) * (h - 2)
  const coverage = Math.round((marked / total) * 1000) / 10
  const colors = hueBins
    .map((n, b) => ({ n, b }))
    .filter((x) => colored && x.n / colored > 0.03)
    .sort((a, b) => b.n - a.n)
    .map(({ n, b }) => {
      const [r, g, bl] = binRgb[b].map((v) => Math.round(v / n))
      return { hex: `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`, share: Math.round((n / colored) * 100) }
    })
  const cx = marked ? sx / marked / w - 0.5 : 0
  const cy = marked ? sy / marked / h - 0.5 : 0
  const quads = quad.map((q) => (marked ? Math.round((q / marked) * 100) : 0)) as [number, number, number, number]
  const colorShare = marked ? Math.round((colored / marked) * 100) : 0
  return {
    coverage,
    colorShare,
    colors,
    colorCount: colors.length,
    quadrants: quads,
    centerOffset: Math.round(Math.hypot(cx, cy) * 100),
    edgeDensity: marked ? Math.round((edges / marked) * 100) : 0,
    proxies: {
      // קירוב בלבד, לא דירוג FEATS: אחוז הדף שסומן, ואחוז השטח הצבוע מתוך כל הדף
      space: toScore(coverage, [5, 15, 30, 50, 75]),
      prominence_of_color: toScore(Math.round((colored / total) * 100), [2, 8, 18, 35, 55]),
    },
  }
}

export const QUADRANT_LABELS = ['ימין למעלה', 'שמאל למעלה', 'ימין למטה', 'שמאל למטה']
