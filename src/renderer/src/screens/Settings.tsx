import { useEffect, useState } from 'react'
import type { GoogleAccount, PrinterModel } from '../api'

interface Props {
  onChangePrinters: () => void
}

export function Settings({ onChangePrinters }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [openscadPath, setOpenscadPath] = useState('')
  const [openscadOk, setOpenscadOk] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)

  const [account, setAccount] = useState<GoogleAccount | null>(null)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')

  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [selectedPrinterIds, setSelectedPrinterIds] = useState<string[]>([])

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setApiKey(cfg.geminiApiKey)
      setOpenscadPath(cfg.openscadPath)
      setGoogleClientId(cfg.googleClientId)
      setGoogleClientSecret(cfg.googleClientSecret)
      setAccount(cfg.account)
      setSelectedPrinterIds(cfg.selectedPrinterIds)
    })
    window.api.checkOpenscad().then(setOpenscadOk)
    window.api.listPrinters().then(setPrinters)
  }, [])

  async function save() {
    await window.api.setConfig({
      geminiApiKey: apiKey,
      openscadPath,
      googleClientId,
      googleClientSecret
    })
    setOpenscadOk(await window.api.checkOpenscad())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignIn() {
    setSigningIn(true)
    setAuthError('')
    try {
      const acc = await window.api.signInWithGoogle()
      setAccount(acc)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err))
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    await window.api.signOutGoogle()
    setAccount(null)
  }

  const myPrinters = printers.filter((p) => selectedPrinterIds.includes(p.id))

  return (
    <div className="screen" style={{ maxWidth: 560 }}>
      <h2>Ajustes</h2>

      <h3 style={{ marginTop: 0 }}>Cuenta</h3>
      {account ? (
        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {account.picture && (
            <img src={account.picture} alt="" width={40} height={40} style={{ borderRadius: '50%' }} />
          )}
          <div style={{ flex: 1 }}>
            <strong>{account.name}</strong>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{account.email}</div>
          </div>
          <button className="btn secondary" onClick={handleSignOut}>
            Cerrar sesión
          </button>
        </div>
      ) : (
        <div className="field">
          <label>Client ID de Google (OAuth, tipo "Desktop app")</label>
          <input value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
          <label style={{ marginTop: 10 }}>Client Secret</label>
          <input
            type="password"
            value={googleClientSecret}
            onChange={(e) => setGoogleClientSecret(e.target.value)}
            placeholder="GOCSPX-..."
          />
          {authError && <div className="error" style={{ marginTop: 8 }}>{authError}</div>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn secondary" onClick={save}>
              Guardar credenciales
            </button>
            <button className="btn" disabled={signingIn || !googleClientId} onClick={handleSignIn}>
              {signingIn ? 'Abriendo el navegador…' : 'Iniciar sesión con Google'}
            </button>
          </div>
        </div>
      )}

      <h3>Tus impresoras</h3>
      {myPrinters.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No has elegido ninguna todavía.</p>
      ) : (
        <ul style={{ paddingLeft: 18, marginTop: 0 }}>
          {myPrinters.map((p) => (
            <li key={p.id} style={{ marginBottom: 4 }}>
              {p.name} — {p.buildVolumeMm.x}×{p.buildVolumeMm.y}×{p.buildVolumeMm.z} mm
            </li>
          ))}
        </ul>
      )}
      <button className="btn secondary" onClick={onChangePrinters} style={{ marginBottom: 24 }}>
        Cambiar impresoras
      </button>

      <h3>Generación de diseños</h3>
      <div className="field">
        <label>API key de Gemini (se guarda solo en tu computadora)</label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza..." />
      </div>
      <div className="field">
        <label>Ruta del binario de OpenSCAD</label>
        <input value={openscadPath} onChange={(e) => setOpenscadPath(e.target.value)} />
        {openscadOk !== null && (
          <span className={openscadOk ? 'loading' : 'error'} style={{ display: 'block', marginTop: 6 }}>
            {openscadOk ? 'OpenSCAD detectado correctamente.' : 'No se pudo ejecutar OpenSCAD en esa ruta.'}
          </span>
        )}
      </div>
      <button className="btn" onClick={save}>
        Guardar
      </button>
      {saved && <span style={{ marginLeft: 10, color: 'var(--accent-2)' }}>Guardado.</span>}
    </div>
  )
}
