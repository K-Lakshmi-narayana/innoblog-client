import { useEffect, useState } from 'react'
import { MdOutlineDarkMode, MdOutlineLightMode } from 'react-icons/md'

function getInitialThemeState() {
  if (typeof window === 'undefined') {
    return false
  }

  const savedTheme = window.localStorage.getItem('innoblog-theme')

  if (savedTheme) {
    return savedTheme === 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(getInitialThemeState)

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light'
    window.localStorage.setItem('innoblog-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [isDark])

  function toggleTheme() {
    setIsDark((current) => !current)
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <span className="theme-icon">
          <MdOutlineLightMode />
        </span>
      ) : (
        <span className="theme-icon">
          <MdOutlineDarkMode />
        </span>
      )}
    </button>
  )
}
