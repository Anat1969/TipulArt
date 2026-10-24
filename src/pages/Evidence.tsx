import { PageHeader } from '../components/PageHeader'
import { Rich } from '../components/Rich'
import { CLAIM_LABELS, FINDINGS, ISRAEL_STATUS, PRACTICAL_CONCLUSION } from '../content/evidence'

export default function Evidence() {
  return (
    <div className="page">
      <PageHeader kicker="ראיות" title="מה ידוע, ומה לא">
        סיכום ממצאי המחקר וההסדרה בישראל. **כל טענה מסומנת לפי סוגה**: עובדה מבוססת, דעת מומחה, פרשנות או אי־ודאות.
      </PageHeader>

      <section className="insight stack" style={{ marginBottom: 'var(--s5)' }}>
        <h2 style={{ fontSize: 30, margin: 0 }}>מסקנה מעשית</h2>
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          {PRACTICAL_CONCLUSION.map((c) => <li key={c} style={{ marginBottom: 6 }}><Rich text={c} /></li>)}
        </ul>
      </section>

      <h2 style={{ fontSize: 30 }}>ממצאי מחקר</h2>
      <div className="grid grid-2" style={{ marginBottom: 'var(--s6)' }}>
        {FINDINGS.map((f) => (
          <article key={f.title} className="panel stack" style={{ gap: 8 }}>
            <div className="label">{CLAIM_LABELS[f.kind]}</div>
            <h3 style={{ margin: 0 }}>{f.title}</h3>
            <p style={{ margin: 0 }}><Rich text={f.body} nums /></p>
            <p className="muted" dir="ltr" style={{ margin: 0, fontSize: 14, textAlign: 'right' }}>{f.source}</p>
          </article>
        ))}
      </div>

      <h2 style={{ fontSize: 30 }}>ישראל: הסדרה ומעמד</h2>
      <div className="stack" style={{ marginBottom: 'var(--s5)' }}>
        {ISRAEL_STATUS.map((s) => (
          <div key={s.body} className="panel" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,140px) minmax(0,1fr)', gap: 16 }}>
            <span className="label">{CLAIM_LABELS[s.kind]}</span>
            <span><Rich text={s.body} nums /></span>
          </div>
        ))}
      </div>
      <p className="notice">
        גופים מקצועיים: יה"ת, האגודה לטיפול באמצעות אמנויות בישראל (YAHAT); אוניברסיטת חיפה (University of Haifa); אוניברסיטת
        בר־אילן (Bar-Ilan University); American Art Therapy Association (AATA); British Association of Art Therapists (BAAT).
      </p>
    </div>
  )
}
