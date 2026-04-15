import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      className="panel fixed right-4 top-4 z-[80] inline-flex items-center gap-2 rounded-full px-3.5 py-2 transition-all duration-300 hover:-translate-y-0.5"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full animate-scale-in"
        style={{
          background: 'var(--primary-soft)',
          border: '1px solid var(--primary-border)',
          color: 'var(--primary)',
        }}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
      <span
        className="text-xs font-semibold"
        style={{ color: 'var(--text-secondary)' }}
      >
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  )
}
