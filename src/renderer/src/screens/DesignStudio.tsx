import { useEffect, useRef, useState } from 'react'
import type { DesignPart, DesignResult, PrinterModel, RenderedPart, SavedDesign } from '../api'
import { StlViewer } from '../components/StlViewer'

interface ChatEntry {
  role: 'user' | 'assistant'
  text: string
}

function friendlyError(raw: string): string {
  if (/"code":\s*503|UNAVAILABLE/.test(raw)) {
    return 'Gemini está saturado en este momento. Ya intenté varias veces automáticamente y no respondió — intenta de nuevo en un rato.'
  }
  if (/"code":\s*429|RESOURCE_EXHAUSTED/.test(raw)) {
    return 'Tu límite diario de Zelqoritha se acabó. Vuelve mañana para seguir diseñando.'
  }
  if (/Falta configurar tu API key/.test(raw)) {
    return 'Falta tu API key de Gemini — ponla en Ajustes.'
  }
  return raw.length > 220 ? raw.slice(0, 220) + '…' : raw
}

interface Props {
  printer: PrinterModel
  initialDesign?: SavedDesign
  workspaceId?: string | null
  onApproved: (scadCode: string, parts: DesignPart[]) => void
}

export function DesignStudio({ printer, initialDesign, workspaceId, onApproved }: Props) {
  const [prompt, setPrompt] = useState('')
  const [log, setLog] = useState<ChatEntry[]>(
    initialDesign
      ? [
          { role: 'user', text: initialDesign.prompt },
          { role: 'assistant', text: initialDesign.summary }
        ]
      : []
  )
  const [design, setDesign] = useState<DesignResult | null>(
    initialDesign ? { scadCode: initialDesign.scadCode, parts: initialDesign.parts, summary: initialDesign.summary } : null
  )
  const [renderedParts, setRenderedParts] = useState<RenderedPart[]>([])
  const [loading, setLoading] = useState(!!initialDesign)
  const [error, setError] = useState('')
  const [elapsedSec, setElapsedSec] = useState(0)

  const designId = useRef(initialDesign?.id ?? crypto.randomUUID())
  const firstPrompt = useRef(initialDesign?.prompt ?? '')
  const createdAt = useRef(initialDesign?.createdAt ?? Date.now())
  const resolvedWorkspaceId = initialDesign ? (initialDesign.workspaceId ?? null) : (workspaceId ?? null)
  const liked = useRef(initialDesign?.liked ?? false)

  useEffect(() => {
    if (!loading) return
    setElapsedSec(0)
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [loading])

  useEffect(() => {
    if (initialDesign) {
      window.api
        .renderParts(initialDesign.scadCode, initialDesign.parts)
        .then(setRenderedParts)
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveToLibrary(result: DesignResult) {
    const saved: SavedDesign = {
      id: designId.current,
      createdAt: createdAt.current,
      updatedAt: Date.now(),
      prompt: firstPrompt.current,
      summary: result.summary,
      scadCode: result.scadCode,
      parts: result.parts,
      printerId: printer.id,
      workspaceId: resolvedWorkspaceId,
      liked: liked.current
    }
    await window.api.upsertDesign(saved)
  }

  async function renderAndShow(result: DesignResult) {
    setDesign(result)
    const rendered = await window.api.renderParts(result.scadCode, result.parts)
    setRenderedParts(rendered)
    setLog((prev) => [...prev, { role: 'assistant', text: result.summary }])
    await saveToLibrary(result)
  }

  async function handleSubmit() {
    if (!prompt.trim() || loading) return
    setError('')
    setLoading(true)
    setLog((prev) => [...prev, { role: 'user', text: prompt }])
    const instruction = prompt
    if (!design && !firstPrompt.current) firstPrompt.current = instruction
    setPrompt('')
    try {
      const result = design
        ? await window.api.reviseDesign(design.scadCode, design.parts, instruction, printer.buildVolumeMm)
        : await window.api.generateDesign(instruction, printer.buildVolumeMm)
      await renderAndShow(result)
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)))
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: 6 }}>
              {loading ? (
                <>
                  <span>Generando diseño… ({elapsedSec}s)</span>
                  <span style={{ fontSize: 11 }}>
                    {elapsedSec < 90 ? 'Normalmente tarda entre 30s y 2 min' : 'Está tardando más de lo normal (puede que Gemini esté saturado), sigue intentando…'}
                  </span>
                </>
              ) : (
                'Describe lo que quieres imprimir para empezar'
              )}
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
              {loading ? `Generando… (${elapsedSec}s)` : design ? 'Pedir cambio' : 'Generar diseño'}
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
