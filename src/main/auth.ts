import { randomBytes, createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { shell } from 'electron'
import Store from 'electron-store'
import { store, type GoogleAccount } from './config'

interface TokenSchema {
  accessToken: string
  refreshToken: string
}

const tokenStore = new Store<TokenSchema>({ name: 'tokens', defaults: { accessToken: '', refreshToken: '' } })

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Abre un servidor HTTP efímero en 127.0.0.1 para recibir la redirección de
 * OAuth (flujo "loopback IP address" para apps instaladas: Google permite
 * cualquier puerto en localhost para credenciales de tipo "Desktop app",
 * sin tener que registrar una URI de redirección fija).
 */
function startLoopbackServer(): Promise<{ port: number; waitForCode: () => Promise<string> }> {
  return new Promise((resolveStart) => {
    let resolveCode: (code: string) => void
    let rejectCode: (err: Error) => void
    const codePromise = new Promise<string>((res, rej) => {
      resolveCode = res
      rejectCode = rej
    })

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (url.pathname !== '/callback') {
        res.writeHead(404)
        res.end()
        return
      }
      const code = url.searchParams.get('code')
      const errorParam = url.searchParams.get('error')
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(
        errorParam
          ? `<html><body style="font-family:sans-serif">No se pudo iniciar sesión (${errorParam}). Puedes cerrar esta pestaña.</body></html>`
          : `<html><body style="font-family:sans-serif">Listo, ya puedes cerrar esta pestaña y volver a Bambu Design Studio.</body></html>`
      )
      server.close()
      if (errorParam || !code) rejectCode(new Error(errorParam ?? 'No llegó el código de autorización.'))
      else resolveCode(code)
    })

    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolveStart({
        port,
        waitForCode: () => {
          const timeout = setTimeout(() => {
            server.close()
            rejectCode(new Error('Se agotó el tiempo de espera para iniciar sesión (5 min).'))
          }, 5 * 60 * 1000)
          return codePromise.finally(() => clearTimeout(timeout))
        }
      })
    })
  })
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${url} respondió ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function signInWithGoogle(): Promise<GoogleAccount> {
  const clientId = store.get('googleClientId')
  const clientSecret = store.get('googleClientSecret')
  if (!clientId) {
    throw new Error('Falta configurar el Client ID de Google en Ajustes antes de iniciar sesión.')
  }

  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())

  const { port, waitForCode } = await startLoopbackServer()
  const redirectUri = `http://127.0.0.1:${port}/callback`

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid email profile')
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  await shell.openExternal(authUrl.toString())

  const code = await waitForCode()

  const tokens = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret || '',
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    }).toString()
  })

  const profile = await fetchJson('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  })

  const account: GoogleAccount = {
    name: profile.name ?? profile.email,
    email: profile.email ?? '',
    picture: profile.picture ?? ''
  }
  store.set('account', account)
  tokenStore.set('accessToken', tokens.access_token ?? '')
  tokenStore.set('refreshToken', tokens.refresh_token ?? '')
  return account
}

export function getAccount(): GoogleAccount | null {
  return store.get('account')
}

export function signOutGoogle(): void {
  store.set('account', null)
  tokenStore.clear()
}
