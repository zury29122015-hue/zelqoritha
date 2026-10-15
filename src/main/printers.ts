export interface PrinterModel {
  id: string
  name: string
  buildVolumeMm: { x: number; y: number; z: number }
  hasAms: boolean
  note?: string
}

// Volúmenes de impresión según las fichas técnicas públicas de Bambu Lab.
// El de H2D es el más reciente y menos verificado por nosotros: lo marcamos
// como aproximado para que se pueda corregir fácil si hace falta.
export const PRINTERS: PrinterModel[] = [
  { id: 'a1-mini', name: 'A1 mini', buildVolumeMm: { x: 180, y: 180, z: 180 }, hasAms: true },
  { id: 'a1', name: 'A1', buildVolumeMm: { x: 256, y: 256, z: 256 }, hasAms: true },
  { id: 'p1p', name: 'P1P', buildVolumeMm: { x: 256, y: 256, z: 256 }, hasAms: true },
  { id: 'p1s', name: 'P1S', buildVolumeMm: { x: 256, y: 256, z: 256 }, hasAms: true },
  { id: 'x1', name: 'X1', buildVolumeMm: { x: 256, y: 256, z: 256 }, hasAms: true },
  { id: 'x1-carbon', name: 'X1 Carbon', buildVolumeMm: { x: 256, y: 256, z: 256 }, hasAms: true },
  { id: 'x1e', name: 'X1E', buildVolumeMm: { x: 256, y: 256, z: 256 }, hasAms: true },
  {
    id: 'h2d',
    name: 'H2D',
    buildVolumeMm: { x: 350, y: 320, z: 325 },
    hasAms: true,
    note: 'Medidas aproximadas, confírmalas en Bambu Studio si tienes esta impresora.'
  }
]
