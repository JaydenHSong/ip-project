'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type BackButtonProps = {
  href?: string
  label?: string
  onClick?: () => void
}

export const BackButton = ({ href, label, onClick }: BackButtonProps) => {
  const className =
    'inline-flex items-center justify-center rounded-full border border-th-border bg-surface-card p-2 text-th-text-secondary shadow-sm transition-colors hover:bg-th-bg-hover hover:text-th-text'

  const content = (
    <>
      <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
      {label && <span className="ml-1.5 text-sm font-medium">{label}</span>}
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
