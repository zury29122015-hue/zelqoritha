import { randomUUID } from 'node:crypto'
import Store from 'electron-store'
import type { DesignPart } from './openscad'

export interface Workspace {
  id: string
  name: string
  createdAt: number
}

export interface SavedDesign {
  id: string
  createdAt: number
  updatedAt: number
  prompt: string
  summary: string
  scadCode: string
  parts: DesignPart[]
  printerId: string
  workspaceId: string | null
  liked: boolean
}

interface LibrarySchema {
  designs: SavedDesign[]
  workspaces: Workspace[]
}

const store = new Store<LibrarySchema>({ name: 'library', defaults: { designs: [], workspaces: [] } })

// Diseños guardados antes de agregar carpetas/like no tienen esos campos.
function normalize(d: SavedDesign): SavedDesign {
  return { ...d, workspaceId: d.workspaceId ?? null, liked: d.liked ?? false }
}

export function listDesigns(): SavedDesign[] {
  return store
    .get('designs')
    .map(normalize)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getDesign(id: string): SavedDesign | undefined {
  const d = store.get('designs').find((d) => d.id === id)
  return d ? normalize(d) : undefined
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

export function listWorkspaces(): Workspace[] {
  return [...store.get('workspaces')].sort((a, b) => a.createdAt - b.createdAt)
}

export function createWorkspace(name: string): Workspace {
  const ws: Workspace = { id: randomUUID(), name: name.trim(), createdAt: Date.now() }
  store.set('workspaces', [...store.get('workspaces'), ws])
  return ws
}

export function deleteWorkspace(id: string): void {
  store.set(
    'workspaces',
    store.get('workspaces').filter((w) => w.id !== id)
  )
  // los diseños de esa carpeta no se borran, solo quedan sin carpeta
  store.set(
    'designs',
    store.get('designs').map((d) => (d.workspaceId === id ? { ...d, workspaceId: null } : d))
  )
}
