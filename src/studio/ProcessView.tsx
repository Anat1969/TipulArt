import { useEffect, useRef, useState } from 'react'
import './Studio.css'
import { H, W, clearPaper, drawDot, drawSegment, fmtSec, type ProcessRecord, type Tool } from './engine'

const TOOL_LABELS: Record<Tool, { label: string; etc: string; color: string }> = {
  charcoal: { label: 'פחם', etc: 'חומר נשלט', color: 'var(--etc-cs)' },
  wet: { label: 'צבע רטוב', etc: 'חומר זורם', color: 'var(--etc-ks)' },
  smudge: { label: 'מריחה', etc: 'מגע', color: 'var(--etc-pa)' },
  eraser: { label: 'מחק', etc: 'תיקון', color: 'var(--muted)' },
}

// תמונת תהליך: מה קרה בזמן היצירה. נתונים תיאוריים בלבד. הפרשנות והאבחון נשארים אצל המטפלת.
export function ProcessView({ process, compact = false }: { process: ProcessRecord; compact?: boolean }) {
  const s = process.summary
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(false)
  const raf = useRef(0)
  const totalTool = Math.max(1, Object.values(s.toolSec).reduce((a, b) => a + b, 0))

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const replay = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    clearPaper(ctx)
    cancelAnimationFrame(raf.current)
    const strokes = process.strokes
    if (!strokes.length) return
    const lastStroke = strokes[strokes.length - 1]
    const end = lastStroke.t0 + (lastStroke.pts[lastStroke.pts.length - 1]?.[2] ?? 0)
    const speed = Math.max(1, end / 12000) // כל תהליך מוצג בכ-12 שניות
    const drawn = strokes.map(() => 0)
    const start = performance.now()
    setPlaying(true)
    const frame = () => {
      const t = (performance.now() - start) * speed
      strokes.forEach((st, i) => {
        let k = drawn[i]
        while (k < st.pts.length && st.t0 + st.pts[k][2] <= t) {
          if (k === 0) drawDot(ctx, st, st.pts[0])
          else drawSegment(ctx, st, st.pts[k - 1], st.pts[k])
          k++
        }
        drawn[i] = k
      })
      if (t < end) raf.current = requestAnimationFrame(frame)
      else setPlaying(false)
    }
    raf.current = requestAnimationFrame(frame)
  }

  return (
    <div className="process" data-testid="process-view">
      <div className="label">תמונת תהליך · נתונים תיאוריים, לא אבחנה</div>
      <div className="process-grid">
        <div className="metric"><b>{fmtSec(s.totalSec)}</b><span>זמן כולל</span></div>
        <div className="metric"><b>{fmtSec(s.activeSec)}</b><span>זמן ציור בפועל</span></div>
        <div className="metric"><b>{s.firstStrokeSec === null ? '-' : fmtSec(s.firstStrokeSec)}</b><span>עד הקו הראשון</span></div>
        <div className="metric"><b>{s.strokes}</b><span>קווים</span></div>
        <div className="metric"><b>{s.pauses}</b><span>עצירות מעל 5 שניות</span></div>
        <div className="metric"><b>{fmtSec(s.longestPauseSec)}</b><span>העצירה הארוכה</span></div>
        <div className="metric"><b>{s.coverage}%</b><span>כיסוי הדף</span></div>
        <div className="metric"><b>{s.centerShare}%</b><span>מהסימון במרכז הדף</span></div>
      </div>
      <div className="tool-bars">
        {(Object.keys(TOOL_LABELS) as Tool[]).map((t) => (
          <div className="tool-bar" key={t}>
            <span>{TOOL_LABELS[t].label}</span>
            <i><em style={{ width: `${(s.toolSec[t] / totalTool) * 100}%`, background: TOOL_LABELS[t].color }} /></i>
            <span className="muted">{fmtSec(s.toolSec[t])}</span>
          </div>
        ))}
      </div>
      <div className="row">
        <span className="label">צבעים</span>
        {s.colors.length ? s.colors.map((c) => <span key={c} className="etc-mark" style={{ background: c, width: 18, height: 18, border: '1px solid var(--line-strong)' }} />) : <span className="muted">-</span>}
        <span className="label">· מחיקות {s.eraseStrokes}</span>
      </div>
      {!compact && (
        <div className="stack" style={{ gap: 8 }}>
          <canvas ref={canvasRef} width={W} height={H} className="replay-canvas" aria-label="שחזור תהליך היצירה" />
          <div>
            <button type="button" className="btn btn-sm" onClick={replay} disabled={playing} data-testid="replay">
              {playing ? 'מציג את התהליך' : 'הצגת התהליך מההתחלה'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
