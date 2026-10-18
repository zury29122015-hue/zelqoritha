import { contextBridge, ipcRenderer } from 'electron'

const api = {
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (partial: Record<string, unknown>) => ipcRenderer.invoke('config:set', partial),
  checkOpenscad: () => ipcRenderer.invoke('openscad:check'),
  generateDesign: (prompt: string, buildVolumeMm: { x: number; y: number; z: number }) =>
    ipcRenderer.invoke('design:generate', prompt, buildVolumeMm),
  reviseDesign: (
    scadCode: string,
    parts: unknown[],
    instruction: string,
    buildVolumeMm: { x: number; y: number; z: number }
  ) => ipcRenderer.invoke('design:revise', scadCode, parts, instruction, buildVolumeMm),
  renderParts: (scadCode: string, parts: unknown[]) => ipcRenderer.invoke('design:renderParts', scadCode, parts),
  sendToBambuStudio: (
    scadCode: string,
    parts: unknown[],
    printerId: string,
    plateCount: number,
    copiesPerPlate: number
  ) => ipcRenderer.invoke('bambu:send', scadCode, parts, printerId, plateCount, copiesPerPlate),
  createAccount: (name: string) => ipcRenderer.invoke('auth:create', name),
  getAccount: () => ipcRenderer.invoke('auth:getAccount'),
  signOut: () => ipcRenderer.invoke('auth:signOut'),
  listDesigns: () => ipcRenderer.invoke('library:list'),
  getDesign: (id: string) => ipcRenderer.invoke('library:get', id),
  upsertDesign: (design: unknown) => ipcRenderer.invoke('library:upsert', design),
  deleteDesign: (id: string) => ipcRenderer.invoke('library:delete', id),
  listWorkspaces: () => ipcRenderer.invoke('workspaces:list'),
  createWorkspace: (name: string) => ipcRenderer.invoke('workspaces:create', name),
  deleteWorkspace: (id: string) => ipcRenderer.invoke('workspaces:delete', id)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
