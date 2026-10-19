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

export interface LocalAccount {
  name: string
  email: string
}

export interface AppConfig {
  openscadPath: string
  selectedPrinterIds: string[]
  account: LocalAccount | null
}

export interface BambuSendResult {
  ok: boolean
  message: string
}

export interface SavedDesign {
  id: string
  createdAt: number
  updatedAt: number
  prompt: string
  summary: string
  scadCode: string
  parts: DesignPart[]
  printerId: string
  workspaceId: string | null
  liked: boolean
}

export interface Workspace {
  id: string
  name: string
  createdAt: number
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
  listDesigns: () => Promise<SavedDesign[]>
  getDesign: (id: string) => Promise<SavedDesign | undefined>
  upsertDesign: (design: SavedDesign) => Promise<SavedDesign>
  deleteDesign: (id: string) => Promise<void>
  createAccount: (name: string, email: string) => Promise<LocalAccount>
  renameAccount: (name: string) => Promise<LocalAccount>
  getAccount: () => Promise<LocalAccount | null>
  signOut: () => Promise<void>
  listWorkspaces: () => Promise<Workspace[]>
  createWorkspace: (name: string) => Promise<Workspace>
  deleteWorkspace: (id: string) => Promise<void>
}

declare global {
  interface Window {
    api: Api
  }
}
