'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type BackButtonProps = {
  href?: string
  label?: string
  onClick?: () => void
}

export const BackButton = ({ href, label, onClick }: BackButtonProps) => {
  const className =
    'inline-flex items-center gap-1 rounded-lg bg-th-bg-secondary px-3 py-2 text-sm font-medium text-th-text-primary transition-colors hover:bg-th-bg-tertiary min-w-[36px] min-h-[36px]'

  const content = (
    <>
      <ChevronLeft className="h-6 w-6" />
      {label && <span>{label}</span>}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href ?? '/'} className={className}>
      {content}
    </Link>
  )
}
