import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
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
  { to: '/plan', label: 'מתכנן מפגש' },
  { to: '/clients', label: 'מטופלים' },
  { to: '/evidence', label: 'ראיות' },
]

export function TopBar() {
  const { session, signOut } = useAuth()
  const [copied, setCopied] = useState(false)
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)

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

        <nav className="main-nav" aria-label="ניווט ראשי">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* הלוגו של ענת. כפתורי המערכת והכניסה נמצאים בתוכו. */}
        <div className="anat-logo" role="group" aria-label="אד' ענת שטיבלמן A&I" data-testid="anat-logo">
          <div className="anat-head">
            <span className="anat-mono" aria-hidden="true">A&amp;I</span>
            <span className="anat-name">
              <span className="anat-title">אד' ענת שטיבלמן</span>
              <span className="anat-sub">A&amp;I</span>
            </span>
          </div>
          <div className="sys-buttons" aria-label="כפתורי מערכת">
            <button type="button" className="btn btn-sm" onClick={copyLink} data-testid="copy-link">
              {copied ? 'הקישור הועתק' : 'העתקת קישור'}
            </button>
            <a className="btn btn-sm" href={DEV_CHAT_URL} target="_blank" rel="noreferrer" data-testid="dev-chat">
              שיחת הפיתוח
            </a>
            <a className="btn btn-sm" href={RESEARCH_PROJECT_URL} target="_blank" rel="noreferrer" data-testid="research">
              פרויקט המחקר
            </a>
            {installEvt && (
              <button type="button" className="btn btn-sm btn-accent" onClick={install} data-testid="install">
                התקנת האפליקציה
              </button>
            )}
            {session ? (
              <button type="button" className="btn btn-sm btn-primary" onClick={signOut} title={session.user.email ?? ''} data-testid="auth-btn">
                יציאה
              </button>
            ) : (
              <Link to="/login" className="btn btn-sm btn-primary" data-testid="auth-btn">
                כניסה
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
