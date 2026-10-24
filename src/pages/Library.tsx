import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageHeader } from '../components/PageHeader'
import { EVIDENCE_LABELS, POPULATIONS, TECHNIQUES } from '../content/techniques'
import { ETC_LEVELS, etcById } from '../content/etc'
import { GOALS, goalById } from '../content/goals'

// הסינון נשמר בכתובת, כך ש"העתקת קישור" מעתיקה גם אותו.
export default function Library() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const pop = params.get('pop') ?? ''
  const etc = params.get('etc') ?? ''
  const goal = params.get('goal') ?? ''

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (!value || next.get(key) === value) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const list = TECHNIQUES.filter(
    (t) =>
      (!q || `${t.nameHe} ${t.nameEn} ${t.description} ${t.approach}`.toLowerCase().includes(q.toLowerCase())) &&
      (!pop || t.populations.includes(pop)) &&
      (!etc || t.etc.includes(etc as never)) &&
      (!goal || t.goals.includes(goal as never)),
  )

  return (
    <div className="page">
      <PageHeader kicker="ידע" title="ספריית טכניקות">
        גישה, רמה במודל ETC, אוכלוסיות ורמת ראיות לכל טכניקה. לכל טכניקה יש תרגיל שאפשר לתרגל לפני שמציעים אותו.
      </PageHeader>

      <div className="panel stack" style={{ marginBottom: 'var(--s5)' }}>
        <label className="field">
          <span>חיפוש</span>
          <input className="input" value={q} onChange={(e) => set('q', e.target.value)} placeholder="למשל: חימר, מנדלה, Kramer" />
        </label>
        <div className="stack" style={{ gap: 10 }}>
          <div className="label">מטרה</div>
          <div className="row">
            {GOALS.map((g) => (
              <button key={g.id} type="button" className="chip" aria-pressed={goal === g.id} onClick={() => set('goal', g.id)}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="label">אוכלוסייה</div>
          <div className="row">
            {POPULATIONS.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={pop === p} onClick={() => set('pop', p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="label">רמת ETC</div>
          <div className="row">
            {ETC_LEVELS.map((l) => (
              <button key={l.id} type="button" className="chip" aria-pressed={etc === l.id} onClick={() => set('etc', l.id)}>
                <span className="etc-mark" style={{ background: l.color, marginInlineEnd: 8 }} />
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {(q || pop || etc || goal) && (
          <div>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => setParams({}, { replace: true })}>
              ניקוי סינון
            </button>
          </div>
        )}
      </div>

      <p className="label" aria-live="polite">{list.length} טכניקות</p>
      <div className="grid grid-2">
        {list.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link to={`/library/${t.id}`} className="panel technique-card" style={{ display: 'grid', gap: 8, textDecoration: 'none', height: '100%' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label">{t.approach}</span>
                <span className="label">{EVIDENCE_LABELS[t.evidence].label}</span>
              </div>
              <h3 style={{ margin: 0 }}>{t.nameHe}</h3>
              <span className="muted" style={{ fontSize: 14 }}>{t.nameEn} · {t.founder}</span>
              <p style={{ margin: 0, color: 'var(--ink-2)' }}>{t.description}</p>
              <div className="row">
                {t.etc.map((e) => (
                  <span key={e} className="label" style={{ textTransform: 'none' }}>
                    <span className="etc-mark" style={{ background: etcById(e)?.color, marginInlineEnd: 6 }} />
                    {etcById(e)?.label}
                  </span>
                ))}
                {t.goals.map((g) => (
                  <span key={g} className="label" style={{ textTransform: 'none' }}>· {goalById(g)?.label}</span>
                ))}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      {!list.length && <p className="notice">אין טכניקה שמתאימה לכל הסינונים יחד. כדאי להסיר סינון אחד.</p>}
    </div>
  )
}
