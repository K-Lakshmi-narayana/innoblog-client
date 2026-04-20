import { useEffect, useState } from 'react'

const STORAGE_KEY = 'innoblog-session'

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const savedValue = window.localStorage.getItem(STORAGE_KEY)
    return savedValue ? JSON.parse(savedValue) : null
  } catch {
    return null
  }
}

function toDisplayName(rawName = '') {
  return rawName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function useLocalSession() {
  const [session, setSession] = useState(readStoredSession)

  useEffect(() => {
    try {
      if (session) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Ignore storage failures and continue with in-memory session state.
    }
  }, [session])

  function login({ name, email }) {
    const fallbackName = email.split('@')[0] || 'Reader'
    const nextSession = {
      name: toDisplayName(name.trim() || fallbackName),
      email: email.trim(),
      title: 'Community Writer',
      memberSince: new Date().toISOString(),
    }

    setSession(nextSession)
    return nextSession
  }

  function logout() {
    setSession(null)
  }

  return {
    session,
    login,
    logout,
  }
}
