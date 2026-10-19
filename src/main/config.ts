import Store from 'electron-store'

export interface LocalAccount {
  name: string
  email: string
}

interface AppConfig {
  openscadPath: string
  selectedPrinterIds: string[]
  account: LocalAccount | null
}

const defaults: AppConfig = {
  openscadPath: '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
  selectedPrinterIds: [],
  account: null
}

export const store = new Store<AppConfig>({ defaults })
