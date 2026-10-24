import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LogoMark } from './Logo'
import { useAuth } from '../logic/auth'
import './TopBar.css'

// קישור לשיחה שבה נבנתה האפליקציה.
export const DEV_CHAT_URL = 'https://claude.ai/code/session_01GW93o8SNTApmKhuaaPxrq2'
// פרויקט המחקר של ענת ב-Claude.
export const RESEARCH_PROJECT_URL = 'https://claude.ai/chat/61b5f6c0-8394-4c37-a232-4fed2c479392'

interface MenuElement extends HTMLElement {
  items: { label: string; hint?: string; onSelect: () => unknown }[]
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'ai-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { chat?: string; research?: string }
    }
  }
}

const NAV = [
  { to: '/', label: 'בית', end: true },
  { to: '/library', label: 'ספרייה' },
  { to: '/map', label: 'מפת מטרות' },
  { to: '/studio', label: 'סטודיו' },
  { to: '/assessment', label: 'הערכה' },
  { to: '/plan', label: 'מתכנן מפגש' },
  { to: '/clients', label: 'מטופלים' },
  { to: '/evidence', label: 'ראיות' },
]

export function TopBar() {
  const { session, signOut } = useAuth()
  // בדף המטופל/ת בבית מוצג סרגל מצומצם: בלי ניווט של המטפלת ובלי קישורי פיתוח.
  const patient = useLocation().pathname.startsWith('/home/')
  const navigate = useNavigate()
  const menuRef = useRef<MenuElement>(null)

  // כניסה/יציאה נכנסות לכפתור הלוגו (ai-menu). העתקת קישור, שיחת הפיתוח, פרויקט המחקר וההתקנה מגיעות מהרכיב עצמו.
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    el.items = session
      ? [{ label: 'יציאה', hint: session.user.email ?? undefined, onSelect: () => signOut() }]
      : [{ label: 'כניסה', onSelect: () => navigate('/login') }]
  }, [session, signOut, navigate, patient])

  return (
    <header className="topbar" role="banner">
      <div className="topbar-inner">
        <Link to="/" className="brand" aria-label="TipulArt, דף הבית">
          <LogoMark />
          <span className="brand-text">
            <span className="brand-name">TipulArt</span>
            <span className="brand-sub">כלי עבודה לטיפול באמנות</span>
          </span>
        </Link>

        {!patient && <nav className="main-nav" aria-label="ניווט ראשי">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              {n.label}
            </NavLink>
          ))}
        </nav>}

        {/* כפתור הלוגו של ענת (https://appofapp-gh.vercel.app/ai-menu.js). כל כפתורי המערכת והעריכה נפתחים ממנו. בדף המטופל/ת: הלוגו בלי תפריט. */}
        <div className="anat-logo" data-testid="anat-logo">
          {patient ? (
            <span className="anat-button" aria-label="אד' ענת שטיבלמן A&I" data-testid="anat-button">
              <span className="anat-mono" aria-hidden="true">A&amp;I</span>
              <span className="anat-title">אד' ענת שטיבלמן</span>
            </span>
          ) : (
            <ai-menu ref={menuRef} chat={DEV_CHAT_URL} research={RESEARCH_PROJECT_URL} />
          )}
        </div>
      </div>
    </header>
  )
}
