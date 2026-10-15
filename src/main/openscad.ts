import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { store } from './config'

function run(bin: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args)
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d.toString()))
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`OpenSCAD salió con código ${code}:\n${stderr || stdout}`))
    })
  })
}

export interface DesignPart {
  id: string
  name: string
  color: string
}

export interface RenderedPart extends DesignPart {
  stlBase64: string
}

/**
 * Convención esperada en el código OpenSCAD generado por Claude:
 * un bloque `if (render_part == "...") part_X(); else if (...) ...`
 * que permite aislar cada pieza vía `-D render_part="<id>"`.
 */
export async function renderParts(scadCode: string, parts: DesignPart[]): Promise<RenderedPart[]> {
  const openscadPath = store.get('openscadPath')
  const dir = await mkdtemp(join(tmpdir(), 'bambu-design-'))
  const scadFile = join(dir, 'model.scad')
  await writeFile(scadFile, scadCode, 'utf-8')

  try {
    const rendered: RenderedPart[] = []
    for (const part of parts) {
      const stlFile = join(dir, `${part.id}.stl`)
      await run(openscadPath, ['-D', `render_part="${part.id}"`, '-o', stlFile, scadFile])
      const buf = await readFile(stlFile)
      rendered.push({ ...part, stlBase64: buf.toString('base64') })
    }
    return rendered
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function renderCombinedStl(scadCode: string, outPath: string): Promise<void> {
  const openscadPath = store.get('openscadPath')
  const dir = await mkdtemp(join(tmpdir(), 'bambu-design-'))
  const scadFile = join(dir, 'model.scad')
  await writeFile(scadFile, scadCode, 'utf-8')
  try {
    await run(openscadPath, ['-D', 'render_part="all"', '-o', outPath, scadFile])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function checkOpenscadAvailable(): Promise<boolean> {
  try {
    await run(store.get('openscadPath'), ['--version'])
    return true
  } catch {
    return false
  }
}
