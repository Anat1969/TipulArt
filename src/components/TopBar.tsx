import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LogoMark } from './Logo'
import { useAuth } from '../logic/auth'
import './TopBar.css'

// קישור לשיחה שבה נבנתה האפליקציה.
export const DEV_CHAT_URL = 'https://claude.ai/code/session_01GW93o8SNTApmKhuaaPxrq2'
// פרויקט המחקר של ענת ב-Claude.
export const RESEARCH_PROJECT_URL = 'https://claude.ai/chat/61b5f6c0-8394-4c37-a232-4fed2c479392'

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const NAV = [
  { to: '/', label: 'בית', end: true },
  { to: '/library', label: 'ספרייה' },
  { to: '/map', label: 'מפת מטרות' },
  { to: '/studio', label: 'סטודיו' },
  { to: '/plan', label: 'מתכנן מפגש' },
  { to: '/clients', label: 'מטופלים' },
  { to: '/evidence', label: 'ראיות' },
]

export function TopBar() {
  const { session, signOut } = useAuth()
  // בדף המטופל/ת בבית מוצג סרגל מצומצם: בלי ניווט של המטפלת ובלי קישורי פיתוח.
  const patient = useLocation().pathname.startsWith('/home/')
  const [copied, setCopied] = useState(false)
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()

  // התפריט נסגר במעבר דף, בלחיצה מחוץ לו וב-Escape.
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BIPEvent)
    }
    const onInstalled = () => setInstallEvt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const install = async () => {
    if (!installEvt) return
    await installEvt.prompt()
    await installEvt.userChoice
    setInstallEvt(null)
  }

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

        {/* כפתור הלוגו של ענת. בסרגל רואים רק את הלוגו. כל כפתורי המערכת והעריכה נפתחים ממנו. */}
        <div className="anat-logo" ref={menuRef} data-testid="anat-logo">
          <button
            type="button"
            className="anat-button"
            aria-haspopup={!patient ? 'true' : undefined}
            aria-expanded={!patient ? menuOpen : undefined}
            aria-controls="anat-menu"
            aria-label="אד' ענת שטיבלמן A&I, כפתורי מערכת"
            onClick={() => !patient && setMenuOpen((o) => !o)}
            data-testid="anat-button"
          >
            <span className="anat-mono" aria-hidden="true">A&amp;I</span>
            <span className="anat-title">אד' ענת שטיבלמן</span>
          </button>
          {!patient && menuOpen && (
            <div className="anat-menu" id="anat-menu" role="menu" aria-label="כפתורי מערכת" data-testid="anat-menu">
              <button type="button" role="menuitem" className="btn btn-sm" onClick={copyLink} data-testid="copy-link">
                {copied ? 'הקישור הועתק' : 'העתקת קישור'}
              </button>
              <a role="menuitem" className="btn btn-sm" href={DEV_CHAT_URL} target="_blank" rel="noreferrer" data-testid="dev-chat">
                שיחת הפיתוח
              </a>
              <a role="menuitem" className="btn btn-sm" href={RESEARCH_PROJECT_URL} target="_blank" rel="noreferrer" data-testid="research">
                פרויקט המחקר
              </a>
              {installEvt && (
                <button type="button" role="menuitem" className="btn btn-sm btn-accent" onClick={install} data-testid="install">
                  התקנת האפליקציה
                </button>
              )}
              {session ? (
                <button type="button" role="menuitem" className="btn btn-sm btn-primary" onClick={() => { setMenuOpen(false); signOut() }} data-testid="auth-btn">
                  יציאה{session.user.email ? ` · ${session.user.email}` : ''}
                </button>
              ) : (
                <Link role="menuitem" to="/login" className="btn btn-sm btn-primary" data-testid="auth-btn">
                  כניסה
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
