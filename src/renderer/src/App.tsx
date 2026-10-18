import { useState } from 'react'
import type { DesignPart, PrinterModel, SavedDesign } from './api'
import { PrinterSelect } from './screens/PrinterSelect'
import { DesignStudio } from './screens/DesignStudio'
import { PlateSetup } from './screens/PlateSetup'
import { Settings } from './screens/Settings'
import { MyDesigns } from './screens/MyDesigns'

type Step = 'printers' | 'design' | 'plates' | 'settings' | 'library'

export function App() {
  const [step, setStep] = useState<Step>('printers')
  const [lastNonSettingsStep, setLastNonSettingsStep] = useState<Step>('printers')
  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [activePrinter, setActivePrinter] = useState<PrinterModel | null>(null)
  const [approved, setApproved] = useState<{ scadCode: string; parts: DesignPart[] } | null>(null)
  const [openedDesign, setOpenedDesign] = useState<SavedDesign | undefined>(undefined)

  function goTo(next: Step) {
    if (step !== 'settings') setLastNonSettingsStep(step)
    setStep(next)
  }

  return (
    <>
      <div className="topbar">
        <h1>Bambu Design Studio</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {step === 'settings' ? (
            <button className="link" onClick={() => setStep(lastNonSettingsStep)}>
              ← Volver
            </button>
          ) : (
            <>
              <button className="link" onClick={() => goTo('library')}>
                Mis diseños
              </button>
              <button className="link" onClick={() => goTo('settings')}>
                Ajustes
              </button>
            </>
          )}
        </div>
      </div>

      {step === 'printers' && (
        <PrinterSelect
          onContinue={(selected) => {
            setPrinters(selected)
            setActivePrinter(selected[0] ?? null)
            setOpenedDesign(undefined)
            setStep('design')
          }}
        />
      )}

      {step === 'design' && activePrinter && (
        <DesignStudio
          key={openedDesign?.id ?? 'new'}
          printer={activePrinter}
          initialDesign={openedDesign}
          onApproved={(scadCode, parts) => {
            setApproved({ scadCode, parts })
            setStep('plates')
          }}
        />
      )}

      {step === 'plates' && activePrinter && approved && (
        <PlateSetup
          printer={activePrinter}
          scadCode={approved.scadCode}
          parts={approved.parts}
          onDone={() => setStep('design')}
        />
      )}

      {step === 'settings' && <Settings />}

      {step === 'library' && (
        <MyDesigns
          onOpen={(design, printer) => {
            setActivePrinter(printer)
            setOpenedDesign(design)
            setStep('design')
          }}
          onPrint={(design, printer) => {
            setActivePrinter(printer)
            setApproved({ scadCode: design.scadCode, parts: design.parts })
            setStep('plates')
          }}
        />
      )}

      {step !== 'settings' && step !== 'library' && printers.length > 1 && step !== 'printers' && (
        <div style={{ padding: '0 24px 16px', color: 'var(--muted)', fontSize: 12 }}>
          Imprimiendo con: {activePrinter?.name} ·{' '}
          <button className="link" onClick={() => setStep('printers')}>
            cambiar impresora
          </button>
        </div>
      )}
    </>
  )
}
