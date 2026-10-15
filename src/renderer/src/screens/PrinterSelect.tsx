import { useEffect, useState } from 'react'
import type { PrinterModel } from '../api'
import { PrinterIcon } from '../components/PrinterIcon'

const COLORS = ['#ff8a00', '#3ddc97', '#6ea8fe', '#f06292', '#ffd54f', '#b39ddb', '#4dd0e1', '#ff8a65']

interface Props {
  onContinue: (selected: PrinterModel[]) => void
}

export function PrinterSelect({ onContinue }: Props) {
  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    window.api.listPrinters().then((list) => {
      setPrinters(list)
      window.api.getConfig().then((cfg) => setSelectedIds(new Set(cfg.selectedPrinterIds)))
    })
  }, [])

  const maxDim = Math.max(...printers.map((p) => Math.max(p.buildVolumeMm.x, p.buildVolumeMm.y, p.buildVolumeMm.z)), 1)

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function continueClick() {
    const selected = printers.filter((p) => selectedIds.has(p.id))
    window.api.setConfig({ selectedPrinterIds: [...selectedIds] })
    onContinue(selected)
  }

  return (
    <div className="screen">
      <h2>¿Qué impresora Bambu Lab tienes?</h2>
      <p style={{ color: 'var(--muted)' }}>Puedes elegir una o varias. Más adelante escoges con cuál imprimir.</p>
      <div className="printer-grid">
        {printers.map((p, i) => {
          const biggest = Math.max(p.buildVolumeMm.x, p.buildVolumeMm.y, p.buildVolumeMm.z)
          return (
            <div
              key={p.id}
              className={`printer-card ${selectedIds.has(p.id) ? 'selected' : ''}`}
              onClick={() => toggle(p.id)}
            >
              <PrinterIcon widthRatio={biggest / maxDim} color={COLORS[i % COLORS.length]} />
              <strong>{p.name}</strong>
              <span className="vol">
                {p.buildVolumeMm.x} × {p.buildVolumeMm.y} × {p.buildVolumeMm.z} mm
                {p.hasAms ? ' · AMS' : ''}
              </span>
              {p.note && <span className="note">{p.note}</span>}
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 24 }}>
        <button className="btn" disabled={selectedIds.size === 0} onClick={continueClick}>
          Continuar
        </button>
      </div>
    </div>
  )
}
