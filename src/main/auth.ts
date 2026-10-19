import { store, type LocalAccount } from './config'

export function createAccount(name: string, email: string): LocalAccount {
  const account: LocalAccount = { name: name.trim(), email: email.trim().toLowerCase() }
  store.set('account', account)
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
