import { useState, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../logic/auth'
import { supabase } from '../logic/supabase'

export default function Login() {
  const { session, googleEnabled } = useAuth()
  const [params] = useSearchParams()
  const next = params.get('next') || '/clients'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (session) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setErr(error.message === 'Invalid login credentials' ? 'האימייל או הסיסמה אינם נכונים.' : error.message)
  }

  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next}` },
    })
  }

  return (
    <div className="page">
      <PageHeader kicker="אזור אישי" title="כניסה">
        הכניסה פותחת את המטופלים, המפגשים והתמונות שלך. כל רשומה נגישה רק לך.
      </PageHeader>
      <div className="panel stack" style={{ maxWidth: 460 }}>
        {googleEnabled && (
          <>
            <button type="button" className="btn btn-primary" onClick={google}>
              כניסה עם Google
            </button>
            <div className="label" style={{ textAlign: 'center' }}>או</div>
          </>
        )}
        <form className="stack" onSubmit={submit}>
          <label className="field">
            <span>אימייל</span>
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </label>
          <label className="field">
            <span>סיסמה</span>
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </label>
          <button type="submit" className={`btn ${googleEnabled ? '' : 'btn-primary'}`} disabled={busy}>
            {busy ? 'נכנסת' : 'כניסה'}
          </button>
          {err && <p className="error" role="alert">{err}</p>}
        </form>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          החשבון משותף לאפליקציות של ענת באותו פרויקט. אותו אימייל ואותה סיסמה.
        </p>
      </div>
    </div>
  )
}
