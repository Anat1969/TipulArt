import { useEffect, useState } from 'react'
import { Rich } from '../components/Rich'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { EVIDENCE_LABELS, techniqueById } from '../content/techniques'
import { etcById } from '../content/etc'
import { goalById } from '../content/goals'
import { useAuth } from '../logic/auth'
import { listPractice, setPractice } from '../logic/data'

export default function Technique() {
  const { id } = useParams()
  const t = techniqueById(id)
  const { session } = useAuth()
  const [done, setDone] = useState<string[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (session) listPractice().then(setDone).catch(() => {})
  }, [session])

  if (!t)
    return (
      <div className="page">
        <h1>הטכניקה לא נמצאה</h1>
        <Link className="btn" to="/library">חזרה לספרייה</Link>
      </div>
    )

  const toggle = async (exId: string) => {
    setErr('')
    const now = !done.includes(exId)
    setDone((d) => (now ? [...d, exId] : d.filter((x) => x !== exId)))
    try {
      await setPractice(exId, now)
    } catch (e) {
      setErr((e as Error).message)
      setDone((d) => (now ? d.filter((x) => x !== exId) : [...d, exId]))
    }
  }

  const ev = EVIDENCE_LABELS[t.evidence]

  return (
    <div className="page">
      <Link to="/library" className="label" style={{ textDecoration: 'none' }}>ספרייה /</Link>
      <PageHeader kicker={`${t.approach} · ${t.founder}`} title={t.nameHe}>
        {t.description}
      </PageHeader>

      <div className="grid grid-3" style={{ marginBottom: 'var(--s5)' }}>
        <div className="panel">
          <div className="label">רמת ETC</div>
          {t.etc.map((e) => (
            <p key={e} className="value" style={{ margin: '8px 0 0' }}>
              <span className="etc-mark" style={{ background: etcById(e)?.color, marginInlineEnd: 8 }} />
              {etcById(e)?.label}
            </p>
          ))}
        </div>
        <div className="panel">
          <div className="label">אוכלוסיות ומטרות</div>
          <p className="value" style={{ margin: '8px 0 0' }}>{t.populations.join(', ')}</p>
          <p className="muted" style={{ margin: '4px 0 0' }}>{t.goals.map((g) => goalById(g)?.label).join(', ')}</p>
        </div>
        <div className="panel" style={{ borderTop: '3px solid var(--ochre)' }}>
          <div className="label">רמת ראיות</div>
          <p className="value" style={{ margin: '8px 0 4px' }}>{ev.label}</p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>{ev.note}</p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="panel stack">
          <h2 style={{ fontSize: 30 }}>שאלות לתהליך</h2>
          <ol style={{ margin: 0, paddingInlineStart: 20 }}>
            {t.processQuestions.map((q) => <li key={q} style={{ marginBottom: 6 }}>{q}</li>)}
          </ol>
          <h3 style={{ marginTop: 'var(--s3)' }}>ראיות ומקורות</h3>
          <p style={{ margin: 0 }}><Rich text={t.evidenceNote} nums /></p>
          <ul style={{ margin: 0, paddingInlineStart: 20 }} className="muted">
            {t.sources.map((s) => <li key={s} dir="ltr" style={{ textAlign: 'right' }}>{s}</li>)}
          </ul>
          <Link to="/evidence" className="btn btn-sm" style={{ justifySelf: 'start' }}>כל הראיות</Link>
        </section>

        <section className="stack">
          {t.exercises.map((ex) => {
            const isDone = done.includes(ex.id)
            return (
              <article key={ex.id} className="panel stack" style={{ borderInlineStart: '3px solid var(--terracotta)' }}>
                <div className="label kicker">תרגיל לתרגול אישי · {ex.durationMin} דקות</div>
                <h3 style={{ margin: 0 }}>{ex.title}</h3>
                <p style={{ margin: 0 }}>{ex.instructions}</p>
                <div>
                  <div className="label">חומרים</div>
                  <p className="value" style={{ margin: '4px 0 0', fontSize: 16 }}>{ex.materials.join(', ')}</p>
                </div>
                <div>
                  <div className="label">מה לשים לב אליו</div>
                  <p style={{ margin: '4px 0 0' }}>{ex.observeFor}</p>
                </div>
                <div className="row">
                  {session ? (
                    <button type="button" className={`btn ${isDone ? 'btn-primary' : ''}`} aria-pressed={isDone} onClick={() => toggle(ex.id)} data-testid="practice">
                      {isDone ? 'תרגלתי' : 'סימון: תרגלתי'}
                    </button>
                  ) : (
                    <Link className="btn" to="/login">כניסה כדי לסמן תרגול</Link>
                  )}
                  <Link className="btn" to={`/studio?exercise=${ex.id}`} data-testid="practice-studio">תרגול בסטודיו</Link>
                  <Link className="btn btn-primary" to={`/plan?technique=${t.id}`}>תכנון מפגש עם הטכניקה</Link>
                </div>
                {err && <p className="error">{err}</p>}
              </article>
            )
          })}
        </section>
      </div>
    </div>
  )
}
