import Store from 'electron-store'

export interface GoogleAccount {
  name: string
  email: string
  picture: string
}

interface AppConfig {
  geminiApiKey: string
  openscadPath: string
  selectedPrinterIds: string[]
  googleClientId: string
  googleClientSecret: string
  account: GoogleAccount | null
}

const defaults: AppConfig = {
  geminiApiKey: '',
  openscadPath: '/Applications/OpenSCAD.app/Contents/MacOS/OpenSCAD',
  selectedPrinterIds: [],
  googleClientId: '',
  googleClientSecret: '',
  account: null
}

export const store = new Store<AppConfig>({ defaults })
