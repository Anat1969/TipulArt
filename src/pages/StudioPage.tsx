import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Studio, type StudioResult } from '../studio/Studio'
import { ProcessView } from '../studio/ProcessView'
import { ALL_EXERCISES, techniqueById } from '../content/techniques'
import { useAuth } from '../logic/auth'
import { uploadArtworkBlob } from '../logic/data'

// סטודיו פתוח: מטפלת מתרגלת בעצמה, או יוצרת בתוך מפגש ושומרת ליומן.
export default function StudioPage() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { session } = useAuth()
  const exercise = ALL_EXERCISES.find((e) => e.id === params.get('exercise'))
  const technique = techniqueById(exercise?.techniqueId)
  const sessionId = params.get('session')
  const [result, setResult] = useState<StudioResult | null>(null)
  const [round, setRound] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const saveToSession = async () => {
    if (!result || !sessionId) return
    setBusy(true)
    setErr('')
    try {
      await uploadArtworkBlob(sessionId, result.blob, exercise?.title ?? 'יצירה בסטודיו', result.process)
      nav(`/sessions/${sessionId}`)
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <PageHeader kicker="התנסות" title="סטודיו">
        ציור בחומרים של מודל ETC: פחם נשלט, צבע רטוב שמתפשט, מריחה כמו בחימר. הסטודיו רושם את התהליך, ובסוף מוצגת תמונת
        התהליך עם אפשרות לצפות בו מההתחלה.
      </PageHeader>

      {exercise && (
        <section className="panel stack" style={{ marginBottom: 'var(--s4)', borderInlineStart: '3px solid var(--terracotta)' }}>
          <div className="label">{technique?.nameHe} · {exercise.durationMin} דקות</div>
          <h2 style={{ fontSize: 28, margin: 0 }}>{exercise.title}</h2>
          <p style={{ margin: 0 }}>{exercise.instructions}</p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>מה לשים לב אליו: {exercise.observeFor}</p>
        </section>
      )}

      {!result ? (
        <Studio key={round} onFinish={setResult} />
      ) : (
        <div className="grid grid-2">
          <section className="panel stack">
            <div className="label">היצירה</div>
            <img src={result.dataUrl} alt="היצירה מהסטודיו" style={{ width: '100%', boxShadow: 'var(--shadow-2)' }} />
            <div className="row">
              {sessionId && session && (
                <button type="button" className="btn btn-primary" onClick={saveToSession} disabled={busy} data-testid="save-studio">
                  {busy ? 'נשמר' : 'שמירה ליומן המפגש'}
                </button>
              )}
              <a className="btn" href={result.dataUrl} download="tipulart-studio.jpg">הורדת התמונה</a>
              <button type="button" className="btn btn-quiet" onClick={() => { setResult(null); setRound((r) => r + 1) }}>
                יצירה חדשה
              </button>
            </div>
            {err && <p className="error" role="alert">{err}</p>}
            {!sessionId && (
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                תרגול אישי לא נשמר במערכת. כדי לשמור יצירה ליומן, פותחים את הסטודיו מתוך מפגש.{' '}
                <Link to="/clients">למטופלים</Link>
              </p>
            )}
          </section>
          <section className="panel">
            <ProcessView process={result.process} />
          </section>
        </div>
      )}
    </div>
  )
}
