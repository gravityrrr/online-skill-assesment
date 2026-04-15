import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  tone?: 'default' | 'primary' | 'danger' | 'success'
}

function iconStyleForTone(tone: NonNullable<PageHeaderProps['tone']>) {
  if (tone === 'danger') {
    return { background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }
  }
  if (tone === 'success') {
    return { background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-border)' }
  }
  if (tone === 'primary') {
    return { background: 'var(--primary-soft)', color: 'var(--accent-sky)', border: '1px solid var(--primary-border)' }
  }
  return { background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  tone = 'default',
}: PageHeaderProps) {
  return (
    <header className="panel-raised px-6 py-6 sm:px-7 animate-rise">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={iconStyleForTone(tone)}>
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            {eyebrow ? <p className="label-micro">{eyebrow}</p> : null}
            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </header>
  )
}

