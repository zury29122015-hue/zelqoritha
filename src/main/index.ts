import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRINTERS } from './printers'
import { store } from './config'
import { checkOpenscadAvailable, renderParts, type DesignPart } from './openscad'
import { generateDesign, reviseDesign } from './gemini'
import { sendToBambuStudio } from './bambu'
import { listDesigns, getDesign, upsertDesign, deleteDesign, type SavedDesign } from './library'
import { signInWithGoogle, getAccount, signOutGoogle } from './auth'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('printers:list', () => PRINTERS)

ipcMain.handle('config:get', () => store.store)

ipcMain.handle('config:set', (_e, partial: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(partial)) {
    store.set(key as never, value as never)
  }
  return store.store
})

ipcMain.handle('openscad:check', () => checkOpenscadAvailable())

ipcMain.handle('design:generate', (_e, prompt: string, buildVolumeMm: { x: number; y: number; z: number }) =>
  generateDesign(prompt, buildVolumeMm)
)

ipcMain.handle(
  'design:revise',
  (
    _e,
    scadCode: string,
    parts: DesignPart[],
    instruction: string,
    buildVolumeMm: { x: number; y: number; z: number }
  ) => reviseDesign(scadCode, parts, instruction, buildVolumeMm)
)

ipcMain.handle('design:renderParts', (_e, scadCode: string, parts: DesignPart[]) => renderParts(scadCode, parts))

ipcMain.handle(
  'bambu:send',
  (_e, scadCode: string, parts: DesignPart[], printerId: string, plateCount: number, copiesPerPlate: number) =>
    sendToBambuStudio(scadCode, parts, printerId, plateCount, copiesPerPlate)
)

ipcMain.handle('auth:signIn', () => signInWithGoogle())
ipcMain.handle('auth:getAccount', () => getAccount())
ipcMain.handle('auth:signOut', () => signOutGoogle())

ipcMain.handle('library:list', () => listDesigns())
ipcMain.handle('library:get', (_e, id: string) => getDesign(id))
ipcMain.handle('library:upsert', (_e, design: SavedDesign) => upsertDesign(design))
ipcMain.handle('library:delete', (_e, id: string) => deleteDesign(id))

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
