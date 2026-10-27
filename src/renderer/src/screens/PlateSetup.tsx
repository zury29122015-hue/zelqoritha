import { useState } from 'react'
import type { DesignPart, PrinterModel } from '../api'

interface Props {
  printer: PrinterModel
  scadCode: string
  parts: DesignPart[]
  initialPlateCount?: number
  initialCopiesPerPlate?: number
  onDone: () => void
}

export function PlateSetup({
  printer,
  scadCode,
  parts,
  initialPlateCount = 1,
  initialCopiesPerPlate = 1,
  onDone
}: Props) {
  const [plateCount, setPlateCount] = useState(initialPlateCount)
  const [copiesPerPlate, setCopiesPerPlate] = useState(initialCopiesPerPlate)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function send() {
    setSending(true)
    setError('')
    try {
      const res = await window.api.sendToBambuStudio(scadCode, parts, printer.id, plateCount, copiesPerPlate)
      if (res.ok) setResult(res.message)
      else setError(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="screen" style={{ maxWidth: 560 }}>
      <h2>Armar en Bambu Studio</h2>
      <p style={{ color: 'var(--muted)' }}>
        Impresora: {printer.name} ({printer.buildVolumeMm.x}×{printer.buildVolumeMm.y}×{printer.buildVolumeMm.z} mm)
      </p>
      <div className="field">
        <label>Número de placas</label>
        <input type="number" min={1} max={50} value={plateCount} onChange={(e) => setPlateCount(Number(e.target.value))} />
      </div>
      <div className="field">
        <label>Copias por placa</label>
        <input
          type="number"
          min={1}
          max={200}
          value={copiesPerPlate}
          onChange={(e) => setCopiesPerPlate(Number(e.target.value))}
        />
        <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
          Si no caben al tamaño original, se encoge el diseño para que quepan todas.
        </span>
      </div>
      {error && <div className="error">{error}</div>}
      {result && <div className="loading">{result}</div>}
      <div className="row">
        <button className="btn" disabled={sending} onClick={send}>
          {sending ? 'Armando…' : 'Abrir en Bambu Studio'}
        </button>
        <button className="btn secondary" onClick={onDone}>
          Volver
        </button>
      </div>
    </div>
  )
}
