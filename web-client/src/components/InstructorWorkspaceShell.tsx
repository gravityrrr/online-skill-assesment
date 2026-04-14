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

export const instructorSurfaceClass =
  'rounded-3xl border border-white/10 bg-slate-900/75 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl'

export const instructorSecondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'

export const instructorPrimaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60'

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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute right-[-100px] top-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${instructorSurfaceClass} p-4 sm:p-5 lg:sticky lg:top-6`}>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Instructor</p>
                <p className="mt-1 text-sm font-medium text-slate-100">Workspace</p>
              </div>
            </div>

            <nav className="mt-5 grid gap-2">
              {navItems.map(({ label, detail, to, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => {
                    const activeClasses = isActive
                      ? 'border-indigo-300/40 bg-indigo-500/15 text-indigo-100'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/5 hover:text-white'
                    return `group flex items-start gap-3 rounded-2xl border px-3 py-3 transition ${activeClasses}`
                  }}
                >
                  <span className="mt-0.5 rounded-xl bg-white/10 p-2 text-slate-300 group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs text-slate-400">{detail}</span>
                  </span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Logged in as</p>
              <p className="mt-2 truncate text-sm font-medium text-slate-100">{instructorName}</p>
            </div>
          </aside>

          <main className="space-y-6">
            <header className={`${instructorSurfaceClass} px-5 py-5 sm:px-6`}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Instructor portal</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{subtitle}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500 text-sm font-semibold text-white">
                      {initials(instructorName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{instructorName}</p>
                      <p className="text-xs text-slate-400">Approved instructor</p>
                    </div>
                  </div>

                  {headerAction}

                  {onRefresh ? (
                    <button type="button" onClick={() => void onRefresh()} className={instructorSecondaryButtonClass}>
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void onSignOut()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
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
