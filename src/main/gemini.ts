import { GoogleGenAI, Type } from '@google/genai'
import { store } from './config'
import type { DesignPart } from './openscad'

export interface DesignResult {
  scadCode: string
  parts: DesignPart[]
  summary: string
}

const MODEL = 'gemini-flash-latest'

const SYSTEM_PROMPT = `Eres un generador de modelos 3D parametricos en OpenSCAD para impresion FDM en impresoras Bambu Lab.

Reglas estrictas del codigo OpenSCAD que generas:
1. Defines un modulo por pieza/color, nombrado exactamente "part_<id>()" donde <id> coincide con el "id" de cada parte en el manifiesto.
2. Al final del archivo agregas un bloque de seleccion usando la variable "render_part" (string, con valor por defecto "all"):
   render_part = "all";
   if (render_part == "all") { part_a(); part_b(); /* ... todas */ }
   else if (render_part == "a") part_a();
   else if (render_part == "b") part_b();
   (una rama "else if" por cada id del manifiesto, mas la rama "all" que las junta todas)
3. El modelo completo debe caber dentro del volumen de impresion dado (en milimetros), centrado en el origen (x=0, y=0) y apoyado en z=0 (nada de coordenadas negativas en z).
4. Usa solo primitivas y operaciones de OpenSCAD (cube, cylinder, sphere, union, difference, intersection, hull, minkowski, linear_extrude, rotate_extrude, etc). Nada de imports externos.
5. Las piezas pueden superponerse apenas (0.1-0.2mm) donde deban unirse para impresion multi-color, pero evita solapes grandes que generen huecos raros.
6. Geometria razonable para impresion 3D: evita voladizos imposibles sin soporte cuando puedas, paredes con grosor minimo de ~1.2mm.
7. Prioriza velocidad de respuesta: usa representaciones simplificadas y pocas piezas repetidas en vez de geometria exacta/compleja (ej. un balon de futbol puede ser una esfera con unas pocas franjas o manchas, no un icosaedro truncado con 32 paneles calculados uno por uno). No agregues comentarios en el codigo.

Responde unicamente con el objeto estructurado pedido (summary, parts, scadCode). El campo scadCode es el archivo OpenSCAD completo como string, compacto, incluyendo los modulos y el bloque de seleccion render_part.`

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: 'Una frase breve en español describiendo el diseño actual' },
    parts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          color: { type: Type.STRING, description: 'Color hex, ej #FF8800' }
        },
        required: ['id', 'name', 'color']
      }
    },
    scadCode: { type: Type.STRING }
  },
  required: ['summary', 'parts', 'scadCode']
}

function client(): GoogleGenAI {
  const apiKey = store.get('geminiApiKey')
  if (!apiKey) throw new Error('Falta configurar tu API key de Gemini en Ajustes.')
  return new GoogleGenAI({ apiKey })
}

function isRetryableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return /"code":\s*503|"code":\s*429|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(message)
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < attempts - 1 && isRetryableError(err)) {
        const waitMs = 1500 * Math.pow(2, i)
        console.log(`[gemini] intento ${i + 1} falló (reintentable), esperando ${waitMs}ms…`)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

function parseDesignResponse(text: string): DesignResult {
  const parsed = JSON.parse(text)
  if (!parsed.scadCode || !Array.isArray(parsed.parts)) {
    throw new Error('Respuesta de Gemini incompleta (faltan scadCode o parts).')
  }
  return parsed as DesignResult
}

export async function generateDesign(
  prompt: string,
  buildVolumeMm: { x: number; y: number; z: number }
): Promise<DesignResult> {
  const ai = client()
  const t0 = Date.now()
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: `Volumen de impresion disponible: ${buildVolumeMm.x} x ${buildVolumeMm.y} x ${buildVolumeMm.z} mm.\n\nDiseño pedido: ${prompt}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  )
  console.log(
    `[gemini] generateDesign: ${Date.now() - t0}ms, usage=${JSON.stringify(response.usageMetadata)}`
  )
  return parseDesignResponse(response.text ?? '')
}

export async function reviseDesign(
  previousScadCode: string,
  previousParts: DesignPart[],
  instruction: string,
  buildVolumeMm: { x: number; y: number; z: number }
): Promise<DesignResult> {
  const ai = client()
  const t0 = Date.now()
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: `Volumen de impresion disponible: ${buildVolumeMm.x} x ${buildVolumeMm.y} x ${buildVolumeMm.z} mm.

Este es el codigo OpenSCAD y manifiesto de piezas actuales:

MANIFIESTO:
${JSON.stringify(previousParts, null, 2)}

CODIGO:
${previousScadCode}

Cambio pedido por el usuario: ${instruction}

Devuelve el objeto completo actualizado (scadCode entero, no un diff).`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  )
  console.log(
    `[gemini] reviseDesign: ${Date.now() - t0}ms, usage=${JSON.stringify(response.usageMetadata)}`
  )
  return parseDesignResponse(response.text ?? '')
}
