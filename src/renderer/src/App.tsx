import { useEffect, useState } from 'react'
import type { DesignPart, LocalAccount, PrinterModel, SavedDesign } from './api'
import { PrinterSelect } from './screens/PrinterSelect'
import { DesignStudio } from './screens/DesignStudio'
import { PlateSetup } from './screens/PlateSetup'
import { Settings } from './screens/Settings'
import { MyDesigns } from './screens/MyDesigns'
import { Login } from './screens/Login'

type Step = 'login' | 'printers' | 'design' | 'plates' | 'settings' | 'library'

export function App() {
  const [checkingAccount, setCheckingAccount] = useState(true)
  const [account, setAccount] = useState<LocalAccount | null>(null)
  const [step, setStep] = useState<Step>('login')
  const [lastNonSettingsStep, setLastNonSettingsStep] = useState<Step>('login')
  const [printers, setPrinters] = useState<PrinterModel[]>([])
  const [activePrinter, setActivePrinter] = useState<PrinterModel | null>(null)
  const [approved, setApproved] = useState<{ scadCode: string; parts: DesignPart[] } | null>(null)
  const [openedDesign, setOpenedDesign] = useState<SavedDesign | undefined>(undefined)
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null)
  const [newDesignNonce, setNewDesignNonce] = useState(0)

  useEffect(() => {
    window.api
      .getAccount()
      .then((acc) => {
        setAccount(acc)
        setStep(acc ? 'printers' : 'login')
      })
      .finally(() => setCheckingAccount(false))
  }, [])

  function goTo(next: Step) {
    if (step !== 'settings') setLastNonSettingsStep(step)
    setStep(next)
  }

  function startNewDesign() {
    setOpenedDesign(undefined)
    setNewDesignNonce((n) => n + 1)
  }

  if (checkingAccount) return null

  if (step === 'login') {
    return (
      <Login
        onCreated={(acc) => {
          setAccount(acc)
          goTo('printers')
        }}
      />
    )
  }

  return (
    <>
      <div className="topbar">
        <h1>Kelvara</h1>
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
            goTo('design')
          }}
        />
      )}

      {step === 'design' && activePrinter && (
        <DesignStudio
          key={openedDesign?.id ?? `new-${newDesignNonce}`}
          printer={activePrinter}
          initialDesign={openedDesign}
          workspaceId={pendingWorkspaceId}
          onApproved={(scadCode, parts) => {
            setApproved({ scadCode, parts })
            goTo('plates')
          }}
        />
      )}

      {step === 'plates' && activePrinter && approved && (
        <PlateSetup
          printer={activePrinter}
          scadCode={approved.scadCode}
          parts={approved.parts}
          onDone={() => goTo('design')}
        />
      )}

      {step === 'settings' && (
        <Settings
          onChangePrinters={() => goTo('printers')}
          onSignedOut={() => {
            setAccount(null)
            setStep('login')
          }}
        />
      )}

      {step === 'library' && (
        <MyDesigns
          onBack={() => goTo(activePrinter ? 'design' : 'printers')}
          onOpen={(design, printer) => {
            setActivePrinter(printer)
            setOpenedDesign(design)
            goTo('design')
          }}
          onPrint={(design, printer) => {
            setActivePrinter(printer)
            setApproved({ scadCode: design.scadCode, parts: design.parts })
            goTo('plates')
          }}
          onCreateInWorkspace={(workspaceId) => {
            setPendingWorkspaceId(workspaceId)
            startNewDesign()
            goTo(activePrinter ? 'design' : 'printers')
          }}
        />
      )}

      {step !== 'settings' && step !== 'library' && printers.length > 1 && step !== 'printers' && (
        <div style={{ padding: '0 24px 16px', color: 'var(--muted)', fontSize: 12 }}>
          Imprimiendo con: {activePrinter?.name} ·{' '}
          <button className="link" onClick={() => goTo('printers')}>
            cambiar impresora
          </button>
        </div>
      )}

      {account && (
        <div style={{ position: 'fixed', bottom: 8, right: 12, fontSize: 11, color: 'var(--muted)' }}>
          {account.name}
        </div>
      )}
    </>
  )
}
