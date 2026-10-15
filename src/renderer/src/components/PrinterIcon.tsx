interface Props {
  widthRatio: number // tamaño relativo de la caja de impresión, 0-1
  color: string
}

export function PrinterIcon({ widthRatio, color }: Props) {
  const boxSize = 20 + widthRatio * 50
  const offset = (90 - boxSize) / 2
  return (
    <svg viewBox="0 0 90 90" width="64" height="64">
      <rect x="4" y="68" width="82" height="10" rx="3" fill="#30343c" />
      <rect x="10" y="10" width="4" height="60" fill="#454b56" />
      <rect x="76" y="10" width="4" height="60" fill="#454b56" />
      <rect
        x={offset}
        y={78 - boxSize}
        width={boxSize}
        height={boxSize}
        rx="3"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
      />
      <circle cx="45" cy="22" r="3" fill={color} />
    </svg>
  )
}
