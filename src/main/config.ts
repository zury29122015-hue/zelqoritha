import Store from 'electron-store'

interface AppConfig {
  geminiApiKey: string
  openscadPath: string
  selectedPrinterIds: string[]
}

const defaults: AppConfig = {
  geminiApiKey: '',
  openscadPath: '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
  selectedPrinterIds: []
}

export const store = new Store<AppConfig>({ defaults })
