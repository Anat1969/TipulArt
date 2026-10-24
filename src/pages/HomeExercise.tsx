import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Studio, type StudioResult } from '../studio/Studio'
import { ALL_EXERCISES, techniqueById } from '../content/techniques'
import { getHomeExercise, submitHomeWork, type HomePublic } from '../logic/data'

// דף המטופל/ת בבית. נפתח בקישור אישי, בלי חשבון ובלי פרטים מזהים.
export default function HomeExercise() {
  const { token = '' } = useParams()
  const [ex, setEx] = useState<HomePublic | null | undefined>(undefined)
  const [result, setResult] = useState<StudioResult | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    getHomeExercise(token)
      .then((d) => {
        setEx(d)
        setAnswers((d?.questions ?? []).map(() => ''))
      })
      .catch(() => setEx(null))
  }, [token])

  const exercise = ALL_EXERCISES.find((e) => e.id === ex?.exercise_id)
  const technique = techniqueById(ex?.technique_id)

  const send = async () => {
    if (!result || !ex) return
    setBusy(true)
    setErr('')
    try {
      await submitHomeWork(
        token,
        result.blob,
        result.process,
        ex.questions.map((q, i) => ({ q, a: answers[i]?.trim() ?? '' })),
      )
      setSent(true)
    } catch {
      setErr('השליחה לא הצליחה. אפשר לנסות שוב בעוד רגע.')
      setBusy(false)
    }
  }

  const safety = (
    <p className="notice" style={{ marginTop: 'var(--s5)' }}>
      האפליקציה אינה ערוץ חירום. במצוקה רגשית אפשר לפנות לער"ן בטלפון 1201, בכל שעה. במצב חירום: מד"א 101.
    </p>
  )

  if (ex === undefined) return <div className="page"><p className="label">טוען</p></div>
  if (ex === null)
    return (
      <div className="page">
        <h1>הקישור לא נמצא</h1>
        <p className="lede">כדאי לבדוק עם המטפלת שהקישור הועתק במלואו.</p>
        {safety}
      </div>
    )

  if (sent || (!ex.open && !result))
    return (
      <div className="page">
        <div className="label">תרגול בבית</div>
        <h1>{sent ? 'היצירה נשלחה. תודה.' : 'הקישור כבר לא פעיל'}</h1>
        <p className="lede">
          {sent
            ? 'המטפלת תראה את היצירה ואת הדרך שבה נוצרה, ותדברו עליה במפגש הבא.'
            : 'תוקף הקישור הסתיים או שכבר נשלחו כל היצירות. אפשר לבקש מהמטפלת קישור חדש.'}
        </p>
        {safety}
      </div>
    )

  return (
    <div className="page">
      <div className="label">תרגול בבית · מהמטפלת שלך</div>
      <h1 style={{ fontSize: 'clamp(34px, 5vw, 60px)' }}>{exercise?.title ?? technique?.nameHe ?? 'תרגיל יצירה'}</h1>

      <section className="panel stack" style={{ marginBottom: 'var(--s4)', borderInlineStart: '3px solid var(--terracotta)' }}>
        <div className="label">ההנחיה</div>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 18 }}>{ex.instructions}</p>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          אין כאן נכון או לא נכון, ואין צורך לצייר יפה. מה שחשוב הוא הדרך. הסטודיו שומר גם את סדר הקווים והזמן, כדי שהמטפלת
          תוכל לראות את התהליך.
        </p>
      </section>

      {!result ? (
        <Studio onFinish={setResult} finishLabel="סיימתי לצייר" />
      ) : (
        <div className="grid grid-2">
          <section className="panel stack">
            <div className="label">היצירה שלך</div>
            <img src={result.dataUrl} alt="היצירה שלך" style={{ width: '100%', boxShadow: 'var(--shadow-2)' }} />
            <button type="button" className="btn btn-quiet" style={{ justifySelf: 'start' }} onClick={() => setResult(null)}>
              לחזור לציור מההתחלה
            </button>
          </section>
          <section className="panel stack">
            {ex.questions.length > 0 && <div className="label">כמה שאלות, לא חובה</div>}
            {ex.questions.map((q, i) => (
              <label key={q} className="field">
                <span>{q}</span>
                <textarea
                  className="textarea"
                  style={{ minHeight: 80 }}
                  value={answers[i] ?? ''}
                  onChange={(e) => setAnswers((a) => a.map((v, k) => (k === i ? e.target.value : v)))}
                  data-testid={`answer-${i}`}
                />
              </label>
            ))}
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 5 }} data-testid="consent" />
              <span>ידוע לי שהיצירה, נתוני התהליך והתשובות יישלחו למטפלת שלי בלבד, ולא יישמרו עם שם או פרטים מזהים.</span>
            </label>
            <button type="button" className="btn btn-primary" onClick={send} disabled={!consent || busy} data-testid="send-home">
              {busy ? 'שולח' : 'שליחה למטפלת'}
            </button>
            {err && <p className="error" role="alert">{err}</p>}
          </section>
        </div>
      )}
      {safety}
    </div>
  )
}
