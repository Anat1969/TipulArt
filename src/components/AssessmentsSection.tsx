import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FEATS } from '../content/feats'
import { listAssessments, type Assessment } from '../logic/data'
import '../pages/assessment/Assessment.css'

// הערכות מובנות בציר הזמן: התחלה, רשימה, ושינוי בכל סולם לאורך ההערכות החתומות.
export function AssessmentsSection({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<Assessment[]>([])

  useEffect(() => {
    listAssessments(clientId).then(setRows).catch(() => setRows([]))
  }, [clientId])

  const finals = rows.filter((r) => r.status === 'final' && r.ratings)

  return (
    <section className="stack" style={{ marginBottom: 'var(--s5)' }} data-testid="assessments">
      <h2 style={{ fontSize: 32, margin: 0 }}>הערכה מובנית</h2>
      <p className="muted" style={{ margin: 0 }}>
        משימה תקנית ודירוג לפי FEATS, בסטודיו או מצילום של ציור על נייר. <Link to="/assessment">על השיטה ועל המהימנות</Link>
      </p>
      <div className="row">
        <Link className="btn btn-primary" to={`/assessment/new?client=${clientId}&mode=digital`} data-testid="assess-digital">PPAT בסטודיו</Link>
        <Link className="btn" to={`/assessment/new?client=${clientId}&mode=photo`} data-testid="assess-photo">PPAT מצילום נייר</Link>
        <Link className="btn btn-quiet" to={`/assessment/new?client=${clientId}&mode=photo&instrument=feats_free`}>ציור חופשי מצילום</Link>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-2" style={{ gap: 'var(--s2)' }}>
          {rows.map((r) => (
            <Link key={r.id} to={`/assessments/${r.id}`} className="panel" style={{ textDecoration: 'none', display: 'grid', gap: 6 }}>
              <span className="row" style={{ justifyContent: 'space-between' }}>
                <span>{r.instrument === 'feats_ppat' ? 'PPAT' : 'ציור חופשי'} · {r.mode === 'photo' ? 'נייר' : 'סטודיו'}</span>
                <span className="label">{new Date(r.created_at).toLocaleDateString('he-IL')} · {r.status === 'final' ? 'חתום' : r.ai_draft ? 'טיוטה מוכנה' : 'ממתין לדירוג'}</span>
              </span>
              {r.ratings && (
                <span className="profile-bars" style={{ gridTemplateColumns: 'repeat(14, 1fr)', display: 'grid', alignItems: 'end', height: 34, gap: 2 }}>
                  {FEATS.map((f) => {
                    const v = r.ratings?.[f.id]
                    return <i key={f.id} title={`${f.he}: ${v ?? '-'}`} style={{ height: `${((v ?? 0) / 5) * 100}%`, minHeight: 2, background: v === null || v === undefined ? 'var(--line)' : 'var(--ochre)' }} />
                  })}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {finals.length > 1 && (
        <div className="panel trend" data-testid="trend">
          <div className="label" style={{ marginBottom: 8 }}>שינוי לאורך ההערכות החתומות</div>
          <table>
            <thead>
              <tr>
                <th>סולם</th>
                {finals.map((r) => <th key={r.id}>{new Date(r.created_at).toLocaleDateString('he-IL')}</th>)}
              </tr>
            </thead>
            <tbody>
              {FEATS.map((f) => (
                <tr key={f.id}>
                  <td>{f.he}</td>
                  {finals.map((r) => {
                    const v = r.ratings?.[f.id]
                    return (
                      <td key={r.id} style={{ background: v === null || v === undefined ? 'transparent' : `color-mix(in srgb, var(--ochre) ${v * 16}%, transparent)` }}>
                        {v ?? '-'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
