import { store } from './config'
import type { DesignPart } from './openscad'

export interface DesignResult {
  scadCode: string
  parts: DesignPart[]
  summary: string
}

const GENERATE_URL = 'https://zelqoritha.vercel.app/api/generate-design'
const REVISE_URL = 'https://zelqoritha.vercel.app/api/revise-design'

function requireEmail(): string {
  const email = store.get('account')?.email
  if (!email) throw new Error('Falta iniciar sesión.')
  return email
}

async function callBackend(url: string, body: Record<string, unknown>): Promise<DesignResult> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (res.status === 429) {
    throw new Error('ZELQORITHA_LIMIT_REACHED')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `El servidor de Zelqoritha respondió con error (${res.status}).`)
  }
  return (await res.json()) as DesignResult
}

export async function generateDesign(
  prompt: string,
  buildVolumeMm: { x: number; y: number; z: number }
): Promise<DesignResult> {
  const t0 = Date.now()
  const result = await callBackend(GENERATE_URL, { email: requireEmail(), prompt, buildVolumeMm })
  console.log(`[gemini] generateDesign: ${Date.now() - t0}ms`)
  return result
}

export async function reviseDesign(
  previousScadCode: string,
  previousParts: DesignPart[],
  instruction: string,
  buildVolumeMm: { x: number; y: number; z: number }
): Promise<DesignResult> {
  const t0 = Date.now()
  const result = await callBackend(REVISE_URL, {
    email: requireEmail(),
    scadCode: previousScadCode,
    parts: previousParts,
    instruction,
    buildVolumeMm
  })
  console.log(`[gemini] reviseDesign: ${Date.now() - t0}ms`)
  return result
}
