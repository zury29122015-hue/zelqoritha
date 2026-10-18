import Store from 'electron-store'

export interface LocalAccount {
  name: string
}

interface AppConfig {
  geminiApiKey: string
  openscadPath: string
  selectedPrinterIds: string[]
  account: LocalAccount | null
}

const defaults: AppConfig = {
  geminiApiKey: '',
  openscadPath: '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
  selectedPrinterIds: [],
  account: null
}

export const store = new Store<AppConfig>({ defaults })
