export interface PrinterModel {
  id: string
  name: string
  buildVolumeMm: { x: number; y: number; z: number }
  hasAms: boolean
  note?: string
}

export interface DesignPart {
  id: string
  name: string
  color: string
}

export interface DesignResult {
  scadCode: string
  parts: DesignPart[]
  summary: string
}

export interface RenderedPart extends DesignPart {
  stlBase64: string
}

export interface AppConfig {
  geminiApiKey: string
  openscadPath: string
  selectedPrinterIds: string[]
}

export interface BambuSendResult {
  ok: boolean
  message: string
}

export interface Api {
  listPrinters: () => Promise<PrinterModel[]>
  getConfig: () => Promise<AppConfig>
  setConfig: (partial: Partial<AppConfig>) => Promise<AppConfig>
  checkOpenscad: () => Promise<boolean>
  generateDesign: (prompt: string, buildVolumeMm: PrinterModel['buildVolumeMm']) => Promise<DesignResult>
  reviseDesign: (
    scadCode: string,
    parts: DesignPart[],
    instruction: string,
    buildVolumeMm: PrinterModel['buildVolumeMm']
  ) => Promise<DesignResult>
  renderParts: (scadCode: string, parts: DesignPart[]) => Promise<RenderedPart[]>
  sendToBambuStudio: (
    scadCode: string,
    parts: DesignPart[],
    printerId: string,
    plateCount: number,
    copiesPerPlate: number
  ) => Promise<BambuSendResult>
}

declare global {
  interface Window {
    api: Api
  }
}
