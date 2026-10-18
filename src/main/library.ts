import Store from 'electron-store'
import type { DesignPart } from './openscad'

export interface SavedDesign {
  id: string
  createdAt: number
  updatedAt: number
  prompt: string
  summary: string
  scadCode: string
  parts: DesignPart[]
  printerId: string
}

interface LibrarySchema {
  designs: SavedDesign[]
}

const store = new Store<LibrarySchema>({ name: 'library', defaults: { designs: [] } })

export function listDesigns(): SavedDesign[] {
  return [...store.get('designs')].sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getDesign(id: string): SavedDesign | undefined {
  return store.get('designs').find((d) => d.id === id)
}

export function upsertDesign(design: SavedDesign): SavedDesign {
  const designs = store.get('designs')
  const i = designs.findIndex((d) => d.id === design.id)
  if (i >= 0) designs[i] = design
  else designs.push(design)
  store.set('designs', designs)
  return design
}

export function deleteDesign(id: string): void {
  store.set(
    'designs',
    store.get('designs').filter((d) => d.id !== id)
  )
}
