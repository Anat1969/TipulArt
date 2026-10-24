import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { RequireAuth } from '../../components/RequireAuth'
import { ProcessView } from '../../studio/ProcessView'
import { QUADRANT_LABELS } from '../../studio/analyzeImage'
import { FEATS, PPAT, SCALE, agreement, type Ratings } from '../../content/feats'
import { getAssessment, getClient, requestAiDraft, saveAssessment, signedUrls, type Assessment, type Client } from '../../logic/data'
import { Rich } from '../../components/Rich'
import { AutoReport } from '../../assessment/AutoReport'
import { METHODS, autoPairs, runAuto, type MethodId } from '../../assessment/auto'
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
  const [method, setMethod] = useState<MethodId>('feats')
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
  const auto = a.computed?.auto
  const lead = a.computed?.autoLead
  const autoShown = Boolean(auto?.feats)
  const aPairs = autoPairs(auto?.feats, ratings)
  const autoAgr = agreement(aPairs)
  const autoById = new Map((auto?.feats?.items ?? []).map((i) => [i.id, i]))

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

  // הערכה אוטומטית: המכשיר מוביל (מיד) או המטפלת מובילה (נפתחת אחרי שכל הסולמות דורגו)
  const startAuto = async (who: 'machine' | 'therapist', compute: boolean) => {
    if (!a.computed) return
    setErr('')
    try {
      const computed = {
        ...a.computed,
        autoLead: a.computed.autoLead ?? who,
        ...(compute ? { auto: { feats: runAuto('feats', a.computed, a.process, ppat), etc: runAuto('etc', a.computed, a.process) } } : {}),
      }
      await saveAssessment(a.id, { computed, ...(compute && who === 'therapist' ? { ratings } : {}) })
      setA({ ...a, computed, ...(compute && who === 'therapist' ? { ratings } : {}) })
    } catch (e) {
      setErr((e as Error).message)
    }
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
        שלוש שכבות: מדידה ממוחשבת, **הערכה אוטומטית עם הסבר לכל פרמטר**, ודירוג שלך. ==המכשיר ואת משווים הערכות==, ורק הדירוג שלך נחתם ונכנס לציר הזמן.
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
          <div className="panel stack" data-testid="auto-panel">
            <div className="label">שכבה 2 · הערכה אוטומטית</div>
            {!a.computed ? (
              <p className="muted" style={{ margin: 0 }}>אין מדידה ממוחשבת להערכה הזו.</p>
            ) : !autoShown && lead !== 'therapist' ? (
              <>
                <p style={{ margin: 0 }}>
                  <Rich text="המנוע מדרג כל סולם מתוך המדידות של התמונה והתהליך, ומסביר לכל ציון **מה נמדד, איך חושב ומה המגבלה.** ==בחרי מי מוביל:== המכשיר נותן בסיס ואת בוחנת אותו, או שאת מדרגת קודם וההערכה האוטומטית נפתחת להשוואה." />
                </p>
                {!final && (
                  <div className="lead-choice">
                    <button type="button" className="btn btn-primary" onClick={() => startAuto('machine', true)} data-testid="run-auto">
                      הערכה אוטומטית עכשיו
                      <span>המכשיר מוביל. את בוחנת, מסכימה או משנה.</span>
                    </button>
                    <button type="button" className="btn" onClick={() => startAuto('therapist', false)} data-testid="lead-therapist">
                      קודם אני מדרגת
                      <span>את מובילה. ההשוואה נפתחת אחרי שכל הסולמות דורגו.</span>
                    </button>
                  </div>
                )}
              </>
            ) : !autoShown ? (
              <>
                <p style={{ margin: 0 }}>
                  <Rich text={`**את מובילה.** ההערכה האוטומטית מחכה עד שתדרגי את כל הסולמות, כדי שהדירוג שלך יהיה עצמאי. ${items.length - missing.length}/${items.length} דורגו.`} nums />
                </p>
                <button type="button" className="btn btn-primary" style={{ justifySelf: 'start' }} disabled={missing.length > 0} onClick={() => startAuto('therapist', true)} data-testid="reveal-auto">
                  השוואה להערכה האוטומטית
                </button>
              </>
            ) : (
              <>
                <div className="row" role="tablist" aria-label="שיטה">
                  {METHODS.map((m) => (
                    <button key={m.id} type="button" role="tab" aria-selected={method === m.id} className={`btn btn-sm ${method === m.id ? 'btn-primary' : ''}`} onClick={() => setMethod(m.id)} data-testid={`method-${m.id}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>{METHODS.find((m) => m.id === method)!.what} {lead === 'therapist' ? 'הובלת: דירגת לפני שראית.' : 'המכשיר הוביל.'}</p>
                {auto?.[method] && <AutoReport result={auto[method]!} therapist={method === 'feats' ? ratings : null} />}
              </>
            )}
          </div>

          <div className="panel stack" data-testid="ai-panel">
            <div className="label">קריאה נוספת · טיוטת Claude</div>
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

          {(agr || autoAgr) && (
            <div className="panel stack" style={{ gap: 8 }} data-testid="agreement">
              <div className="label">הסכמה בהערכה הזו</div>
              <div className="process-grid">
                {autoAgr && (
                  <>
                    <div className="metric"><b>{aPairs.filter(([x, y]) => x === y).length}/{aPairs.length}</b><span>מכשיר: הסכמה מלאה</span></div>
                    <div className="metric"><b>{aPairs.filter(([x, y]) => Math.abs(x - y) <= 1).length}/{aPairs.length}</b><span>מכשיר: בטווח נקודה</span></div>
                  </>
                )}
                {agr && (
                  <>
                    <div className="metric"><b>{pairs.filter(([x, y]) => x === y).length}/{pairs.length}</b><span>Claude: הסכמה מלאה</span></div>
                    <div className="metric"><b>{pairs.filter(([x, y]) => Math.abs(x - y) <= 1).length}/{pairs.length}</b><span>Claude: בטווח נקודה</span></div>
                  </>
                )}
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
                ) : null}
                {autoShown ? (
                  autoById.get(f.id)?.score !== null && autoById.get(f.id) ? (
                    <span className="row" style={{ gap: 8 }} data-testid={`auto-row-${f.id}`}>
                      <span className="score-badge" title="הערכה אוטומטית">{autoById.get(f.id)!.score}</span>
                      <span className="label" style={{ textTransform: 'none' }}>אוטומטי</span>
                      {mine !== undefined && mine !== null && mine !== autoById.get(f.id)!.score && <span className="label" style={{ color: 'var(--terracotta)', textTransform: 'none' }}>הפרש {Math.abs(mine - (autoById.get(f.id)!.score as number))}</span>}
                    </span>
                  ) : (
                    <span className="muted" style={{ fontSize: 13 }}>אוטומטי: לא נמדד, נשאר לך.</span>
                  )
                ) : (
                  proxy !== undefined && lead !== 'therapist' && <span className="muted" style={{ fontSize: 13 }}>קירוב ממוחשב: {proxy}</span>
                )}
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
