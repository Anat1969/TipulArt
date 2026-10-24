import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/PageHeader'
import { RequireAuth } from '../../components/RequireAuth'
import { Studio, type StudioResult } from '../../studio/Studio'
import { analyzeImage } from '../../studio/analyzeImage'
import { compressImage } from '../../logic/image'
import { PPAT } from '../../content/feats'
import { createAssessment, getClient, type Client } from '../../logic/data'
import './Assessment.css'

// העברת הערכה: בסטודיו (דיגיטלי) או מצילום של ציור על נייר.
function NewInner() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const clientId = params.get('client') ?? ''
  const mode = params.get('mode') === 'photo' ? 'photo' : 'digital'
  const instrument = params.get('instrument') === 'feats_free' ? 'feats_free' : 'feats_ppat'
  const [client, setClient] = useState<Client | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)

  useEffect(() => {
    if (clientId) getClient(clientId).then(setClient).catch((e) => setErr(e.message))
  }, [clientId])

  const finish = async (blob: Blob, url: string, process: StudioResult['process'] | null) => {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const computed = await analyzeImage(url)
      const a = await createAssessment({ client_id: clientId, instrument, mode, blob, process, computed })
      nav(`/assessments/${a.id}`)
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    const blob = await compressImage(file, 2000, 0.9)
    setPhoto({ blob, url: URL.createObjectURL(blob) })
  }

  if (!clientId) return <div className="page"><p className="error">חסר קוד מטופל/ת.</p></div>

  return (
    <div className="page">
      <PageHeader kicker={`הערכה מובנית · ${client?.code ?? ''} · ${mode === 'photo' ? 'צילום מנייר' : 'סטודיו'}`} title={instrument === 'feats_ppat' ? PPAT.name : 'ציור חופשי'}>
        {instrument === 'feats_ppat'
          ? 'אומרים את ההנחיה פעם אחת, בדיוק כפי שהיא, ולא מוסיפים הסבר.'
          : 'ציור חופשי מדורג על עשרה סולמות. ארבעת סולמות PPAT אינם רלוונטיים.'}
      </PageHeader>

      {instrument === 'feats_ppat' && <div className="directive" style={{ marginBottom: 'var(--s4)' }}>{PPAT.directive}</div>}

      <details className="panel" style={{ marginBottom: 'var(--s4)' }}>
        <summary style={{ cursor: 'pointer' }}><span className="label">פרוטוקול העברה</span></summary>
        <ol style={{ margin: '10px 0 0', paddingInlineStart: 22, display: 'grid', gap: 4 }}>
          {PPAT.protocol.map((p) => <li key={p}>{p}</li>)}
        </ol>
      </details>

      {mode === 'digital' ? (
        <Studio standard={instrument === 'feats_ppat'} finishLabel={busy ? 'שומר ומנתח' : 'סיום והעברה לדירוג'} onFinish={(r) => finish(r.blob, r.dataUrl, r.process)} />
      ) : (
        <section className="panel stack">
          <label className="field">
            <span>צילום הציור</span>
            <input className="input" type="file" accept="image/*" capture="environment" onChange={(e) => onPhoto(e.target.files?.[0])} data-testid="photo-file" />
          </label>
          <small className="muted">אור יום, מלמעלה, הדף ממלא את התמונה, בלי צל. הצילום נדחס ונשמר בדלי פרטי.</small>
          {photo && <img src={photo.url} alt="הציור שצולם" style={{ maxWidth: 520, width: '100%', boxShadow: 'var(--shadow-2)' }} />}
          <button type="button" className="btn btn-primary" style={{ justifySelf: 'start' }} disabled={!photo || busy} onClick={() => photo && finish(photo.blob, photo.url, null)} data-testid="photo-submit">
            {busy ? 'שומר ומנתח' : 'שמירה והעברה לדירוג'}
          </button>
        </section>
      )}
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  )
}

export default function AssessmentNew() {
  return (
    <RequireAuth title="הערכה מובנית">
      <NewInner />
    </RequireAuth>
  )
}
