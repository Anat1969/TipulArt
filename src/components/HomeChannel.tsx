import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TECHNIQUES, techniqueById } from '../content/techniques'
import { ProcessView } from '../studio/ProcessView'
import { analyzeImage } from '../studio/analyzeImage'
import { PPAT } from '../content/feats'
import {
  closeHomeLink,
  createHomeLink,
  homeUrl,
  listHomeLinks,
  listHomeSubmissions,
  signedUrls,
  submissionToSession,
  createAssessment,
  markSubmission,
  type HomeLink,
  type HomeSubmission,
} from '../logic/data'

// ערוץ הבית בציר הזמן: שליחת תרגיל, קבלת היצירה ונתוני התהליך, והפיכתם למפגש ביומן.
export function HomeChannel({ clientId }: { clientId: string }) {
  const nav = useNavigate()
  const [links, setLinks] = useState<HomeLink[]>([])
  const [subs, setSubs] = useState<HomeSubmission[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [techId, setTechId] = useState('')
  const [instructions, setInstructions] = useState('')
  const [questions, setQuestions] = useState('')
  const [copied, setCopied] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = async () => {
    try {
      const [l, s] = await Promise.all([listHomeLinks(clientId), listHomeSubmissions(clientId)])
      setLinks(l)
      setSubs(s)
      setUrls(await signedUrls(s.map((x) => x.image_path)))
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  useEffect(() => {
    load()
  }, [clientId])

  const pickTech = (id: string) => {
    setTechId(id)
    if (id === 'ppat') {
      setInstructions(PPAT.directive)
      setQuestions('')
      return
    }
    const t = techniqueById(id)
    const ex = t?.exercises[0]
    if (ex) setInstructions(`${ex.instructions}\nחומרים: ${ex.materials.join(', ')}. משך: כ-${ex.durationMin} דקות.`)
    if (t) setQuestions(t.processQuestions.join('\n'))
  }

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      const t = techniqueById(techId)
      const link = await createHomeLink({
        client_id: clientId,
        task: techId === 'ppat' ? 'ppat' : 'free',
        technique_id: techId && techId !== 'ppat' ? techId : null,
        exercise_id: t?.exercises[0]?.id ?? null,
        instructions: instructions.trim(),
        questions: questions.split('\n').map((q) => q.trim()).filter(Boolean).slice(0, 5),
      })
      await copy(link.token)
      load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(homeUrl(token))
    } catch {
      /* העתקה ידנית מהשדה */
    }
    setCopied(token)
    setTimeout(() => setCopied(''), 2000)
  }

  const toAssessment = async (sub: HomeSubmission) => {
    const link = links.find((l) => l.id === sub.link_id)
    const computed = urls[sub.image_path] ? await analyzeImage(urls[sub.image_path]).catch(() => null) : null
    const a = await createAssessment({
      client_id: sub.client_id,
      instrument: link?.task === 'ppat' ? 'feats_ppat' : 'feats_free',
      mode: sub.process ? 'digital' : 'photo',
      image_path: sub.image_path,
      process: sub.process,
      computed,
      held_at: sub.created_at,
    })
    await markSubmission(sub.id, a.session_id)
    nav(`/assessments/${a.id}`)
  }

  const toSession = async (sub: HomeSubmission) => {
    const id = await submissionToSession(sub, links.find((l) => l.id === sub.link_id))
    nav(`/sessions/${id}`)
  }

  const isOpen = (l: HomeLink) => l.active && new Date(l.expires_at) > new Date()

  return (
    <section className="stack" style={{ marginBottom: 'var(--s5)' }} data-testid="home-channel">
      <h2 style={{ fontSize: 32, margin: 0 }}>תרגול בבית</h2>
      <p className="muted" style={{ margin: 0 }}>
        שולחים תרגיל בקישור אישי. המטופל/ת יוצר/ת בסטודיו, בלי חשבון ובלי פרטים מזהים. היצירה ותמונת התהליך מגיעות לכאן,
        והתצפית והאבחון נעשים על ידך ביומן.
      </p>

      <div className="grid grid-2">
        <form className="panel stack" onSubmit={create}>
          <div className="label">תרגיל חדש</div>
          <label className="field">
            <span>טכניקה</span>
            <select className="select" value={techId} onChange={(e) => pickTech(e.target.value)} data-testid="home-tech">
              <option value="">בחירה</option>
              <option value="ppat">הערכה מובנית: אדם קוטף תפוח מעץ (PPAT)</option>
              {TECHNIQUES.map((t) => <option key={t.id} value={t.id}>{t.nameHe}</option>)}
            </select>
          </label>
          <label className="field">
            <span>ההנחיה שתוצג</span>
            <textarea className="textarea" required value={instructions} onChange={(e) => setInstructions(e.target.value)} data-testid="home-instructions" />
          </label>
          <label className="field">
            <span>שאלות אחרי היצירה, שאלה בכל שורה</span>
            <textarea className="textarea" style={{ minHeight: 80 }} value={questions} onChange={(e) => setQuestions(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit" data-testid="home-create">יצירת קישור והעתקה</button>
          {err && <p className="error" role="alert">{err}</p>}
        </form>

        <div className="panel stack" style={{ gap: 8 }}>
          <div className="label">קישורים שנשלחו</div>
          {!links.length && <p className="muted" style={{ margin: 0 }}>עדיין לא נשלח תרגיל.</p>}
          {links.map((l) => (
            <div key={l.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8, display: 'grid', gap: 6 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>{l.task === 'ppat' ? 'הערכה מובנית PPAT' : techniqueById(l.technique_id)?.nameHe ?? 'תרגיל חופשי'}</span>
                <span className="label">
                  {isOpen(l) ? `פתוח עד ${new Date(l.expires_at).toLocaleDateString('he-IL')}` : 'סגור'} · {subs.filter((s) => s.link_id === l.id).length} יצירות
                </span>
              </div>
              <input className="input" readOnly value={homeUrl(l.token)} dir="ltr" onFocus={(e) => e.currentTarget.select()} style={{ fontSize: 13, minHeight: 36 }} />
              <div className="row">
                <button type="button" className="btn btn-sm" onClick={() => copy(l.token)} data-testid="home-copy">
                  {copied === l.token ? 'הקישור הועתק' : 'העתקת הקישור'}
                </button>
                {isOpen(l) && (
                  <button type="button" className="btn btn-sm btn-quiet" onClick={async () => { await closeHomeLink(l.id); load() }}>
                    סגירת הקישור
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {subs.length > 0 && (
        <div className="stack">
          <div className="label">יצירות שהגיעו מהבית</div>
          {subs.map((s) => (
            <article key={s.id} className="panel" style={{ display: 'grid', gap: 'var(--s3)' }} data-testid="home-submission">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label">{new Date(s.created_at).toLocaleString('he-IL', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {s.session_id ? (
                  <Link className="btn btn-sm" to={`/sessions/${s.session_id}`}>ליומן המפגש</Link>
                ) : (
                  <span className="row">
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => toAssessment(s)} data-testid="to-assessment">
                      הערכה מובנית
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => toSession(s)} data-testid="to-session">
                      מפגש ותצפית
                    </button>
                  </span>
                )}
              </div>
              <div className="grid grid-2">
                <div className="stack" style={{ gap: 8 }}>
                  {urls[s.image_path] && <img src={urls[s.image_path]} alt="יצירה מהבית" style={{ width: '100%', boxShadow: 'var(--shadow-1)' }} />}
                  {(s.reflections ?? []).filter((r) => r.a).map((r) => (
                    <div key={r.q}>
                      <div className="label" style={{ textTransform: 'none' }}>{r.q}</div>
                      <p style={{ margin: '2px 0 0' }}>{r.a}</p>
                    </div>
                  ))}
                </div>
                <div>
                  {s.process && (open === s.id ? (
                    <ProcessView process={s.process} />
                  ) : (
                    <div className="stack">
                      <ProcessView process={s.process} compact />
                      <button type="button" className="btn btn-sm" style={{ justifySelf: 'start' }} onClick={() => setOpen(s.id)}>
                        שחזור התהליך
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
