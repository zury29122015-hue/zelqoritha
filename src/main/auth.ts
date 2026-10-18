import { store, type LocalAccount } from './config'

export function createAccount(name: string): LocalAccount {
  const account: LocalAccount = { name: name.trim() }
  store.set('account', account)
  return account
}

export function getAccount(): LocalAccount | null {
  return store.get('account')
}

export function signOut(): void {
  store.set('account', null)
}
