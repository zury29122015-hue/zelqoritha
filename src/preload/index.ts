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
  ) => ipcRenderer.invoke('bambu:send', scadCode, parts, printerId, plateCount, copiesPerPlate)
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
