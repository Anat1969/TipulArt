import { Link, useSearchParams } from 'react-router-dom'
import { Rich } from '../components/Rich'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '../components/PageHeader'
import { GOALS, goalById, type GoalId } from '../content/goals'
import { TECHNIQUES, EVIDENCE_LABELS } from '../content/techniques'
import { ETC_LEVELS } from '../content/etc'

// מפה: מטרה טיפולית ← חומר ← משימה ← רמת ETC.
export default function GoalMap() {
  const [params, setParams] = useSearchParams()
  const goalId = (params.get('goal') as GoalId) || 'regulation'
  const goal = goalById(goalId)!
  const matches = TECHNIQUES.filter((t) => t.goals.includes(goalId))

  return (
    <div className="page">
      <PageHeader kicker="הבנה" title="מפת מטרות">
        בוחרים מטרה טיפולית ורואים אילו חומרים, משימות ורמות ETC מתחברים אליה. ==החיבור הוא הצעה לחשיבה, לא המלצה מבוססת ראיות.==
      </PageHeader>

      <div className="row" role="tablist" aria-label="מטרות" style={{ marginBottom: 'var(--s4)' }}>
        {GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === goalId}
            className={`btn ${g.id === goalId ? 'btn-primary' : ''}`}
            onClick={() => setParams({ goal: g.id }, { replace: true })}
          >
            {g.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={goalId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
          <div className="grid grid-3" style={{ marginBottom: 'var(--s4)' }}>
            <div className="panel">
              <div className="label">מטרה</div>
              <h2 style={{ fontSize: 34, margin: '6px 0' }}>{goal.label}</h2>
              <p style={{ margin: 0, fontSize: 18 }}><Rich text={goal.summary} /></p>
            </div>
            <div className="panel">
              <div className="label">חומרים</div>
              <p className="value" style={{ margin: '8px 0 0', fontSize: 22, fontFamily: 'var(--font-display)' }}>{goal.materials}</p>
            </div>
            <div className="panel">
              <div className="label">רמות ETC שמופיעות</div>
              <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                {ETC_LEVELS.map((l) => {
                  const n = matches.filter((t) => t.etc.includes(l.id)).length
                  return (
                    <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr)', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 14 }}>{l.label}</span>
                      <span style={{ height: 10, background: 'var(--paper-3)', position: 'relative' }}>
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${(n / Math.max(1, matches.length)) * 100}%` }}
                          transition={{ duration: 0.6 }}
                          style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, background: l.color }}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-2">
            {matches.map((t) => (
              <div key={t.id} className="panel stack" style={{ gap: 8 }}>
                <div className="label">{t.approach} · {EVIDENCE_LABELS[t.evidence].label}</div>
                <h3 style={{ margin: 0 }}>{t.nameHe}</h3>
                <p style={{ margin: 0, color: 'var(--ink-2)' }}>{t.exercises[0]?.title}: {t.exercises[0]?.materials.join(', ')}</p>
                <div className="row">
                  <Link className="btn btn-sm" to={`/library/${t.id}`}>לטכניקה</Link>
                  <Link className="btn btn-sm btn-primary" to={`/plan?technique=${t.id}&goal=${goalId}`}>תכנון מפגש</Link>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
