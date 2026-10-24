import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageHeader } from '../components/PageHeader'
import { RequireAuth } from '../components/RequireAuth'
import { POPULATIONS } from '../content/techniques'
import { createClient, listClients, listRecentSessions, type SessionRow } from '../logic/data'
import { techniqueById } from '../content/techniques'

export const CODE_HINT = 'קוד בלבד, למשל מ-014. בלי שם, ת.ז. או פרטי קשר.'

function ClientsInner() {
  const [clients, setClients] = useState<Awaited<ReturnType<typeof listClients>>>([])
  const [recent, setRecent] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [population, setPopulation] = useState('')
  const [goals, setGoals] = useState('')
  const [err, setErr] = useState('')

  const load = () =>
    Promise.all([listClients(), listRecentSessions(6)])
      .then(([c, r]) => {
        setClients(c)
        setRecent(r)
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    try {
      await createClient({ code: code.trim(), population: population || undefined, goals: goals.trim() || undefined })
      setCode('')
      setGoals('')
      setPopulation('')
      load()
    } catch (e) {
      const m = (e as Error).message
      setErr(m.includes('duplicate') ? 'הקוד הזה כבר קיים.' : m)
    }
  }

  return (
    <div className="page">
      <PageHeader kicker="יומן" title="מטופלים">
        כל מטופל/ת מזוהה **בקוד בלבד**. בוחרים קוד כדי לראות את ציר הזמן: מפגשים, תמונות ותצפיות.
      </PageHeader>

      <div className="grid grid-2">
        <section className="stack">
          {loading && <p className="label">טוען</p>}
          {!loading && !clients.length && <p className="notice">עדיין אין מטופלים. הוספת קוד ראשון נעשית בטופס.</p>}
          {clients.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Link to={`/clients/${c.id}`} className="panel" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, textDecoration: 'none', alignItems: 'center' }}>
                <span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20 }}>{c.code}</span>
                  <span className="muted" style={{ display: 'block', fontSize: 14 }}>{[c.population, c.goals].filter(Boolean).join(' · ') || 'ללא פרטים נוספים'}</span>
                </span>
                <span className="label">{c.tipul_sessions?.[0]?.count ?? 0} מפגשים</span>
              </Link>
            </motion.div>
          ))}
        </section>

        <section className="stack">
          <form className="panel stack" onSubmit={add}>
            <h2 style={{ fontSize: 28, margin: 0 }}>מטופל/ת חדש/ה</h2>
            <label className="field">
              <span>קוד</span>
              <input className="input" required maxLength={24} value={code} onChange={(e) => setCode(e.target.value)} placeholder="מ-014" />
              <small className="muted">{CODE_HINT}</small>
            </label>
            <label className="field">
              <span>אוכלוסייה</span>
              <select className="select" value={population} onChange={(e) => setPopulation(e.target.value)}>
                <option value="">לא צוין</option>
                {POPULATIONS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="field">
              <span>מטרות בניסוח כללי</span>
              <input className="input" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="למשל: ויסות, ביטוי" />
            </label>
            <button className="btn btn-primary" type="submit">הוספה</button>
            {err && <p className="error" role="alert">{err}</p>}
          </form>

          {!!recent.length && (
            <div className="panel stack" style={{ gap: 8 }}>
              <div className="label">מפגשים אחרונים</div>
              {recent.map((s) => (
                <Link key={s.id} to={`/sessions/${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, textDecoration: 'none', borderBottom: '1px solid var(--line)', padding: '6px 0' }}>
                  <span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{s.tipul_clients?.code}</span> · {techniqueById(s.technique_id)?.nameHe ?? 'ללא טכניקה'}
                  </span>
                  <span className="muted" style={{ fontSize: 14 }}>{s.planned_at ? new Date(s.planned_at).toLocaleDateString('he-IL') : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default function Clients() {
  return (
    <RequireAuth title="מטופלים">
      <ClientsInner />
    </RequireAuth>
  )
}
