interface ThemeToggleProps {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label="Toggle theme"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span aria-hidden="true">{theme === 'light' ? 'D' : 'L'}</span>
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
