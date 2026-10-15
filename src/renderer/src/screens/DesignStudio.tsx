import { useState } from 'react'
import type { DesignPart, DesignResult, PrinterModel, RenderedPart } from '../api'
import { StlViewer } from '../components/StlViewer'

interface ChatEntry {
  role: 'user' | 'assistant'
  text: string
}

interface Props {
  printer: PrinterModel
  onApproved: (scadCode: string, parts: DesignPart[]) => void
}

export function DesignStudio({ printer, onApproved }: Props) {
  const [prompt, setPrompt] = useState('')
  const [log, setLog] = useState<ChatEntry[]>([])
  const [design, setDesign] = useState<DesignResult | null>(null)
  const [renderedParts, setRenderedParts] = useState<RenderedPart[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function renderAndShow(result: DesignResult) {
    setDesign(result)
    const rendered = await window.api.renderParts(result.scadCode, result.parts)
    setRenderedParts(rendered)
    setLog((prev) => [...prev, { role: 'assistant', text: result.summary }])
  }

  async function handleSubmit() {
    if (!prompt.trim() || loading) return
    setError('')
    setLoading(true)
    setLog((prev) => [...prev, { role: 'user', text: prompt }])
    const instruction = prompt
    setPrompt('')
    try {
      const result = design
        ? await window.api.reviseDesign(design.scadCode, design.parts, instruction, printer.buildVolumeMm)
        : await window.api.generateDesign(instruction, printer.buildVolumeMm)
      await renderAndShow(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <h2>Diseña algo para tu {printer.name}</h2>
      <div className="design-layout" style={{ flex: 1, minHeight: 0 }}>
        <div className="viewer-pane">
          {renderedParts.length > 0 ? (
            <StlViewer parts={renderedParts} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
              {loading ? 'Generando diseño…' : 'Describe lo que quieres imprimir para empezar'}
            </div>
          )}
        </div>
        <div className="chat-pane">
          <div className="chat-log">
            {log.map((entry, i) => (
              <div key={i} className={`chat-msg ${entry.role}`}>
                {entry.text}
              </div>
            ))}
          </div>
          {design && (
            <div className="parts-list">
              {design.parts.map((p) => (
                <span key={p.id} className="part-chip">
                  <span className="swatch" style={{ background: p.color }} />
                  {p.name}
                </span>
              ))}
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <textarea
            rows={3}
            placeholder={design ? 'Pide un cambio, ej: haz las líneas más delgadas' : 'Ej: balón de básquet mini, naranja con líneas negras'}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <div className="row">
            <button className="btn" disabled={loading || !prompt.trim()} onClick={handleSubmit}>
              {loading ? 'Generando…' : design ? 'Pedir cambio' : 'Generar diseño'}
            </button>
            {design && (
              <button className="btn secondary" disabled={loading} onClick={() => onApproved(design.scadCode, design.parts)}>
                Aprobar diseño
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
