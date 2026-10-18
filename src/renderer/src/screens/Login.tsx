import { useState } from 'react'
import type { LocalAccount } from '../api'

interface Props {
  onCreated: (account: LocalAccount) => void
}

export function Login({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!name.trim() || creating) return
    setCreating(true)
    try {
      const account = await window.api.createAccount(name)
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
        Crea tu cuenta para empezar. Se guarda solo en esta computadora.
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre"
        style={{ maxWidth: 280, marginBottom: 16, textAlign: 'center' }}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      <button className="btn" disabled={!name.trim() || creating} onClick={handleCreate}>
        {creating ? 'Creando…' : 'Crear mi cuenta'}
      </button>
    </div>
  )
}
