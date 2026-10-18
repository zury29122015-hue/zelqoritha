import { useEffect, useState } from 'react'
import type { PrinterModel, SavedDesign } from '../api'

interface Props {
  onOpen: (design: SavedDesign, printer: PrinterModel) => void
  onPrint: (design: SavedDesign, printer: PrinterModel) => void
}

function printerFor(printers: PrinterModel[], printerId: string): PrinterModel | undefined {
  return printers.find((p) => p.id === printerId)
}

export function MyDesigns({ onOpen, onPrint }: Props) {
  const [designs, setDesigns] = useState<SavedDesign[]>([])
  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [loading, setLoading] = useState(true)

  function refresh() {
    setLoading(true)
    Promise.all([window.api.listDesigns(), window.api.listPrinters()])
      .then(([d, p]) => {
        setDesigns(d)
        setPrinters(p)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleDelete(id: string) {
    await window.api.deleteDesign(id)
    refresh()
  }

  return (
    <div className="screen">
      <h2>Mis diseños</h2>
      {loading && <p className="loading">Cargando…</p>}
      {!loading && designs.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>Todavía no has generado ningún diseño.</p>
      )}
      <div className="design-grid">
        {designs.map((d) => {
          const printer = printerFor(printers, d.printerId)
          return (
            <div key={d.id} className="design-card">
              <div className="parts-list" style={{ marginBottom: 8 }}>
                {d.parts.slice(0, 6).map((p) => (
                  <span key={p.id} className="swatch" style={{ background: p.color }} />
                ))}
              </div>
              <strong>{d.prompt}</strong>
              <p style={{ color: 'var(--muted)', fontSize: 12, margin: '4px 0 10px' }}>{d.summary}</p>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                {printer ? printer.name : d.printerId} · {new Date(d.updatedAt).toLocaleString()}
              </span>
              <div className="row" style={{ marginTop: 12 }}>
                <button
                  className="btn secondary"
                  disabled={!printer}
                  onClick={() => printer && onOpen(d, printer)}
                >
                  Abrir
                </button>
                <button className="btn" disabled={!printer} onClick={() => printer && onPrint(d, printer)}>
                  Imprimir
                </button>
                <button className="btn secondary" onClick={() => handleDelete(d.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
