import { useState } from 'react'
import type { DesignPart, PrinterModel } from './api'
import { PrinterSelect } from './screens/PrinterSelect'
import { DesignStudio } from './screens/DesignStudio'
import { PlateSetup } from './screens/PlateSetup'
import { Settings } from './screens/Settings'

type Step = 'printers' | 'design' | 'plates' | 'settings'

export function App() {
  const [step, setStep] = useState<Step>('printers')
  const [lastNonSettingsStep, setLastNonSettingsStep] = useState<Step>('printers')
  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [activePrinter, setActivePrinter] = useState<PrinterModel | null>(null)
  const [approved, setApproved] = useState<{ scadCode: string; parts: DesignPart[] } | null>(null)

  function goTo(next: Step) {
    if (step !== 'settings') setLastNonSettingsStep(step)
    setStep(next)
  }

  return (
    <>
      <div className="topbar">
        <h1>Bambu Design Studio</h1>
        {step === 'settings' ? (
          <button className="link" onClick={() => setStep(lastNonSettingsStep)}>
            ← Volver
          </button>
        ) : (
          <button className="link" onClick={() => goTo('settings')}>
            Ajustes
          </button>
        )}
      </div>

      {step === 'printers' && (
        <PrinterSelect
          onContinue={(selected) => {
            setPrinters(selected)
            setActivePrinter(selected[0] ?? null)
            setStep('design')
          }}
        />
      )}

      {step === 'design' && activePrinter && (
        <DesignStudio
          printer={activePrinter}
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

      {step !== 'settings' && printers.length > 1 && step !== 'printers' && (
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
