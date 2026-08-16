import { Suspense, lazy, useEffect, useState } from 'react'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

function MonacoPlaceholder({ height = 160 }) {
  return (
    <div
      className="monaco-editor-placeholder"
      style={{ height }}
      aria-hidden="true"
    />
  )
}

export default function DeferredMonacoEditor({ height = 160, ...props }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setReady(true)
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  if (!ready) {
    return <MonacoPlaceholder height={height} />
  }

  return (
    <Suspense fallback={<MonacoPlaceholder height={height} />}>
      <MonacoEditor height={height} {...props} />
    </Suspense>
  )
}
