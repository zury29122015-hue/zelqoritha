import { useEffect, useState } from 'react'
import type { LocalAccount, PrinterModel } from '../api'

interface Props {
  onChangePrinters: () => void
  onSignedOut: () => void
}

export function Settings({ onChangePrinters, onSignedOut }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  const [account, setAccount] = useState<LocalAccount | null>(null)
  const [nameDraft, setNameDraft] = useState('')

  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [selectedPrinterIds, setSelectedPrinterIds] = useState<string[]>([])

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setApiKey(cfg.geminiApiKey)
      setAccount(cfg.account)
      setNameDraft(cfg.account?.name ?? '')
      setSelectedPrinterIds(cfg.selectedPrinterIds)
    })
    window.api.listPrinters().then(setPrinters)
  }, [])

  async function save() {
    await window.api.setConfig({ geminiApiKey: apiKey })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleRenameAccount() {
    if (!nameDraft.trim()) return
    const acc = await window.api.renameAccount(nameDraft)
    setAccount(acc)
  }

  async function handleSignOut() {
    await window.api.signOut()
    onSignedOut()
  }

  const myPrinters = printers.filter((p) => selectedPrinterIds.includes(p.id))

  return (
    <div className="screen" style={{ maxWidth: 560 }}>
      <h2>Ajustes</h2>

      <h3 style={{ marginTop: 0 }}>Cuenta</h3>
      <div className="field">
        <label>Tu nombre</label>
        <div className="row">
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={{ flex: 1 }} />
          <button className="btn secondary" onClick={handleRenameAccount} disabled={nameDraft === account?.name}>
            Guardar nombre
          </button>
        </div>
        {account?.email && (
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>Correo: {account.email}</p>
        )}
        <button className="btn secondary" onClick={handleSignOut} style={{ marginTop: 10 }}>
          Cerrar sesión
        </button>
      </div>

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
        <label>API key de Gemini</label>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: -4, marginBottom: 8 }}>
          Se te asignó automáticamente al crear tu cuenta. Solo cámbiala aquí si necesitas usar una
          propia.
        </p>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza..." />
      </div>
      <button className="btn" onClick={save}>
        Guardar
      </button>
      {saved && <span style={{ marginLeft: 10, color: 'var(--accent-2)' }}>Guardado.</span>}
    </div>
  )
}
