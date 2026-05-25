const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

function buildApiUrl(path) {
  const rawPath = String(path || '')

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath
  }

  const base = API_BASE.replace(/\/+$/, '')
  const requestPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

  return `${base}${requestPath}`
}

function buildRequestError(response, data = {}) {
  const errorPayload = data.error || {}
  const error = new Error(errorPayload.message || data.message || 'Request failed.')

  error.status = response.status
  error.code = errorPayload.code || 'REQUEST_FAILED'
  error.details = errorPayload.details || null
  error.requestId = errorPayload.requestId || response.headers.get('X-Request-Id') || null

  return error
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, token, timeout = 30000 } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const rawText = await response.text()
    let data = {}

    if (rawText) {
      try {
        data = JSON.parse(rawText)
      } catch {
        data = { message: rawText }
      }
    }

    if (!response.ok) {
      throw buildRequestError(response, data)
    }

    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Please try again.')
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export { API_BASE }
