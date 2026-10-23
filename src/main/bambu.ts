import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderParts, type DesignPart } from './openscad'
import { PRINTERS } from './printers'

const PROFILES_DIR = '/Applications/BambuStudio.app/Contents/Resources/profiles/BBL'
const BAMBU_BIN = '/Applications/BambuStudio.app/Contents/MacOS/BambuStudio'

interface Profile {
  machine: string
  process: string
  filament: string
}

// Rutas verificadas a mano contra los perfiles que trae instalados Bambu Studio.
const PRINTER_PROFILES: Record<string, Profile> = {
  'a1-mini': {
    machine: 'machine/Bambu Lab A1 mini 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL A1M.json',
    filament: 'filament/Bambu PLA Basic @BBL A1M.json'
  },
  a1: {
    machine: 'machine/Bambu Lab A1 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL A1.json',
    filament: 'filament/Bambu PLA Basic @BBL A1.json'
  },
  p1p: {
    machine: 'machine/Bambu Lab P1P 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL P1P.json',
    filament: 'filament/P1P/Bambu PLA Basic @BBL P1P.json'
  },
  p1s: {
    machine: 'machine/Bambu Lab P1S 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL X1C.json',
    filament: 'filament/Bambu PLA Basic @BBL P1S 0.4 nozzle.json'
  },
  x1: {
    machine: 'machine/Bambu Lab X1 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL X1C.json',
    filament: 'filament/Bambu PLA Basic @BBL X1.json'
  },
  'x1-carbon': {
    machine: 'machine/Bambu Lab X1 Carbon 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL X1C.json',
    filament: 'filament/Bambu PLA Basic @BBL X1.json'
  },
  x1e: {
    machine: 'machine/Bambu Lab X1E 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL X1C.json',
    filament: 'filament/Bambu PLA Basic @BBL X1.json'
  },
  h2d: {
    machine: 'machine/Bambu Lab H2D 0.4 nozzle.json',
    process: 'process/0.20mm Standard @BBL H2D.json',
    filament: 'filament/Bambu PLA Basic @BBL H2D.json'
  }
}

function run(bin: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { cwd })
    let out = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.stderr.on('data', (d) => (out += d.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Bambu Studio salió con código ${code}:\n${out}`))
    })
  })
}

/**
 * El color real que se ve en Bambu Studio vive en Metadata/project_settings.config
 * dentro del .3mf (campo filament_colour), no en el preset de filamento que carga
 * la CLI. Lo parcheamos directo en el zip después de exportar.
 */
async function patchFilamentColors(mfPath: string, colors: string[], workDir: string): Promise<void> {
  const extractDir = join(workDir, `extract-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  await run('unzip', ['-o', mfPath, '-d', extractDir], workDir)

  const settingsPath = join(extractDir, 'Metadata', 'project_settings.config')
  const settings = JSON.parse(await readFile(settingsPath, 'utf-8'))
  settings.filament_colour = colors
  settings.default_filament_colour = colors
  await writeFile(settingsPath, JSON.stringify(settings, null, 4), 'utf-8')

  await run('zip', ['-r', '-X', mfPath, '.'], extractDir)
  await rm(extractDir, { recursive: true, force: true })
}

interface Triangle {
  normal: [number, number, number]
  verts: [[number, number, number], [number, number, number], [number, number, number]]
}

function parseAsciiStl(text: string): Triangle[] {
  const triangles: Triangle[] = []
  const facetRe =
    /facet normal\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)[\s\S]*?outer loop([\s\S]*?)endloop/g
  const vertexRe = /vertex\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/g
  let m: RegExpExecArray | null
  while ((m = facetRe.exec(text))) {
    const normal: [number, number, number] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const verts: [number, number, number][] = []
    let vm: RegExpExecArray | null
    vertexRe.lastIndex = 0
    while ((vm = vertexRe.exec(m[4]))) {
      verts.push([Number(vm[1]), Number(vm[2]), Number(vm[3])])
    }
    if (verts.length === 3) {
      triangles.push({ normal, verts: verts as Triangle['verts'] })
    }
  }
  return triangles
}

function bboxOf(triangles: Triangle[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const t of triangles) {
    for (const [x, y] of t.verts) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return { minX, maxX, minY, maxY }
}

function writeAsciiStl(name: string, triangles: Triangle[]): string {
  const lines = [`solid ${name}`]
  for (const t of triangles) {
    lines.push(`  facet normal ${t.normal.join(' ')}`)
    lines.push('    outer loop')
    for (const v of t.verts) lines.push(`      vertex ${v.join(' ')}`)
    lines.push('    endloop')
    lines.push('  endfacet')
  }
  lines.push(`endsolid ${name}`)
  return lines.join('\n')
}

function tileTriangles(triangles: Triangle[], offsets: [number, number][]): Triangle[] {
  const out: Triangle[] = []
  for (const [dx, dy] of offsets) {
    for (const t of triangles) {
      out.push({
        normal: t.normal,
        verts: t.verts.map(([x, y, z]) => [x + dx, y + dy, z]) as Triangle['verts']
      })
    }
  }
  return out
}

function scaleTriangles(triangles: Triangle[], scale: number): Triangle[] {
  if (scale === 1) return triangles
  return triangles.map((t) => ({
    normal: t.normal,
    verts: t.verts.map(([x, y, z]) => [x * scale, y * scale, z * scale]) as Triangle['verts']
  }))
}

/**
 * Acomoda `desiredCount` copias en una grilla dentro de la cama. Si no caben
 * al tamaño original, encoge el diseño (nunca lo agranda) hasta el factor
 * que las haga caber, como pide el usuario ("si pido 10 copias de una bola
 * que ocupa toda la placa, que la haga más chica para que quepan las 10").
 * Por debajo de MIN_SCALE ya no vale la pena seguir encogiendo (quedaría
 * impráctico de imprimir), así que ahí se reduce cuántas copias caben en vez
 * de seguir achicando.
 */
function computeGridLayout(
  unitW: number,
  unitH: number,
  bedW: number,
  bedH: number,
  desiredCount: number,
  marginMm = 6
): { offsets: [number, number][]; scale: number; fitted: number } {
  const MIN_SCALE = 0.15

  let best: { cols: number; rows: number; scale: number } | null = null
  for (let cols = 1; cols <= desiredCount; cols++) {
    const rows = Math.ceil(desiredCount / cols)
    const scaleX = (bedW - (cols - 1) * marginMm) / (cols * unitW)
    const scaleY = (bedH - (rows - 1) * marginMm) / (rows * unitH)
    const scale = Math.min(scaleX, scaleY, 1)
    if (scale <= 0) continue
    if (!best || scale > best.scale) best = { cols, rows, scale }
  }

  if (!best) {
    const scale = Math.max(Math.min(bedW / unitW, bedH / unitH, 1), 0.01)
    return { offsets: [[0, 0]], scale, fitted: 1 }
  }

  let { cols, scale } = best
  let fitted = desiredCount
  if (scale < MIN_SCALE) {
    scale = MIN_SCALE
    const maxCols = Math.max(1, Math.floor((bedW + marginMm) / (unitW * scale + marginMm)))
    const maxRows = Math.max(1, Math.floor((bedH + marginMm) / (unitH * scale + marginMm)))
    fitted = Math.min(desiredCount, maxCols * maxRows)
    cols = Math.min(maxCols, fitted)
  }

  const cellW = unitW * scale + marginMm
  const cellH = unitH * scale + marginMm
  const rowsUsed = Math.ceil(fitted / cols)
  const gridW = cols * cellW - marginMm
  const gridH = rowsUsed * cellH - marginMm
  const offsets: [number, number][] = []
  for (let i = 0; i < fitted; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = -gridW / 2 + cellW / 2 + col * cellW
    const y = gridH / 2 - cellH / 2 - row * cellH
    offsets.push([x, y])
  }
  return { offsets, scale, fitted }
}

export interface BambuSendResult {
  ok: boolean
  message: string
}

export async function sendToBambuStudio(
  scadCode: string,
  parts: DesignPart[],
  printerId: string,
  plateCount: number,
  copiesPerPlate: number
): Promise<BambuSendResult> {
  const printer = PRINTERS.find((p) => p.id === printerId)
  const profile = PRINTER_PROFILES[printerId]
  if (!printer || !profile) {
    return { ok: false, message: `No tengo un perfil de Bambu Studio para "${printerId}".` }
  }

  const machinePath = join(PROFILES_DIR, profile.machine)
  const processPath = join(PROFILES_DIR, profile.process)
  const filamentPath = join(PROFILES_DIR, profile.filament)

  const rendered = await renderParts(scadCode, parts)
  const partTriangles = rendered.map((p) => ({ part: p, triangles: parseAsciiStl(Buffer.from(p.stlBase64, 'base64').toString('utf-8')) }))

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const { triangles } of partTriangles) {
    const b = bboxOf(triangles)
    minX = Math.min(minX, b.minX)
    maxX = Math.max(maxX, b.maxX)
    minY = Math.min(minY, b.minY)
    maxY = Math.max(maxY, b.maxY)
  }
  const unitW = maxX - minX
  const unitH = maxY - minY

  const { offsets, scale, fitted } = computeGridLayout(
    unitW,
    unitH,
    printer.buildVolumeMm.x,
    printer.buildVolumeMm.y,
    copiesPerPlate
  )

  const dir = await mkdtemp(join(tmpdir(), 'bambu-plates-'))
  const plateFiles: string[] = []

  for (let plate = 1; plate <= plateCount; plate++) {
    const stlPaths: string[] = []
    for (const { part, triangles } of partTriangles) {
      const scaled = scaleTriangles(triangles, scale)
      const tiled = tileTriangles(scaled, offsets)
      const stlText = writeAsciiStl(part.id, tiled)
      const stlPath = join(dir, `plate${plate}_${part.id}.stl`)
      await writeFile(stlPath, stlText, 'utf-8')
      stlPaths.push(stlPath)
    }

    const filamentArgs = stlPaths.map(() => filamentPath).join(';')
    const filamentIds = partTriangles.map((_, i) => String(i + 1)).join(',')
    const outPath = join(dir, `placa_${plate}.3mf`)

    await run(
      BAMBU_BIN,
      [
        '--load-settings',
        `${machinePath};${processPath}`,
        '--load-filaments',
        filamentArgs,
        '--load-filament-ids',
        filamentIds,
        '--assemble',
        '--export-3mf',
        outPath,
        ...stlPaths
      ],
      dir
    )

    const colors = partTriangles.map(({ part }) => part.color.toUpperCase())
    await patchFilamentColors(outPath, colors, dir)

    plateFiles.push(outPath)
  }

  const fitNote =
    fitted < copiesPerPlate
      ? ` Reduje el tamaño al ${Math.round(scale * 100)}% y aun así solo entraron ${fitted} de ${copiesPerPlate} copias en la cama de ${printer.name}.`
      : scale < 1
        ? ` Reduje el tamaño al ${Math.round(scale * 100)}% para que cupieran las ${copiesPerPlate} copias en la cama de ${printer.name}.`
        : ''

  // Se intentó automatizar que cargara en la ventana ya abierta de Bambu Studio
  // (Archivo > Importar vía AppleScript/System Events), pero resultó frágil y
  // en un intento llegó a revolver los colores de un proyecto real del usuario.
  // Mejor y más seguro: siempre abrir como archivo nuevo.
  //
  // Si Bambu Studio ya tiene un proyecto abierto (de un envío anterior, o de otra
  // placa de este mismo envío) y le mandamos otro archivo con "open -a", lo carga
  // como "solo geometría": pierde su posición en la cama y su organización de
  // piezas/colores, y por eso el diseño aparecía fuera de la placa habiendo que
  // moverlo a mano. "open -n" fuerza una instancia nueva de la app por cada placa,
  // así cada una siempre carga como proyecto completo, ya centrada en la cama.
  for (const file of plateFiles) {
    await run('open', ['-n', '-a', 'BambuStudio', file], dir)
  }

  return {
    ok: true,
    message: `Armé ${plateCount} placa(s) con ${fitted} copia(s) cada una y abrí cada una en su propia ventana de Bambu Studio, ya centradas en la cama.${fitNote}`
  }
}
