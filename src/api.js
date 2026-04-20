const API_BASE = 'http://localhost:4000/api'

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, headers = {}, token } = options
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
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
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

export { API_BASE }
