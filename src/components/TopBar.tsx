import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogoMark } from './Logo'
import { useAuth } from '../logic/auth'
import './TopBar.css'

// קישור לשיחה שבה נבנתה האפליקציה.
export const DEV_CHAT_URL = 'https://claude.ai/code/session_01GW93o8SNTApmKhuaaPxrq2'
// PLACEHOLDER: כתובת "פרויקט המחקר" טרם סופקה. להחליף כשענת תיתן קישור.
export const RESEARCH_PROJECT_URL = ''

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
        <div className="brand-col">
          <Link to="/" className="brand" aria-label="TipulArt, דף הבית">
            <LogoMark />
            <span className="brand-text">
              <span className="brand-name">TipulArt</span>
              <span className="brand-sub">כלי עבודה לטיפול באמנות</span>
            </span>
          </Link>
          <div className="sys-buttons" aria-label="כפתורי מערכת">
            <button type="button" className="btn btn-sm" onClick={copyLink} data-testid="copy-link">
              {copied ? 'הקישור הועתק' : 'העתקת קישור'}
            </button>
            <a className="btn btn-sm" href={DEV_CHAT_URL} target="_blank" rel="noreferrer" data-testid="dev-chat">
              שיחת הפיתוח
            </a>
            {RESEARCH_PROJECT_URL ? (
              <a className="btn btn-sm" href={RESEARCH_PROJECT_URL} target="_blank" rel="noreferrer">
                פרויקט המחקר
              </a>
            ) : (
              <button type="button" className="btn btn-sm" aria-disabled="true" title="הקישור טרם סופק" data-testid="research">
                פרויקט המחקר
              </button>
            )}
            {installEvt && (
              <button type="button" className="btn btn-sm btn-accent" onClick={install} data-testid="install">
                התקנת האפליקציה
              </button>
            )}
          </div>
        </div>
        <div className="nav-col">
          <nav className="main-nav" aria-label="ניווט ראשי">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="account">
            {session ? (
              <>
                <span className="label account-mail">{session.user.email}</span>
                <button type="button" className="btn btn-sm btn-quiet" onClick={signOut}>
                  יציאה
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-sm btn-primary">
                כניסה
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
