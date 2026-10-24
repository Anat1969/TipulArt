import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../logic/auth'

// אזור אישי: מוצג רק אחרי כניסה. הדף לא נעלם, אלא מסביר למה צריך להיכנס.
export function RequireAuth({ children, title }: { children: ReactNode; title: string }) {
  const { session, ready } = useAuth()
  const loc = useLocation()
  if (!ready) return <div className="page"><p className="label">טוען</p></div>
  if (!session)
    return (
      <div className="page">
        <h1>{title}</h1>
        <div className="panel stack" style={{ maxWidth: 560 }}>
          <p>האזור הזה אישי. הוא מכיל תיעוד מפגשים, ולכן נפתח רק אחרי כניסה.</p>
          <p className="muted">מטופלים מזוהים בקוד בלבד. כל רשומה נגישה רק למטפלת שיצרה אותה.</p>
          <div className="row">
            <Link className="btn btn-primary" to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`}>
              כניסה
            </Link>
            <Link className="btn" to="/library">
              לספרייה הפתוחה
            </Link>
          </div>
        </div>
      </div>
    )
  return <>{children}</>
}
