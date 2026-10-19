import { useState } from 'react'
import type { LocalAccount } from '../api'

interface Props {
  onCreated: (account: LocalAccount) => void
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function Login({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)

  const canSubmit = name.trim().length > 0 && isValidEmail(email) && !creating

  async function handleCreate() {
    if (!canSubmit) return
    setCreating(true)
    try {
      const account = await window.api.createAccount(name, email)
      onCreated(account)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="screen"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}
    >
      <h2>Bienvenido a Zelqoritha</h2>
      <p style={{ color: 'var(--muted)', maxWidth: 420, marginBottom: 24 }}>
        Crea tu cuenta para empezar. Con tu correo te damos acceso automático a la generación de
        diseños — no necesitas configurar nada más.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre"
        style={{ maxWidth: 280, marginBottom: 10, textAlign: 'center' }}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu correo"
        type="email"
        style={{ maxWidth: 280, marginBottom: 16, textAlign: 'center' }}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      <button className="btn" disabled={!canSubmit} onClick={handleCreate}>
        {creating ? 'Preparando tu acceso…' : 'Entrar'}
      </button>
    </div>
  )
}
