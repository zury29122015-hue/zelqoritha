import { store, type LocalAccount } from './config'

const PROVISION_URL = 'https://zelqoritha.vercel.app/api/provision-key'

/**
 * Al crear la cuenta le pedimos al servidor de Zelqoritha una API key de Gemini
 * propia para ese correo (la crea si no existe, o devuelve la que ya tenía) y la
 * guardamos directo en config: el usuario nunca necesita pegar nada a mano.
 * Si falla (sin internet, servidor caído), la cuenta se crea igual y el usuario
 * puede pegar su propia key en Ajustes como respaldo.
 */
export async function createAccount(name: string, email: string): Promise<LocalAccount> {
  const account: LocalAccount = { name: name.trim(), email: email.trim().toLowerCase() }
  store.set('account', account)

  try {
    const res = await fetch(PROVISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email })
    })
    if (res.ok) {
      const data = (await res.json()) as { apiKey?: string }
      if (data.apiKey) store.set('geminiApiKey', data.apiKey)
    }
  } catch (err) {
    console.log('[auth] no se pudo provisionar la API key automáticamente:', err)
  }

  return account
}

export function renameAccount(name: string): LocalAccount {
  const current = store.get('account')
  const account: LocalAccount = { name: name.trim(), email: current?.email ?? '' }
  store.set('account', account)
  return account
}

export function getAccount(): LocalAccount | null {
  return store.get('account')
}

export function signOut(): void {
  store.set('account', null)
}
