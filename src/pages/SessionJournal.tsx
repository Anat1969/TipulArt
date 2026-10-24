import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { RequireAuth } from '../components/RequireAuth'
import { ETC_LEVELS, etcById, type EtcLevel } from '../content/etc'
import { goalById } from '../content/goals'
import { techniqueById } from '../content/techniques'
import { ProcessView } from '../studio/ProcessView'
import {
  addObservation,
  deleteArtwork,
  deleteObservation,
  deleteSession,
  getSession,
  signedUrls,
  updateSession,
  uploadArtwork,
  type SessionRow,
} from '../logic/data'

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function JournalInner() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [s, setS] = useState<SessionRow | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [heldAt, setHeldAt] = useState('')
  const [drafts, setDrafts] = useState<Partial<Record<EtcLevel, string>>>({})
  const [open, setOpen] = useState<Partial<Record<EtcLevel, boolean>>>({})
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [status, setStatus] = useState('')
  const [err, setErr] = useState('')

  const load = async () => {
    try {
      const row = await getSession(id)
      setS(row)
      setNotes(row.session_notes ?? '')
      setHeldAt(toLocalInput(row.held_at))
      setUrls(await signedUrls((row.tipul_artworks ?? []).map((a) => a.storage_path)))
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  if (err && !s) return <div className="page"><p className="error">{err}</p></div>
  if (!s) return <div className="page"><p className="label">טוען</p></div>

  const t = techniqueById(s.technique_id)
  const flash = (m: string) => {
    setStatus(m)
    setTimeout(() => setStatus(''), 2200)
  }

  const saveAll = async () => {
    setErr('')
    try {
      const held = heldAt ? new Date(heldAt).toISOString() : s.held_at
      await updateSession(s.id, { session_notes: notes || null, held_at: held })
      for (const lvl of ETC_LEVELS) {
        if (open[lvl.id]) await addObservation(s.id, lvl.id, drafts[lvl.id]?.trim() ?? '')
      }
      if (file) {
        await uploadArtwork(s.id, file, caption)
        setFile(null)
        setCaption('')
      }
      setDrafts({})
      setOpen({})
      await load()
      flash('נשמר')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const markHeld = () => setHeldAt(toLocalInput(new Date().toISOString()))

  const removeSession = async () => {
    if (!confirm('למחוק את המפגש, התצפיות והתמונות שלו?')) return
    await deleteSession(s.id)
    nav(`/clients/${s.client_id}`)
  }

  return (
    <div className="page">
      <Link to={`/clients/${s.client_id}`} className="label" style={{ textDecoration: 'none' }}>
        מטופל/ת {s.tipul_clients?.code} /
      </Link>
      <PageHeader kicker={s.planned_at ? new Date(s.planned_at).toLocaleString('he-IL', { dateStyle: 'full', timeStyle: 'short' }) : 'מפגש'} title={t?.nameHe ?? 'מפגש ללא טכניקה'}>
        {[goalById(s.goal)?.label && `מטרה: ${goalById(s.goal)?.label}`, s.duration_min && `${s.duration_min} דקות`].filter(Boolean).join(' · ')}
      </PageHeader>

      <div className="grid grid-2">
        <section className="stack">
          <div className="panel stack">
            <div className="label">מצב המפגש</div>
            <div className="row">
              <label className="field" style={{ flex: '1 1 220px' }}>
                <span>התקיים בתאריך</span>
                <input className="input" type="datetime-local" value={heldAt} onChange={(e) => setHeldAt(e.target.value)} />
              </label>
              {!heldAt && (
                <button type="button" className="btn" onClick={markHeld} style={{ alignSelf: 'end' }} data-testid="mark-held">
                  התקיים עכשיו
                </button>
              )}
            </div>
            <label className="field">
              <span>הערות מהמפגש</span>
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="session-notes" />
            </label>
          </div>

          <div className="panel stack">
            <div className="label">תמונת היצירה</div>
            <label className="field">
              <span>צילום או קובץ</span>
              <input className="input" type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="artwork-file" />
            </label>
            {file && (
              <label className="field">
                <span>כיתוב, לא חובה</span>
                <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} />
              </label>
            )}
            <small className="muted">התמונה נדחסת לפני העלאה ונשמרת בדלי פרטי. היא נפתחת בקישור זמני בלבד.</small>
            <Link className="btn" style={{ justifySelf: 'start' }} to={`/studio?session=${s.id}${t?.exercises[0] ? `&exercise=${t.exercises[0].id}` : ''}`} data-testid="open-studio">
              יצירה בסטודיו בתוך המפגש
            </Link>
            {!!s.tipul_artworks?.length && (
              <div className="grid grid-2" style={{ gap: 'var(--s2)' }}>
                {s.tipul_artworks.map((a) => (
                  <figure key={a.id} style={{ margin: 0, background: 'var(--paper-2)', boxShadow: 'var(--shadow-1)' }}>
                    {urls[a.storage_path] ? (
                      <img src={urls[a.storage_path]} alt={a.caption || 'יצירה מהמפגש'} style={{ width: '100%', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ aspectRatio: '3/4' }} />
                    )}
                    <figcaption style={{ padding: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                      <span>{a.caption}</span>
                      <button type="button" className="btn btn-sm btn-quiet" onClick={async () => { await deleteArtwork(a); load() }}>הסרה</button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="stack">
          <div className="panel stack">
            <div className="label">תצפית לפי רמות ETC</div>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>מסמנים מה נצפה בתהליך ומוסיפים תיאור חופשי. אין ציון ואין פרשנות אוטומטית.</p>
            {ETC_LEVELS.map((lvl) => (
              <div key={lvl.id} style={{ borderInlineStart: `3px solid ${lvl.color}`, paddingInlineStart: 12 }}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={!!open[lvl.id]}
                  onClick={() => setOpen((o) => ({ ...o, [lvl.id]: !o[lvl.id] }))}
                  data-testid={`etc-${lvl.id}`}
                >
                  {lvl.label}
                </button>
                <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>{lvl.hint}</p>
                {open[lvl.id] && (
                  <textarea
                    className="textarea"
                    style={{ minHeight: 80 }}
                    placeholder="מה נצפה?"
                    value={drafts[lvl.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [lvl.id]: e.target.value }))}
                    data-testid={`etc-notes-${lvl.id}`}
                  />
                )}
              </div>
            ))}
          </div>

          {s.tipul_artworks?.filter((a) => a.process).map((a) => (
            <div key={a.id} className="panel">
              <ProcessView process={a.process!} />
            </div>
          ))}

          {!!s.tipul_observations?.length && (
            <div className="panel stack" style={{ gap: 8 }}>
              <div className="label">תצפיות שנשמרו</div>
              {s.tipul_observations.map((o) => (
                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>
                  <span>
                    <span className="etc-mark" style={{ background: etcById(o.etc_level)?.color, marginInlineEnd: 8 }} />
                    <strong style={{ fontWeight: 500 }}>{etcById(o.etc_level)?.label}</strong>
                    {o.process_notes && <span style={{ display: 'block', color: 'var(--ink-2)' }}>{o.process_notes}</span>}
                  </span>
                  <button type="button" className="btn btn-sm btn-quiet" onClick={async () => { await deleteObservation(o.id); load() }}>הסרה</button>
                </div>
              ))}
            </div>
          )}

          {s.plan_notes && (
            <details className="panel">
              <summary style={{ cursor: 'pointer' }}><span className="label">תוכנית המפגש</span></summary>
              <pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', margin: '10px 0 0' }}>{s.plan_notes}</pre>
            </details>
          )}
        </section>
      </div>

      <div className="row" style={{ marginTop: 'var(--s5)' }}>
        <button type="button" className="btn btn-primary" onClick={saveAll} data-testid="save-journal">שמירת המפגש</button>
        <Link className="btn" to={`/clients/${s.client_id}`}>לציר הזמן</Link>
        <button type="button" className="btn btn-quiet" onClick={removeSession}>מחיקת המפגש</button>
        <span aria-live="polite" className="label">{status}</span>
        {err && <p className="error" role="alert" style={{ margin: 0 }}>{err}</p>}
      </div>
    </div>
  )
}

export default function SessionJournal() {
  return (
    <RequireAuth title="יומן מפגש">
      <JournalInner />
    </RequireAuth>
  )
}
