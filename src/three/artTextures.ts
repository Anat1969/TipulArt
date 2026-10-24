import * as THREE from 'three'

// כל דף בסצנה הוא "יצירה" של טכניקה אחרת: ציור חופשי, מקום בטוח, משפחה, קולאז', מנדלה.
type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number) => void

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const PAPER = '#f4eee3'
const INK = '#2b2d31'
const OCHRE = '#b8862b'
const TERRA = '#b5543a'
const SAGE = '#6f7d62'
const BLUE = '#3b4a63'

const painters: Painter[] = [
  // ציור חופשי: קווי פחם חופשיים
  (ctx, w, h, rnd) => {
    ctx.strokeStyle = INK
    ctx.lineCap = 'round'
    for (let i = 0; i < 7; i++) {
      ctx.lineWidth = 2 + rnd() * 5
      ctx.globalAlpha = 0.5 + rnd() * 0.4
      ctx.beginPath()
      ctx.moveTo(rnd() * w, rnd() * h)
      for (let k = 0; k < 4; k++) ctx.quadraticCurveTo(rnd() * w, rnd() * h, rnd() * w, rnd() * h)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.75
    ctx.fillStyle = TERRA
    ctx.beginPath()
    ctx.arc(w * 0.62, h * 0.38, w * 0.12, 0, Math.PI * 2)
    ctx.fill()
  },
  // מקום בטוח: בית, אופק, שמש
  (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#e7d3a6')
    g.addColorStop(0.6, '#f1e4c8')
    g.addColorStop(0.61, '#9aa98a')
    g.addColorStop(1, SAGE)
    ctx.fillStyle = g
    ctx.fillRect(16, 16, w - 32, h - 32)
    ctx.fillStyle = OCHRE
    ctx.beginPath()
    ctx.arc(w * 0.7, h * 0.25, w * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = TERRA
    ctx.fillRect(w * 0.25, h * 0.48, w * 0.3, h * 0.16)
    ctx.beginPath()
    ctx.moveTo(w * 0.22, h * 0.48)
    ctx.lineTo(w * 0.4, h * 0.36)
    ctx.lineTo(w * 0.58, h * 0.48)
    ctx.fill()
  },
  // המשפחה שלי: צורות במרחקים
  (ctx, w, h) => {
    const shapes: [number, number, number, string][] = [
      [0.3, 0.35, 0.11, BLUE],
      [0.55, 0.32, 0.09, TERRA],
      [0.42, 0.62, 0.07, OCHRE],
      [0.75, 0.7, 0.06, SAGE],
    ]
    for (const [x, y, r, c] of shapes) {
      ctx.fillStyle = c
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 0.4
    ctx.strokeStyle = INK
    ctx.setLineDash([6, 8])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(w * 0.3, h * 0.35)
    ctx.lineTo(w * 0.55, h * 0.32)
    ctx.lineTo(w * 0.42, h * 0.62)
    ctx.stroke()
  },
  // קולאז': מלבנים חופפים
  (ctx, w, h, rnd) => {
    const cols = [TERRA, OCHRE, BLUE, SAGE, '#d9c7a7', INK]
    for (let i = 0; i < 9; i++) {
      ctx.save()
      ctx.translate(w * (0.2 + rnd() * 0.6), h * (0.2 + rnd() * 0.6))
      ctx.rotate((rnd() - 0.5) * 0.6)
      ctx.globalAlpha = 0.8
      ctx.fillStyle = cols[i % cols.length]
      ctx.fillRect(-w * 0.15, -h * 0.08, w * (0.18 + rnd() * 0.18), h * (0.1 + rnd() * 0.12))
      ctx.restore()
    }
  },
  // מנדלה: טבעות מהמרכז החוצה
  (ctx, w, h) => {
    const cx = w / 2
    const cy = h / 2
    const cols = [TERRA, OCHRE, BLUE, SAGE]
    for (let ring = 5; ring >= 1; ring--) {
      const r = (w * 0.4 * ring) / 5
      ctx.fillStyle = cols[ring % cols.length]
      ctx.globalAlpha = 0.25 + ring * 0.06
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.2
      for (let k = 0; k < ring * 4; k++) {
        const a = (k / (ring * 4)) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, 3, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  },
]

export function makeArtTexture(index: number): THREE.CanvasTexture {
  const w = 256
  const h = 336
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const rnd = seeded(7 + index * 31)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  // גרעין נייר
  const img = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 14
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
  painters[index % painters.length](ctx, w, h, rnd)
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
