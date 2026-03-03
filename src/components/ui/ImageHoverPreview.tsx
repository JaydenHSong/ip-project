import type { ReactNode } from 'react'

type ImageHoverPreviewProps = {
  src: string
  alt?: string
  children: ReactNode
}

export const ImageHoverPreview = ({ src, alt, children }: ImageHoverPreviewProps) => (
  <span className="group relative inline-block">
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 rounded-lg border border-th-border bg-th-bg-secondary p-1 shadow-xl group-hover:block">
      <img src={src} alt={alt ?? ''} className="max-h-64 max-w-sm rounded" loading="lazy" />
    </span>
  </span>
)
