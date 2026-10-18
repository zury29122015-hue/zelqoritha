import { useState } from 'react'
import type { GoogleAccount } from '../api'

interface Props {
  onSignedIn: (account: GoogleAccount) => void
  onOpenSettings: () => void
}

export function Login({ onSignedIn, onOpenSettings }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSignIn() {
    setLoading(true)
    setError('')
    try {
      const account = await window.api.signInWithGoogle()
      onSignedIn(account)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="screen"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}
    >
      <button className="link" onClick={onOpenSettings} style={{ position: 'fixed', top: 12, right: 20 }}>
        Ajustes
      </button>
      <h2>Bienvenido a Bambu Design Studio</h2>
      <p style={{ color: 'var(--muted)', maxWidth: 420, marginBottom: 24 }}>
        Inicia sesión con Google para crear tu cuenta. Tus diseños se guardan solo en esta computadora.
      </p>
      {error && <div className="error" style={{ marginBottom: 16, maxWidth: 420 }}>{error}</div>}
      <button className="btn" disabled={loading} onClick={handleSignIn}>
        {loading ? 'Abriendo el navegador…' : 'Iniciar sesión con Google'}
      </button>
      {loading && (
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 16, maxWidth: 420 }}>
          Se abrió tu navegador para que inicies sesión. Vuelve aquí cuando termines.
        </p>
      )}
    </div>
  )
}
