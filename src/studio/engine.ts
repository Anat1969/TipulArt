// מנוע הסטודיו: ציור החומרים, הקלטת התהליך ושחזור. אותו מנוע משמש לציור ולהצגה חוזרת.
export type Tool = 'charcoal' | 'wet' | 'smudge' | 'eraser' | 'marker'
export type Point = [number, number, number] // x, y, ms מתחילת הקו
export type Stroke = { tool: Tool; color: string; size: number; t0: number; pts: Point[] }

export const W = 1200
export const H = 900
export const PAPER = '#f7f2e8'
export const MAX_POINTS = 15000

export const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'charcoal', label: 'פחם', hint: 'קו יבש ונשלט' },
  { id: 'wet', label: 'צבע רטוב', hint: 'מתפשט ונספג' },
  { id: 'smudge', label: 'מריחה', hint: 'מגע בחומר, כמו חימר' },
  { id: 'eraser', label: 'מחק', hint: 'מחזיר לנייר' },
]

export const COLORS = ['#232428', '#a9472f', '#c2462f', '#a8741c', '#e0b84a', '#3b4a63', '#5d6b52', '#f7f2e8']

export const SIZES = [
  { id: 6, label: 'דק' },
  { id: 16, label: 'בינוני' },
  { id: 40, label: 'רחב' },
]

export function clearPaper(ctx: CanvasRenderingContext2D, paper = PAPER) {
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// קטע אחד של קו, מנקודה a לנקודה b.
export function drawSegment(ctx: CanvasRenderingContext2D, s: Stroke, a: Point, b: Point) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dist = Math.hypot(dx, dy)
  ctx.save()
  if (s.tool === 'charcoal') {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = s.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const steps = 3
    for (let i = 0; i < steps; i++) {
      // גרעין פחם: כמה קווים דקים עם סטייה קטנה ושקיפות משתנה
      const j = (i - 1) * s.size * 0.18
      ctx.globalAlpha = 0.28 + ((a[0] * 13 + b[1] * 7 + i * 31) % 17) / 60
      ctx.lineWidth = Math.max(1, s.size * (0.55 - i * 0.12))
      ctx.beginPath()
      ctx.moveTo(a[0] + j, a[1] - j)
      ctx.lineTo(b[0] + j, b[1] - j)
      ctx.stroke()
    }
  } else if (s.tool === 'marker') {
    // טוש: קו אטום ואחיד, כמו בערכת הטושים של המשימה התקנית
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = s.color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, s.size * 0.5)
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
  } else if (s.tool === 'wet') {
    const [r, g, bl] = hexToRgb(s.color)
    const step = Math.max(2, s.size * 0.25)
    const n = Math.max(1, Math.ceil(dist / step))
    const rad = s.size * 1.4
    for (let i = 0; i <= n; i++) {
      const x = a[0] + (dx * i) / n
      const y = a[1] + (dy * i) / n
      const grad = ctx.createRadialGradient(x, y, 0, x, y, rad)
      grad.addColorStop(0, `rgba(${r},${g},${bl},0.10)`)
      grad.addColorStop(0.6, `rgba(${r},${g},${bl},0.06)`)
      grad.addColorStop(1, `rgba(${r},${g},${bl},0)`)
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (s.tool === 'smudge') {
    const rad = Math.max(8, s.size)
    const n = Math.max(1, Math.ceil(dist / (rad * 0.25)))
    ctx.globalAlpha = 0.5
    for (let i = 1; i <= n; i++) {
      const px = a[0] + (dx * (i - 1)) / n
      const py = a[1] + (dy * (i - 1)) / n
      const x = a[0] + (dx * i) / n
      const y = a[1] + (dy * i) / n
      ctx.save()
      ctx.beginPath()
      ctx.arc(x, y, rad, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(ctx.canvas, px - rad, py - rad, rad * 2, rad * 2, x - rad, y - rad, rad * 2, rad * 2)
      ctx.restore()
    }
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = PAPER
    ctx.lineCap = 'round'
    ctx.lineWidth = s.size * 1.6
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
  }
  ctx.restore()
}

export function drawDot(ctx: CanvasRenderingContext2D, s: Stroke, p: Point) {
  drawSegment(ctx, s, p, [p[0] + 0.5, p[1] + 0.5, p[2]])
}

// ---------- סיכום תהליך: נתונים תיאוריים בלבד, בלי פרשנות ----------
export type ProcessSummary = {
  totalSec: number
  activeSec: number
  firstStrokeSec: number | null
  strokes: number
  pauses: number
  longestPauseSec: number
  toolSec: Record<Tool, number>
  colors: string[]
  eraseStrokes: number
  coverage: number
  centerShare: number
}

export type ProcessRecord = { v: 1; w: number; h: number; openedAt: number; finishedAt: number; strokes: Stroke[]; summary: ProcessSummary }

function paperOf(ctx: CanvasRenderingContext2D) {
  const d = ctx.getImageData(1, 1, 1, 1).data
  return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export function summarize(strokes: Stroke[], openedAt: number, finishedAt: number, ctx: CanvasRenderingContext2D | null): ProcessSummary {
  const toolSec: Record<Tool, number> = { charcoal: 0, wet: 0, smudge: 0, eraser: 0, marker: 0 }
  let active = 0
  let pauses = 0
  let longest = 0
  const colors = new Set<string>()
  strokes.forEach((s, i) => {
    const d = s.pts.length ? s.pts[s.pts.length - 1][2] : 0
    active += d
    toolSec[s.tool] += d / 1000
    if (s.tool === 'charcoal' || s.tool === 'wet' || s.tool === 'marker') colors.add(s.color)
    if (i > 0) {
      const prev = strokes[i - 1]
      const prevEnd = prev.t0 + (prev.pts.length ? prev.pts[prev.pts.length - 1][2] : 0)
      const gap = s.t0 - prevEnd
      if (gap > 5000) pauses++
      longest = Math.max(longest, gap)
    }
  })
  let coverage = 0
  let centerShare = 0
  if (ctx) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const img = ctx.getImageData(0, 0, W, H).data
    const [pr, pg, pb] = hexToRgb(paperOf(ctx))
    let marked = 0
    let center = 0
    let samples = 0
    for (let y = 4; y < H; y += 8)
      for (let x = 4; x < W; x += 8) {
        samples++
        const i = (y * W + x) * 4
        if (Math.abs(img[i] - pr) + Math.abs(img[i + 1] - pg) + Math.abs(img[i + 2] - pb) > 24) {
          marked++
          if (x > W * 0.25 && x < W * 0.75 && y > H * 0.25 && y < H * 0.75) center++
        }
      }
    coverage = Math.round((marked / samples) * 100)
    centerShare = marked ? Math.round((center / marked) * 100) : 0
  }
  return {
    totalSec: Math.round((finishedAt - openedAt) / 1000),
    activeSec: Math.round(active / 1000),
    firstStrokeSec: strokes.length ? Math.round(strokes[0].t0 / 1000) : null,
    strokes: strokes.length,
    pauses,
    longestPauseSec: Math.round(longest / 1000),
    toolSec: Object.fromEntries(Object.entries(toolSec).map(([k, v]) => [k, Math.round(v)])) as Record<Tool, number>,
    colors: [...colors],
    eraseStrokes: strokes.filter((s) => s.tool === 'eraser').length,
    coverage,
    centerShare,
  }
}

export function fmtSec(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
