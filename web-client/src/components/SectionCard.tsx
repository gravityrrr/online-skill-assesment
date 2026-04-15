import type { ReactNode } from 'react'

interface SectionCardProps {
  children: ReactNode
  className?: string
  padded?: boolean
}

export default function SectionCard({ children, className = '', padded = true }: SectionCardProps) {
  return (
    <section className={`panel${padded ? ' p-7 sm:p-8' : ''} ${className}`}>
      {children}
    </section>
  )
}

