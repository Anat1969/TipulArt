import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { RequireAuth } from '../../components/RequireAuth'
import { ProcessView } from '../../studio/ProcessView'
import { QUADRANT_LABELS } from '../../studio/analyzeImage'
import { FEATS, PPAT, SCALE, agreement, type Ratings } from '../../content/feats'
import { getAssessment, getClient, requestAiDraft, saveAssessment, signedUrls, type Assessment, type Client } from '../../logic/data'
import './Assessment.css'

const CONF: Record<string, string> = { low: 'ביטחון נמוך', medium: 'ביטחון בינוני', high: 'ביטחון גבוה' }

function DetailInner() {
  const { id = '' } = useParams()
  const [a, setA] = useState<Assessment | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [url, setUrl] = useState('')
  const [ratings, setRatings] = useState<Ratings>({})
  const [notes, setNotes] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const row = await getAssessment(id)
      setA(row)
      setRatings(row.ratings ?? {})
      setNotes(row.notes ?? '')
      const [c, u] = await Promise.all([getClient(row.client_id), signedUrls([row.image_path])])
      setClient(c)
      setUrl(u[row.image_path] ?? '')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  if (err && !a) return <div className="page"><p className="error">{err}</p></div>
  if (!a) return <div className="page"><p className="label">טוען</p></div>

  const ppat = a.instrument === 'feats_ppat'
  const items = FEATS.filter((f) => ppat || !f.ppatOnly)
  const final = a.status === 'final'
  const aiById = new Map((a.ai_draft?.items ?? []).map((i) => [i.id, i]))
  const missing = items.filter((f) => !(f.id in ratings))
  const pairs = items
    .map((f) => [aiById.get(f.id), ratings[f.id]] as const)
    .filter(([ai, t]) => ai?.applicable && t !== null && t !== undefined)
    .map(([ai, t]) => [ai!.score, t as number] as [number, number])
  const agr = agreement(pairs)

  const flash = (m: string) => {
    setStatus(m)
    setTimeout(() => setStatus(''), 2200)
  }

  const runAi = async () => {
    setAiBusy(true)
    setErr('')
    try {
      const row = await requestAiDraft(a.id)
      setA(row)
    } catch (e) {
      setErr((e as Error).message)
    }
    setAiBusy(false)
  }

  const save = async (sign: boolean) => {
    setErr('')
    if (sign && missing.length) {
      setErr(`חסר דירוג ב-${missing.length} סולמות: ${missing.map((m) => m.he).join(', ')}.`)
      return
    }
    try {
      await saveAssessment(a.id, {
        ratings,
        notes: notes || null,
        ...(sign ? { status: 'final' as const, finalized_at: new Date().toISOString() } : {}),
      })
      await load()
      flash(sign ? 'הדירוג נחתם' : 'נשמר')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const setScore = (itemId: string, v: number | null) => !final && setRatings((r) => ({ ...r, [itemId]: v }))

  return (
    <div className="page">
      <Link to={`/clients/${a.client_id}`} className="label" style={{ textDecoration: 'none' }}>מטופל/ת {client?.code} /</Link>
      <PageHeader
        kicker={`הערכה מובנית · ${new Date(a.created_at).toLocaleDateString('he-IL')} · ${a.mode === 'photo' ? 'צילום מנייר' : 'סטודיו'} · ${final ? 'חתום' : 'טיוטה'}`}
        title={ppat ? PPAT.name : 'ציור חופשי'}
      >
        שלוש שכבות: מדידה ממוחשבת, טיוטת דירוג, ודירוג שלך. **רק הדירוג שלך נחתם ונכנס לציר הזמן.**
      </PageHeader>

      <div className="grid grid-2" style={{ marginBottom: 'var(--s5)' }}>
        <section className="stack">
          <div className="panel">
            {url ? <img src={url} alt="היצירה המוערכת" style={{ width: '100%', display: 'block', boxShadow: 'var(--shadow-1)' }} /> : <div style={{ aspectRatio: '3/2' }} />}
          </div>
          {a.computed && (
            <div className="panel stack" data-testid="computed">
              <div className="label">שכבה 1 · מדידה ממוחשבת מהתמונה</div>
              <div className="process-grid">
                <div className="metric"><b>{a.computed.coverage}%</b><span>כיסוי הדף</span></div>
                <div className="metric"><b>{a.computed.colorShare}%</b><span>מהסימון צבעוני</span></div>
                <div className="metric"><b>{a.computed.colorCount}</b><span>גוונים עיקריים</span></div>
                <div className="metric"><b>{a.computed.edgeDensity}%</b><span>צפיפות קווים</span></div>
              </div>
              <div className="row">
                {a.computed.colors.map((c) => (
                  <span key={c.hex} className="row" style={{ gap: 4, fontSize: 13 }}>
                    <span className="etc-mark" style={{ background: c.hex, width: 18, height: 18, border: '1px solid var(--line-strong)' }} />
                    {c.share}%
                  </span>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                פיזור: {a.computed.quadrants.map((q, i) => `${QUADRANT_LABELS[i]} ${q}%`).join(' · ')} · היסט ממרכז {a.computed.centerOffset}%
              </div>
            </div>
          )}
          {a.process && (
            <div className="panel">
              <ProcessView process={a.process} />
            </div>
          )}
        </section>

        <section className="stack">
          <div className="panel stack" data-testid="ai-panel">
            <div className="label">שכבה 2 · טיוטת דירוג</div>
            {!a.ai_draft ? (
              <>
                <p style={{ margin: 0 }}>
                  Claude, מודל שפה עם ראייה, מדרג את 14 הסולמות לפי ההגדרות, עם נימוק ורמת ביטחון לכל סולם, ותיאור צורני של העבודה.
                  בלי אבחנה ובלי פרשנות סמלית. כדאי לדרג קודם בעצמך, כדי שההשוואה תהיה עצמאית.
                </p>
                {!final && (
                  <button type="button" className="btn btn-primary" style={{ justifySelf: 'start' }} onClick={runAi} disabled={aiBusy} data-testid="run-ai">
                    {aiBusy ? 'מנתח, עד דקה' : 'הפקת טיוטת דירוג'}
                  </button>
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="label" style={{ textTransform: 'none' }}>תיאור צורני</div>
                  <p style={{ margin: '4px 0 0' }}>{a.ai_draft.formal_description}</p>
                </div>
                <div>
                  <div className="label" style={{ textTransform: 'none' }}>קריאת התהליך</div>
                  <p style={{ margin: '4px 0 0' }}>{a.ai_draft.process_reading}</p>
                </div>
                <div>
                  <div className="label" style={{ textTransform: 'none' }}>שאלות לשיחה</div>
                  <ul style={{ margin: '4px 0 0', paddingInlineStart: 20 }}>{a.ai_draft.conversation_questions.map((q) => <li key={q}>{q}</li>)}</ul>
                </div>
                <div>
                  <div className="label" style={{ textTransform: 'none' }}>מגבלות</div>
                  <ul style={{ margin: '4px 0 0', paddingInlineStart: 20 }} className="muted">{a.ai_draft.limitations.map((q) => <li key={q}>{q}</li>)}</ul>
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }} dir="ltr">{a.ai_model} · {a.ai_at && new Date(a.ai_at).toLocaleString('he-IL')}</p>
              </>
            )}
          </div>

          {agr && (
            <div className="panel stack" style={{ gap: 8 }} data-testid="agreement">
              <div className="label">הסכמה בהערכה הזו</div>
              <div className="process-grid">
                <div className="metric"><b>{pairs.filter(([x, y]) => x === y).length}/{pairs.length}</b><span>הסכמה מלאה</span></div>
                <div className="metric"><b>{pairs.filter(([x, y]) => Math.abs(x - y) <= 1).length}/{pairs.length}</b><span>בטווח נקודה</span></div>
              </div>
              <Link to="/assessment" className="muted" style={{ fontSize: 13 }}>המהימנות המצטברת בכל ההערכות</Link>
            </div>
          )}
        </section>
      </div>

      <h2 style={{ fontSize: 30 }}>שכבה 3 · הדירוג שלך</h2>
      <div className="feats-table" data-testid="feats-table">
        {items.map((f) => {
          const ai = aiById.get(f.id)
          const mine = ratings[f.id]
          const proxy = a.computed?.proxies[f.id as 'space' | 'prominence_of_color']
          return (
            <div key={f.id} className={`feats-row ${mine === null ? 'na' : ''}`}>
              <div>
                <div className="feats-name">{f.he} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }} dir="ltr">{f.en}</span></div>
                <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>{f.question}</div>
                <div className="feats-anchors"><span>0: {f.low}</span><span>5: {f.high}</span></div>
              </div>
              <div className="feats-ai">
                {ai ? (
                  ai.applicable ? (
                    <>
                      <span className="row" style={{ gap: 8 }}>
                        <span className="score-badge" title="טיוטת הדירוג">{ai.score}</span>
                        <span className="label" style={{ textTransform: 'none' }}>טיוטה · {CONF[ai.confidence]}</span>
                        {mine !== undefined && mine !== null && mine !== ai.score && <span className="label" style={{ color: 'var(--terracotta)', textTransform: 'none' }}>הפרש {Math.abs(mine - ai.score)}</span>}
                      </span>
                      <span>{ai.rationale}</span>
                    </>
                  ) : (
                    <span className="muted">לפי הטיוטה: לא ניתן לדרג בעבודה הזו. {ai.rationale}</span>
                  )
                ) : (
                  <span className="muted">אין טיוטה.</span>
                )}
                {proxy !== undefined && <span className="muted" style={{ fontSize: 13 }}>קירוב ממוחשב: {proxy}</span>}
              </div>
              <div className="score-buttons" role="group" aria-label={`דירוג ${f.he}`}>
                {SCALE.map((v) => (
                  <button key={v} type="button" className="score-btn" aria-pressed={mine === v} disabled={final} onClick={() => setScore(f.id, v)} data-testid={`rate-${f.id}-${v}`}>
                    {v}
                  </button>
                ))}
                <button type="button" className="score-btn na-btn" aria-pressed={mine === null} disabled={final} onClick={() => setScore(f.id, null)}>
                  לא ניתן לדרג
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <section className="panel stack" style={{ marginTop: 'var(--s4)' }}>
        <label className="field">
          <span>הערות המטפלת: התנהגות בזמן הציור, מה נאמר בסיום</span>
          <textarea className="textarea" value={notes} disabled={final} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="row">
          {!final && (
            <>
              <button type="button" className="btn" onClick={() => save(false)} data-testid="save-draft">שמירת טיוטה</button>
              <button type="button" className="btn btn-primary" onClick={() => save(true)} data-testid="sign">חתימה על הדירוג</button>
              <span className="muted" style={{ fontSize: 14 }}>{items.length - missing.length}/{items.length} סולמות דורגו</span>
            </>
          )}
          {final && <span className="label">נחתם {a.finalized_at && new Date(a.finalized_at).toLocaleString('he-IL')}</span>}
          <span className="label" aria-live="polite">{status}</span>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
      </section>
    </div>
  )
}

export default function AssessmentDetail() {
  return (
    <RequireAuth title="הערכה מובנית">
      <DetailInner />
    </RequireAuth>
  )
}
