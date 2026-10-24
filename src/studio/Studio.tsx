import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import {
  COLORS,
  H,
  MAX_POINTS,
  SIZES,
  TOOLS,
  W,
  clearPaper,
  drawDot,
  drawSegment,
  fmtSec,
  summarize,
  type ProcessRecord,
  type Stroke,
  type Tool,
} from './engine'
import { PPAT } from '../content/feats'
import './Studio.css'

export type StudioResult = { blob: Blob; dataUrl: string; process: ProcessRecord }

// סטודיו לציור. מקליט כל קו עם זמן, כדי שאפשר יהיה לראות את התהליך ולא רק את התוצר.
// standard: מצב משימה תקנית. דף לבן 3:2, טוש בלבד, 12 צבעים קבועים, בלי עזרים.
export function Studio({ onFinish, finishLabel = 'סיום היצירה', standard = false }: { onFinish: (r: StudioResult) => void; finishLabel?: string; standard?: boolean }) {
  const cw = standard ? 1200 : W
  const ch = standard ? 800 : H
  const paper = standard ? '#ffffff' : undefined
  const tools = standard ? [{ id: 'marker' as Tool, label: 'טוש', hint: 'טוש אחיד' }] : TOOLS
  const colors = standard ? PPAT.palette : COLORS
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const current = useRef<Stroke | null>(null)
  const openedAt = useRef(performance.now())
  const pointCount = useRef(0)
  const [tool, setTool] = useState<Tool>(standard ? 'marker' : 'charcoal')
  const [color, setColor] = useState(standard ? PPAT.palette[0] : COLORS[0])
  const [size, setSize] = useState(16)
  const [guide, setGuide] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [full, setFull] = useState(false)

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d', { willReadFrequently: true })!
    clearPaper(ctx, paper)
    const id = setInterval(() => setElapsed(Math.floor((performance.now() - openedAt.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const toCanvas = (e: RPointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * cw, ((e.clientY - r.top) / r.height) * ch] as const
  }

  const down = (e: RPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current!.setPointerCapture(e.pointerId)
    const [x, y] = toCanvas(e)
    const t0 = performance.now() - openedAt.current
    const s: Stroke = { tool, color, size, t0: Math.round(t0), pts: [[Math.round(x), Math.round(y), 0]] }
    current.current = s
    setStarted(true)
    drawDot(canvasRef.current!.getContext('2d')!, s, s.pts[0])
  }

  const move = (e: RPointerEvent<HTMLCanvasElement>) => {
    const s = current.current
    if (!s) return
    const [x, y] = toCanvas(e)
    const last = s.pts[s.pts.length - 1]
    if (Math.hypot(x - last[0], y - last[1]) < 2) return
    const p: [number, number, number] = [Math.round(x), Math.round(y), Math.round(performance.now() - openedAt.current - s.t0)]
    drawSegment(canvasRef.current!.getContext('2d')!, s, last, p)
    if (pointCount.current < MAX_POINTS) {
      s.pts.push(p)
      pointCount.current++
    } else {
      s.pts[s.pts.length - 1] = p
    }
  }

  const up = () => {
    if (current.current) strokesRef.current.push(current.current)
    current.current = null
  }

  const clearAll = () => {
    if (!confirm('לנקות את הדף? התהליך שנרשם עד עכשיו יימחק.')) return
    clearPaper(canvasRef.current!.getContext('2d')!, paper)
    strokesRef.current = []
    pointCount.current = 0
    openedAt.current = performance.now()
    setStarted(false)
  }

  const finish = () => {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    const finishedAt = performance.now()
    const strokes = strokesRef.current
    const process: ProcessRecord = {
      v: 1,
      w: cw,
      h: ch,
      openedAt: 0,
      finishedAt: Math.round(finishedAt - openedAt.current),
      strokes,
      summary: summarize(strokes, openedAt.current, finishedAt, ctx),
    }
    const dataUrl = c.toDataURL('image/jpeg', 0.86)
    c.toBlob((blob) => blob && onFinish({ blob, dataUrl, process }), 'image/jpeg', 0.86)
  }

  return (
    <div className={`studio ${full ? 'studio-full' : ''}`} data-testid="studio">
      <div className="studio-tools" role="toolbar" aria-label="כלי ציור">
        <div className="studio-group">
          <span className="label">חומר</span>
          <div className="row">
            {tools.map((t) => (
              <button key={t.id} type="button" className="chip" aria-pressed={tool === t.id} title={t.hint} onClick={() => setTool(t.id)} data-testid={`tool-${t.id}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="studio-group">
          <span className="label">צבע</span>
          <div className="row swatches">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                aria-pressed={color === c}
                aria-label={`צבע ${c}`}
                style={{ background: c }}
                onClick={() => {
                  setColor(c)
                  if (tool === 'eraser' || tool === 'smudge') setTool(standard ? 'marker' : 'charcoal')
                }}
              />
            ))}
          </div>
        </div>
        <div className="studio-group">
          <span className="label">עובי</span>
          <div className="row">
            {SIZES.map((s) => (
              <button key={s.id} type="button" className="chip" aria-pressed={size === s.id} onClick={() => setSize(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {!standard && <div className="studio-group">
          <span className="label">דף</span>
          <div className="row">
            <button type="button" className="chip" aria-pressed={guide} onClick={() => setGuide((g) => !g)}>
              עיגול מנדלה
            </button>
            <button type="button" className="chip" onClick={clearAll}>
              דף חדש
            </button>
            <button type="button" className="chip" aria-pressed={full} onClick={() => setFull((f) => !f)}>
              {full ? 'מסך רגיל' : 'מסך מלא'}
            </button>
          </div>
        </div>}
      </div>

      <div className="studio-paper" style={{ aspectRatio: `${cw} / ${ch}`, background: paper }}>
        <canvas
          ref={canvasRef}
          width={cw}
          height={ch}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          aria-label="דף ציור"
          data-testid="studio-canvas"
        />
        {guide && (
          <svg className="studio-guide" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <circle cx={W / 2} cy={H / 2} r={H * 0.42} fill="none" stroke="#3b4a63" strokeOpacity="0.35" strokeWidth="3" strokeDasharray="10 12" />
            <circle cx={W / 2} cy={H / 2} r={6} fill="#3b4a63" fillOpacity="0.4" />
          </svg>
        )}
      </div>

      <div className="studio-foot">
        <span className="label" aria-live="off">
          זמן בסטודיו {fmtSec(elapsed)} {started ? '' : '· הקו הראשון עוד לא נכתב'}
        </span>
        <button type="button" className="btn btn-primary" onClick={finish} disabled={!started} data-testid="studio-finish">
          {finishLabel}
        </button>
      </div>
    </div>
  )
}
