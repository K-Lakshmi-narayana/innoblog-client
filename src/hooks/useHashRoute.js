import { useEffect, useState } from 'react'

function getHashPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  const path = window.location.hash.replace(/^#/, '')
  return path || '/'
}

export function navigateTo(path) {
  if (typeof window === 'undefined') {
    return
  }

  window.location.hash = path
}

export function useHashRoute() {
  const [path, setPath] = useState(getHashPath)

  useEffect(() => {
    const handleHashChange = () => {
      setPath(getHashPath())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return path
}
