import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  icon: ReactNode
  iconClassName?: string
  iconWrapperClassName?: string
  valueClassName?: string
}

export default function StatCard({
  label,
  value,
  sub,
  icon,
  iconClassName = '',
  iconWrapperClassName = '',
  valueClassName = '',
}: StatCardProps) {
  return (
    <article className="panel stat-card">
      <div className="stat-card-body">
        <p className="stat-card-label">{label}</p>
        <p className={`stat-card-value stat-number ${valueClassName}`.trim()}>{value}</p>
        {sub ? <p className="stat-card-sub">{sub}</p> : null}
      </div>
      <div
        className={`stat-card-icon border ${iconWrapperClassName} ${iconClassName}`.trim()}
        style={{ borderColor: 'var(--surface-border)' }}
      >
        {icon}
      </div>
    </article>
  )
}

