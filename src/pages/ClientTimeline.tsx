import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageHeader } from '../components/PageHeader'
import { RequireAuth } from '../components/RequireAuth'
import { ETC_LEVELS } from '../content/etc'
import { goalById } from '../content/goals'
import { techniqueById } from '../content/techniques'
import { deleteClient, getClient, listClientSessions, signedUrls, type Client, type SessionRow } from '../logic/data'
import { HomeChannel } from '../components/HomeChannel'
import { AssessmentsSection } from '../components/AssessmentsSection'
import './ClientTimeline.css'

function TimelineInner() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([getClient(id), listClientSessions(id)])
      .then(async ([c, s]) => {
        setClient(c)
        setSessions(s)
        setUrls(await signedUrls(s.flatMap((x) => (x.tipul_artworks ?? []).map((a) => a.storage_path))))
      })
      .catch((e) => setErr(e.message))
  }, [id])

  if (err) return <div className="page"><p className="error">{err}</p></div>
  if (!client) return <div className="page"><p className="label">טוען</p></div>

  const remove = async () => {
    if (!confirm(`למחוק את ${client.code} ואת כל המפגשים שלו/ה? הפעולה אינה הפיכה.`)) return
    await deleteClient(client.id)
    nav('/clients')
  }

  return (
    <div className="page">
      <Link to="/clients" className="label" style={{ textDecoration: 'none' }}>מטופלים /</Link>
      <PageHeader kicker={[client.population, client.goals].filter(Boolean).join(' · ') || 'ציר זמן'} title={client.code}>
        {`**${sessions.length} מפגשים.** כל נקודה היא מפגש, וכל משבצת צבעונית היא רמת ETC שנצפתה בו.`}
      </PageHeader>

      <div className="row" style={{ marginBottom: 'var(--s4)' }}>
        <Link className="btn btn-primary" to={`/plan?client=${client.id}`}>מפגש חדש</Link>
        <button type="button" className="btn btn-quiet" onClick={remove}>מחיקת מטופל/ת</button>
      </div>

      <AssessmentsSection clientId={client.id} />

      <HomeChannel clientId={client.id} />

      {!!sessions.length && (
        <section className="panel etc-strip" aria-label="תצפיות לפי רמה לאורך המפגשים">
          <div className="label">תצפיות לאורך זמן</div>
          <div className="strip-scroll">
            {ETC_LEVELS.map((lvl) => (
              <div className="strip-row" key={lvl.id}>
                <span className="strip-name">{lvl.label}</span>
                <div className="strip-cells" style={{ gridTemplateColumns: `repeat(${sessions.length}, 22px)` }}>
                  {sessions.map((s, i) => {
                    const on = s.tipul_observations?.some((o) => o.etc_level === lvl.id)
                    return (
                      <motion.span
                        key={s.id}
                        className="strip-cell"
                        title={`מפגש ${i + 1}`}
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        style={{ background: on ? lvl.color : 'transparent' }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!sessions.length && <p className="notice">אין עדיין מפגשים. מפגש ראשון נוצר במתכנן.</p>}

      <ol className="timeline">
        {sessions.map((s, i) => {
          const t = techniqueById(s.technique_id)
          const date = s.held_at ?? s.planned_at
          return (
            <motion.li key={s.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, duration: 0.5 }}>
              <span className="tl-dot" style={{ background: s.held_at ? 'var(--terracotta)' : 'var(--paper)' }} />
              <Link to={`/sessions/${s.id}`} className="panel tl-card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="label">
                    {String(i + 1).padStart(2, '0')} · {date ? new Date(date).toLocaleDateString('he-IL') : 'ללא תאריך'} · {s.held_at ? 'התקיים' : 'מתוכנן'}
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    {ETC_LEVELS.filter((l) => s.tipul_observations?.some((o) => o.etc_level === l.id)).map((l) => (
                      <span key={l.id} className="etc-mark" style={{ background: l.color }} title={l.label} />
                    ))}
                  </span>
                </div>
                <h3 style={{ margin: '6px 0' }}>{t?.nameHe ?? 'ללא טכניקה'}</h3>
                {s.goal && <p className="muted" style={{ margin: 0 }}>מטרה: {goalById(s.goal)?.label}</p>}
                {s.session_notes && <p style={{ margin: '6px 0 0' }}>{s.session_notes.slice(0, 180)}</p>}
                {!!s.tipul_artworks?.length && (
                  <div className="tl-thumbs">
                    {s.tipul_artworks.map((a) =>
                      urls[a.storage_path] ? <img key={a.id} src={urls[a.storage_path]} alt={a.caption || 'יצירה'} /> : null,
                    )}
                  </div>
                )}
              </Link>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}

export default function ClientTimeline() {
  return (
    <RequireAuth title="ציר זמן">
      <TimelineInner />
    </RequireAuth>
  )
}
