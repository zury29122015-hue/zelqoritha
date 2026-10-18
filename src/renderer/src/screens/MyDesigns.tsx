import { useEffect, useState } from 'react'
import type { PrinterModel, SavedDesign, Workspace } from '../api'

interface Props {
  onBack: () => void
  onOpen: (design: SavedDesign, printer: PrinterModel) => void
  onPrint: (design: SavedDesign, printer: PrinterModel) => void
  onCreateInWorkspace: (workspaceId: string | null) => void
}

function printerFor(printers: PrinterModel[], printerId: string): PrinterModel | undefined {
  return printers.find((p) => p.id === printerId)
}

export function MyDesigns({ onBack, onOpen, onPrint, onCreateInWorkspace }: Props) {
  const [designs, setDesigns] = useState<SavedDesign[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>('all')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)

  function refresh() {
    setLoading(true)
    Promise.all([window.api.listDesigns(), window.api.listWorkspaces(), window.api.listPrinters()])
      .then(([d, w, p]) => {
        setDesigns(d)
        setWorkspaces(w)
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

  async function handleToggleLike(d: SavedDesign) {
    await window.api.upsertDesign({ ...d, liked: !d.liked })
    refresh()
  }

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return
    setCreatingWorkspace(true)
    try {
      const ws = await window.api.createWorkspace(newWorkspaceName)
      setNewWorkspaceName('')
      setSelected(ws.id)
      refresh()
    } finally {
      setCreatingWorkspace(false)
    }
  }

  async function handleDeleteWorkspace(id: string) {
    await window.api.deleteWorkspace(id)
    if (selected === id) setSelected('all')
    refresh()
  }

  const shown = selected === 'all' ? designs : designs.filter((d) => d.workspaceId === selected)

  return (
    <div className="screen">
      <button className="link" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Volver
      </button>
      <h2>Mis diseños</h2>

      <div className="workspace-tabs">
        <button className={`tab ${selected === 'all' ? 'active' : ''}`} onClick={() => setSelected('all')}>
          Todos
        </button>
        {workspaces.map((w) => (
          <span key={w.id} className={`tab ${selected === w.id ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button className="tab-inner" onClick={() => setSelected(w.id)}>
              {w.name}
            </button>
            <button className="tab-remove" title="Eliminar carpeta" onClick={() => handleDeleteWorkspace(w.id)}>
              ×
            </button>
          </span>
        ))}
        <input
          value={newWorkspaceName}
          onChange={(e) => setNewWorkspaceName(e.target.value)}
          placeholder="Nueva carpeta…"
          style={{ width: 140 }}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
        />
        <button className="btn secondary" disabled={creatingWorkspace || !newWorkspaceName.trim()} onClick={handleCreateWorkspace}>
          + Crear
        </button>
      </div>

      <div style={{ margin: '12px 0 20px' }}>
        <button className="btn" onClick={() => onCreateInWorkspace(selected === 'all' ? null : selected)}>
          + Nuevo diseño {selected !== 'all' ? 'en esta carpeta' : ''}
        </button>
      </div>

      {loading && <p className="loading">Cargando…</p>}
      {!loading && shown.length === 0 && (
        <p style={{ color: 'var(--muted)' }}>No hay diseños aquí todavía.</p>
      )}
      <div className="design-grid">
        {shown.map((d) => {
          const printer = printerFor(printers, d.printerId)
          return (
            <div key={d.id} className="design-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="parts-list" style={{ marginBottom: 8 }}>
                  {d.parts.slice(0, 6).map((p) => (
                    <span key={p.id} className="swatch" style={{ background: p.color }} />
                  ))}
                </div>
                <button
                  className="like-btn"
                  title={d.liked ? 'Quitar like' : 'Dar like'}
                  onClick={() => handleToggleLike(d)}
                >
                  {d.liked ? '❤️' : '🤍'}
                </button>
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
