// Design Ref: §2.1 shared/components — 컬러 dot (Bid/Keyword/Budget 등)

type DotColor = 'orange' | 'green' | 'red' | 'gray' | 'blue'

type SemanticDotProps = {
  color: DotColor
  label?: string
  className?: string
}

const DOT_COLORS: Record<DotColor, string> = {
  orange: 'bg-orange-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
  blue: 'bg-blue-500',
}

const SemanticDot = ({ color, label, className = '' }: SemanticDotProps) => {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-th-text-secondary ${className}`}>
      <span className={`h-2 w-2 rounded-full ${DOT_COLORS[color]}`} />
      {label}
    </span>
  )
}

export { SemanticDot }
export type { DotColor }
