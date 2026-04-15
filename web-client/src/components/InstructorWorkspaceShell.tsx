import type { ReactNode } from 'react'
import { BarChart3, ClipboardList, LogOut, RefreshCcw, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface InstructorWorkspaceShellProps {
  instructorName: string
  title: string
  subtitle: string
  onSignOut: () => Promise<void> | void
  onRefresh?: () => Promise<void> | void
  headerAction?: ReactNode
  children: ReactNode
}

interface NavItem {
  label: string
  detail: string
  to: string
  Icon: typeof BarChart3
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    detail: 'Overview and analytics',
    to: '/instructor-dashboard',
    Icon: BarChart3,
  },
  {
    label: 'Assessment Builder',
    detail: 'Create and edit assessments',
    to: '/instructor/assessment-builder',
    Icon: ClipboardList,
  },
]

export const instructorSurfaceClass = 'panel'
export const instructorSecondaryButtonClass = 'btn-secondary'
export const instructorPrimaryButtonClass = 'btn-primary'

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'IN'
}

export default function InstructorWorkspaceShell({
  instructorName,
  title,
  subtitle,
  onSignOut,
  onRefresh,
  headerAction,
  children,
}: InstructorWorkspaceShellProps) {
  return (
    <div className="app-page">
      {/* Decorative background orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-primary bg-orb-tl" />
        <div className="bg-orb bg-orb-secondary bg-orb-tr" />
        <div className="bg-orb bg-orb-tertiary bg-orb-bl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-8 lg:px-12 flex-1">
        <div className="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">

          {/* ── Sidebar ── */}
          <aside className="panel-raised p-8 sm:p-8 lg:sticky lg:top-6">
            {/* Brand header */}
            <div className="panel-inset flex items-center gap-3 px-4 py-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-white"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))' }}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="label-micro">Instructor</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Workspace</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-5 grid gap-2">
              <p className="label-micro mb-1 px-1">Navigation</p>
              {navItems.map(({ label, detail, to, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="nav-link-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span
                      className="mt-0.5 block text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {detail}
                    </span>
                  </span>
                </NavLink>
              ))}
            </nav>

            {/* Logged-in user */}
            <div className="panel-inset mt-6 p-4">
              <p className="label-micro">Logged in as</p>
              <p
                className="mt-2.5 truncate text-sm font-semibold"
                style={{ color: 'var(--text-main)' }}
              >
                {instructorName}
              </p>
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="space-y-6">
            {/* Page header */}
            <header className="panel-raised px-6 py-6 sm:px-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="label-micro">Instructor portal</p>
                    <h1
                      className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
                      style={{ color: 'var(--text-main)', letterSpacing: '-0.025em' }}
                    >
                      {title}
                    </h1>
                    <p
                      className="mt-2 max-w-3xl text-sm leading-6"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                  {/* User identity badge */}
                  <div className="panel-inset flex items-center gap-3 px-3 py-2.5 rounded-xl">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))' }}
                    >
                      {initials(instructorName)}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: 'var(--text-main)' }}
                      >
                        {instructorName}
                      </p>
                      <p className="label-micro">Approved instructor</p>
                    </div>
                  </div>

                  {headerAction}

                  {onRefresh ? (
                    <button
                      type="button"
                      onClick={() => void onRefresh()}
                      className="btn-icon"
                      title="Refresh"
                      aria-label="Refresh"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="btn-danger"
                    style={{ fontSize: '0.8rem', padding: '9px 14px' }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </header>

            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
