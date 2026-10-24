import { useEffect, useState } from 'react'
import { Rich } from '../../components/Rich'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { FEATS, PPAT, agreement } from '../../content/feats'
import { useAuth } from '../../logic/auth'
import { listFinalAssessments } from '../../logic/data'
import { autoPairs } from '../../assessment/auto'
import '../../studio/Studio.css'
import './Assessment.css'

const pct = (v: number) => `${Math.round(v * 100)}%`

// הערכה מובנית: השיטה, המשימה, השכבות, המגבלות והמהימנות הנמדדת בפועל.
export default function AssessmentInfo() {
  const { session } = useAuth()
  const [pairs, setPairs] = useState<{ all: [number, number][]; byItem: Record<string, [number, number][]>; n: number; engine: [number, number][]; engineN: number } | null>(null)

  useEffect(() => {
    if (!session) return
    listFinalAssessments()
      .then((rows) => {
        const all: [number, number][] = []
        const byItem: Record<string, [number, number][]> = {}
        let n = 0
        const engine: [number, number][] = []
        let engineN = 0
        for (const r of rows) {
          const ap = autoPairs(r.computed?.auto?.feats, r.ratings)
          if (ap.length) {
            engineN++
            engine.push(...ap)
          }
          if (!r.ai_draft || !r.ratings) continue
          n++
          for (const it of r.ai_draft.items) {
            const t = r.ratings[it.id]
            if (!it.applicable || t === null || t === undefined) continue
            all.push([it.score, t])
            ;(byItem[it.id] ??= []).push([it.score, t])
          }
        }
        setPairs({ all, byItem, n, engine, engineN })
      })
      .catch(() => setPairs(null))
  }, [session])

  const total = pairs ? agreement(pairs.all) : null
  const eng = pairs ? agreement(pairs.engine) : null

  return (
    <div className="page">
      <PageHeader kicker="הערכה מובנית" title="ניתוח יצירה שאפשר לבדוק">
        ניתוח צורני של ציור **לפי מכשיר מחקרי, במשימה תקנית**, עם **שלוש שכבות שקופות**: מדידה ממוחשבת, הערכה אוטומטית עם הסבר לכל פרמטר, ודירוג המטפלת.
        ==המכשיר והמטפלת משווים הערכות==, וההסכמה ביניהם נמדדת ובונה ראיה לאמינות הכלי לאורך זמן.
      </PageHeader>

      <div className="grid grid-2" style={{ marginBottom: 'var(--s5)' }}>
        <section className="panel stack">
          <div className="label">המכשיר</div>
          <h2 style={{ fontSize: 30, margin: 0 }}>FEATS</h2>
          <p style={{ margin: 0 }}>
            סולם היסודות הצורניים בטיפול באמנות (Formal Elements Art Therapy Scale), שפיתחו לינדה גנט (Linda Gantt) וקרמלו טבונה
            (Carmello Tabone). 14 סולמות של 0 עד 5 מדרגים איך הציור עשוי: צבע, שטח, קו, אינטגרציה, פרטים. לא מה הוא "אומר".
          </p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }} dir="ltr">{PPAT.source}</p>
          <p className="notice" style={{ margin: 0 }}>
            הגדרות העוגן באפליקציה מנוסחות מחדש על בסיס מבנה הסולמות. לשימוש מחקרי ולפרסום יש לעבוד לפי מדריך הדירוג המקורי.
          </p>
        </section>
        <section className="panel stack">
          <div className="label">המשימה התקנית</div>
          <h2 style={{ fontSize: 30, margin: 0 }}>{PPAT.name}</h2>
          <div className="directive">{PPAT.directive}</div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            משימה אחידה מאפשרת להשוות בין מטופלים ולאורך זמן. ציור חופשי ניתן לדירוג חלקי בלבד: ארבעה סולמות שייכים למשימת PPAT.
          </p>
        </section>
      </div>

      <section className="panel stack" style={{ marginBottom: 'var(--s5)' }}>
        <div className="label">פרוטוקול העברה</div>
        <ol style={{ margin: 0, paddingInlineStart: 22, display: 'grid', gap: 6 }}>
          {PPAT.protocol.map((p) => <li key={p}><Rich text={p} /></li>)}
        </ol>
      </section>

      <h2 style={{ fontSize: 30 }}>שלוש שכבות</h2>
      <div className="grid grid-3" style={{ marginBottom: 'var(--s5)' }}>
        <div className="panel stack" style={{ gap: 6 }}>
          <div className="label">1 · מדידה ממוחשבת</div>
          <p style={{ margin: 0 }}>כיסוי הדף, צבעים, פיזור ברביעים, צפיפות קווים. בסטודיו גם נתוני תהליך: זמן, עצירות, מחיקות.</p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>קוד בלבד, בלי מודל. אותה תמונה תמיד נותנת אותה תוצאה.</p>
        </div>
        <div className="panel stack" style={{ gap: 6 }}>
          <div className="label">2 · הערכה אוטומטית</div>
          <p style={{ margin: 0 }}>המנוע מתרגם את המדידות לציון בכל סולם שאפשר למדוד, לפי השיטה שנבחרה (FEATS או ETC), ומסביר: מה נמדד, איך חושב ומה המגבלה.</p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            המטפלת בוחרת מי מוביל: המכשיר קודם, או היא קודם וההשוואה נפתחת אחר כך. סולמות שתלויים בזיהוי מה מצויר נשארים לה, ואפשר להיעזר בטיוטת Claude שרואה את התמונה.
          </p>
        </div>
        <div className="panel stack" style={{ gap: 6 }}>
          <div className="label">3 · דירוג המטפלת</div>
          <p style={{ margin: 0 }}>המטפלת מדרגת כל סולם, רואה את הטיוטה לצדה, וחותמת. רק הדירוג החתום נכנס לציר הזמן.</p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>זהו הדירוג הקליני. השכבות הקודמות הן כלי עזר ובקרה.</p>
        </div>
      </div>

      <h2 style={{ fontSize: 30 }}>מהימנות נמדדת</h2>
      {!session ? (
        <p className="notice">נתוני ההסכמה מוצגים אחרי כניסה.</p>
      ) : !total && !eng ? (
        <p className="notice">עדיין אין הערכות חתומות עם הערכה אוטומטית. אחרי כל הערכה חתומה, ההסכמה בין המכשיר לדירוג שלך מתעדכנת כאן.</p>
      ) : (
        <section className="panel stack" style={{ marginBottom: 'var(--s5)' }} data-testid="reliability">
          {eng && (
            <>
              <div className="label">המכשיר מול המטפלת</div>
              <div className="stat-grid" data-testid="engine-reliability">
                <div className="metric"><b>{pairs!.engineN}</b><span>הערכות חתומות</span></div>
                <div className="metric"><b>{pct(eng.exact)}</b><span>הסכמה מלאה</span></div>
                <div className="metric"><b>{pct(eng.within1)}</b><span>הסכמה בטווח נקודה</span></div>
                <div className="metric"><b>{eng.mae.toFixed(2)}</b><span>הפרש ממוצע</span></div>
                <div className="metric"><b>{eng.kappa === null ? '-' : eng.kappa.toFixed(2)}</b><span>קאפה משוקללת</span></div>
              </div>
            </>
          )}
          {total && <div className="label">טיוטת Claude מול המטפלת</div>}
          {total && <div className="stat-grid">
            <div className="metric"><b>{pairs!.n}</b><span>הערכות חתומות</span></div>
            <div className="metric"><b>{pct(total.exact)}</b><span>הסכמה מלאה</span></div>
            <div className="metric"><b>{pct(total.within1)}</b><span>הסכמה בטווח נקודה</span></div>
            <div className="metric"><b>{total.mae.toFixed(2)}</b><span>הפרש ממוצע</span></div>
            <div className="metric"><b>{total.kappa === null ? '-' : total.kappa.toFixed(2)}</b><span>קאפה משוקללת</span></div>
          </div>}
          <div className="trend">
            <table>
              <thead><tr><th>סולם</th><th>זוגות</th><th>הסכמה מלאה</th><th>בטווח נקודה</th><th>הפרש ממוצע</th></tr></thead>
              <tbody>
                {FEATS.map((f) => {
                  const a = agreement(pairs!.byItem[f.id] ?? [])
                  return (
                    <tr key={f.id}>
                      <td>{f.he}</td>
                      <td>{a?.n ?? 0}</td>
                      <td>{a ? pct(a.exact) : '-'}</td>
                      <td>{a ? pct(a.within1) : '-'}</td>
                      <td>{a ? a.mae.toFixed(2) : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            קאפה משוקללת ריבועית (Cohen) מתקנת להסכמה מקרית. מתחת ל-30 הערכות חתומות התוצאות אינן יציבות. השלב הבא לתוקף: דירוג
            כפול של מטפלת שנייה על אותן עבודות, והשוואה בין דירוג על נייר לדירוג בסטודיו.
          </p>
        </section>
      )}

      <section className="panel stack">
        <div className="label">מה הכלי לא עושה</div>
        <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 4 }}>
          <li>אינו מאבחן ואינו קובע מצב נפשי. FEATS מודד מאפיינים צורניים.</li>
          <li>הגרסה הדיגיטלית של המשימה טרם תוקפה מול הגרסה על נייר. לכן אפשר לעבוד בשני המסלולים ולהשוות.</li>
          <li>טיוטת המודל עלולה לטעות, בעיקר בצילום חלש. לכן היא מוצגת עם רמת ביטחון, והמטפלת חותמת.</li>
        </ul>
        <div className="row">
          <Link className="btn btn-primary" to="/clients">התחלת הערכה מתוך מטופל/ת</Link>
          <Link className="btn" to="/evidence">ראיות ומקורות</Link>
        </div>
      </section>
    </div>
  )
}
