import { useEffect, useState } from 'react'

export function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [openscadPath, setOpenscadPath] = useState('')
  const [openscadOk, setOpenscadOk] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setApiKey(cfg.geminiApiKey)
      setOpenscadPath(cfg.openscadPath)
    })
    window.api.checkOpenscad().then(setOpenscadOk)
  }, [])

  async function save() {
    await window.api.setConfig({ geminiApiKey: apiKey, openscadPath })
    setOpenscadOk(await window.api.checkOpenscad())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="screen" style={{ maxWidth: 520 }}>
      <h2>Ajustes</h2>
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
