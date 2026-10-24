import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { RequireAuth } from '../components/RequireAuth'
import { GOALS, type GoalId } from '../content/goals'
import { EVIDENCE_LABELS, TECHNIQUES, techniqueById } from '../content/techniques'
import { etcById } from '../content/etc'
import { createClient, createSession, listClients, type Client } from '../logic/data'
import { CODE_HINT } from './Clients'

function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function planText(techId: string) {
  const t = techniqueById(techId)
  if (!t) return ''
  const ex = t.exercises[0]
  return [
    ex ? `תרגיל: ${ex.title}` : '',
    ex ? `הנחיה: ${ex.instructions}` : '',
    ex ? `חומרים: ${ex.materials.join(', ')}` : '',
    'שאלות לתהליך:',
    ...t.processQuestions.map((q) => `- ${q}`),
  ]
    .filter(Boolean)
    .join('\n')
}

function PlannerInner() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState(params.get('client') ?? '')
  const [newCode, setNewCode] = useState('')
  const [goal, setGoal] = useState<GoalId | ''>((params.get('goal') as GoalId) ?? '')
  const [techId, setTechId] = useState(params.get('technique') ?? '')
  const [when, setWhen] = useState(localNow())
  const [duration, setDuration] = useState<number>(45)
  const [notes, setNotes] = useState(() => planText(params.get('technique') ?? ''))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listClients().then((c) => setClients(c)).catch((e) => setErr(e.message))
  }, [])

  const client = clients.find((c) => c.id === clientId)
  const suggestions = useMemo(() => {
    return [...TECHNIQUES]
      .map((t) => ({
        t,
        score: (goal && t.goals.includes(goal) ? 2 : 0) + (client?.population && t.populations.includes(client.population) ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
  }, [goal, client])

  const pickTech = (id: string) => {
    setTechId(id)
    setNotes(planText(id))
    const ex = techniqueById(id)?.exercises[0]
    if (ex) setDuration(Math.max(30, ex.durationMin + 20))
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      let cid = clientId
      if (!cid) {
        if (!newCode.trim()) throw new Error('יש לבחור מטופל/ת או להזין קוד חדש.')
        const c = await createClient({ code: newCode.trim() })
        cid = c.id
      }
      const s = await createSession({
        client_id: cid,
        technique_id: techId || null,
        goal: goal || null,
        planned_at: when ? new Date(when).toISOString() : null,
        duration_min: duration || null,
        plan_notes: notes || null,
      })
      nav(`/sessions/${s.id}`)
    } catch (e) {
      const m = (e as Error).message
      setErr(m.includes('duplicate') ? 'הקוד הזה כבר קיים. אפשר לבחור אותו מהרשימה.' : m)
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader kicker="יישום" title="מתכנן מפגש">
        ארבעה צעדים: מטופל/ת, מטרה, טכניקה ופרטים. התוכנית נכתבת מתוך התרגיל ואפשר לערוך אותה.
      </PageHeader>

      <form className="stack" onSubmit={save} style={{ gap: 'var(--s4)' }}>
        <section className="panel stack">
          <div className="label">1 · מטופל/ת</div>
          <div className="grid grid-2">
            <label className="field">
              <span>קוד קיים</span>
              <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} data-testid="client-select">
                <option value="">בחירה</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.code}{c.population ? ` · ${c.population}` : ''}</option>
                ))}
              </select>
            </label>
            {!clientId && (
              <label className="field">
                <span>או קוד חדש</span>
                <input className="input" maxLength={24} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="מ-015" />
                <small className="muted">{CODE_HINT}</small>
              </label>
            )}
          </div>
        </section>

        <section className="panel stack">
          <div className="label">2 · מטרה</div>
          <div className="row">
            {GOALS.map((g) => (
              <button key={g.id} type="button" className="chip" aria-pressed={goal === g.id} onClick={() => setGoal(goal === g.id ? '' : g.id)}>
                {g.label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <div className="label">3 · טכניקה {goal || client?.population ? '· מסודר לפי התאמה' : ''}</div>
          <div className="grid grid-2" style={{ gap: 'var(--s2)' }}>
            {suggestions.map(({ t, score }) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTech(t.id)}
                aria-pressed={techId === t.id}
                className="pick"
                data-testid={`pick-${t.id}`}
                style={{
                  textAlign: 'start',
                  padding: '12px 14px',
                  border: `1px solid ${techId === t.id ? 'var(--charcoal)' : 'var(--line-strong)'}`,
                  background: techId === t.id ? 'var(--charcoal)' : 'var(--surface-solid)',
                  color: techId === t.id ? 'var(--paper)' : 'var(--ink)',
                  cursor: 'pointer',
                  font: 'inherit',
                  boxShadow: 'var(--shadow-1)',
                  display: 'grid',
                  gap: 4,
                }}
              >
                <span style={{ fontWeight: 500 }}>{t.nameHe}</span>
                <span style={{ fontSize: 13, opacity: 0.8 }}>
                  {t.etc.map((e) => etcById(e)?.label).join(', ')} · {EVIDENCE_LABELS[t.evidence].label}
                  {score >= 2 ? ' · מתאים למטרה' : ''}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <div className="label">4 · פרטים</div>
          <div className="grid grid-2">
            <label className="field">
              <span>מועד</span>
              <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </label>
            <label className="field">
              <span>משך בדקות</span>
              <input className="input" type="number" min={5} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </label>
          </div>
          <label className="field">
            <span>תוכנית המפגש</span>
            <textarea className="textarea" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </section>

        <div className="row">
          <button className="btn btn-primary" type="submit" disabled={busy} data-testid="save-plan">
            {busy ? 'נשמר' : 'שמירה ומעבר ליומן המפגש'}
          </button>
          {err && <p className="error" role="alert" style={{ margin: 0 }}>{err}</p>}
        </div>
      </form>
    </div>
  )
}

export default function Planner() {
  return (
    <RequireAuth title="מתכנן מפגש">
      <PlannerInner />
    </RequireAuth>
  )
}
