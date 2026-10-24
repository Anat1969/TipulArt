import { Rich } from '../components/Rich'
import { CONF_LABEL, METHODS, type AutoResult } from './auto'
import './AutoReport.css'

// דוח ההערכה האוטומטית: לכל פרמטר ציון, מה הוא בודק, מה נמדד, איך חושב הציון ומה המגבלה.
export function AutoReport({ result, therapist }: { result: AutoResult; therapist?: Record<string, number | null> | null }) {
  const m = METHODS.find((x) => x.id === result.method)!
  return (
    <div className="auto-report" data-testid={`auto-report-${result.method}`}>
      <div className="insight" style={{ margin: 0 }}>
        <Rich text={result.summary} />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {m.label} · <span dir="ltr">{m.en}</span> · חושב {new Date(result.at).toLocaleString('he-IL')}. אותה יצירה תמיד מקבלת אותה הערכה.
      </p>
      {result.items.map((i) => {
        const mine = therapist?.[i.id]
        const diff = i.score !== null && mine !== null && mine !== undefined ? Math.abs(mine - i.score) : null
        return (
          <article key={i.id} className={`auto-item ${i.score === null ? 'none' : ''}`} data-testid={`auto-${i.id}`}>
            <header className="auto-head">
              <div>
                <h3 className="auto-name">{i.label}</h3>
                <span className="muted" style={{ fontSize: 12 }} dir="ltr">{i.en}</span>
              </div>
              {i.score === null ? (
                <span className="label" style={{ textTransform: 'none' }}>לא נמדד ממוחשבית</span>
              ) : (
                <div className="auto-score">
                  <b className="score-badge">{i.score}</b>
                  <span className="auto-scale" aria-hidden="true">
                    {[0, 1, 2, 3, 4, 5].map((v) => <i key={v} className={v <= (i.score as number) ? 'on' : ''} />)}
                  </span>
                  <span className="label" style={{ textTransform: 'none' }}>{CONF_LABEL[i.confidence]}</span>
                </div>
              )}
            </header>
            <p className="auto-meaning">{i.meaning}</p>
            {!!i.measures.length && (
              <dl className="auto-measures">
                {i.measures.map((x) => (
                  <div key={x.label}>
                    <dt>{x.label}</dt>
                    <dd><b className="num">{x.value}</b></dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="auto-rule"><span className="label" style={{ textTransform: 'none' }}>איך חושב</span> {i.rule}</p>
            <p className="auto-limits muted"><span className="label" style={{ textTransform: 'none' }}>מגבלה</span> {i.limits}</p>
            {diff !== null && (
              <p className="auto-compare">
                הדירוג שלך: <b className="num">{mine}</b> · {diff === 0 ? 'הסכמה מלאה' : `הפרש ${diff}`}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}
