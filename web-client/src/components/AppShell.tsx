import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
  maxWidthClassName?: string
  containerClassName?: string
  withOrbs?: boolean
  topPaddingClassName?: string
}

export default function AppShell({
  children,
  maxWidthClassName = 'max-w-[1100px]',
  containerClassName = '',
  withOrbs = true,
  topPaddingClassName = 'py-8',
}: AppShellProps) {
  return (
    <div className="app-page">
      {withOrbs ? (
        <div className="bg-orbs">
          <div className="bg-orb bg-orb-primary bg-orb-tl" />
          <div className="bg-orb bg-orb-secondary bg-orb-tr" />
          <div className="bg-orb bg-orb-tertiary bg-orb-bl" />
        </div>
      ) : null}

      <div className={`relative mx-auto w-full ${maxWidthClassName} px-4 ${topPaddingClassName} sm:px-6 lg:px-8 ${containerClassName}`}>
        {children}
      </div>
    </div>
  )
}

