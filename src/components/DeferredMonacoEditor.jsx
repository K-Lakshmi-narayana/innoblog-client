import { useEffect, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'

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
    return (
      <div
        className="monaco-editor-placeholder"
        style={{ height }}
        aria-hidden="true"
      />
    )
  }

  return <MonacoEditor height={height} {...props} />
}
