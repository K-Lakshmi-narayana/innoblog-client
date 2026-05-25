import { useEffect, useState } from 'react'

function splitPath(path) {
  const hashIndex = path.indexOf('#')
  const routeWithQuery = hashIndex === -1 ? path : path.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : path.slice(hashIndex)
  const queryIndex = routeWithQuery.indexOf('?')

  return {
    pathname: queryIndex === -1 ? routeWithQuery : routeWithQuery.slice(0, queryIndex),
    search: queryIndex === -1 ? '' : routeWithQuery.slice(queryIndex),
    hash,
  }
}

function normalizeRoutePath(path = '/') {
  let nextPath = String(path || '/').trim()

  if (!nextPath) {
    nextPath = '/'
  }

  if (/^https?:\/\//i.test(nextPath)) {
    try {
      const url = new URL(nextPath)
      nextPath = `${url.pathname}${url.search}${url.hash}`
    } catch {
      nextPath = '/'
    }
  }

  nextPath = nextPath.replace(/^#/, '')

  if (!nextPath.startsWith('/')) {
    nextPath = `/${nextPath}`
  }

  const { pathname, search, hash } = splitPath(nextPath)
  let normalizedPathname = pathname || '/'

  if (normalizedPathname === '/top') {
    normalizedPathname = '/top-articles'
  } else if (normalizedPathname.startsWith('/domain/')) {
    normalizedPathname = normalizedPathname.replace('/domain/', '/topic/')
  }

  return `${normalizedPathname}${search}${hash}`
}

function getBrowserPath() {
  if (typeof window === 'undefined') {
    return '/'
  }

  const legacyHashPath = window.location.hash.startsWith('#/')
    ? window.location.hash.replace(/^#/, '')
    : ''
  const currentPath = legacyHashPath || `${window.location.pathname}${window.location.search}`
  const normalizedPath = normalizeRoutePath(currentPath)
  const { pathname, search } = splitPath(normalizedPath)

  return `${pathname}${search}` || '/'
}

function dispatchRouteChange() {
  window.dispatchEvent(new Event('popstate'))
}

export function navigateTo(path, options = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const nextPath = normalizeRoutePath(path)
  const method = options.replace ? 'replaceState' : 'pushState'

  window.history[method](null, '', nextPath)
  dispatchRouteChange()
}

export function useHashRoute() {
  const [path, setPath] = useState(getBrowserPath)

  useEffect(() => {
    const legacyHashPath = window.location.hash.startsWith('#/')
      ? window.location.hash.replace(/^#/, '')
      : ''
    const browserPath = `${window.location.pathname}${window.location.search}${legacyHashPath ? '' : window.location.hash}`
    const normalizedPath = normalizeRoutePath(legacyHashPath || browserPath)

    if (legacyHashPath || normalizedPath !== browserPath) {
      window.history.replaceState(null, '', normalizedPath)
    }

    const handleRouteChange = () => {
      setPath(getBrowserPath())
    }

    const handleDocumentClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey
      ) {
        return
      }

      const anchor = event.target.closest?.('a[href]')

      if (!anchor) {
        return
      }

      const href = anchor.getAttribute('href') || ''

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target ||
        anchor.hasAttribute('download')
      ) {
        return
      }

      const url = new URL(anchor.href, window.location.origin)

      if (url.origin !== window.location.origin) {
        return
      }

      event.preventDefault()
      navigateTo(`${url.pathname}${url.search}${url.hash}`)
    }

    window.addEventListener('popstate', handleRouteChange)
    window.addEventListener('hashchange', handleRouteChange)
    document.addEventListener('click', handleDocumentClick)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('hashchange', handleRouteChange)
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [])

  return path
}
