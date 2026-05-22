import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from '../api'

describe('apiRequest', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed JSON for successful responses', async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true, value: 1 })),
    })

    await expect(apiRequest('/health')).resolves.toEqual({ ok: true, value: 1 })
  })

  it('maps backend error payloads into rich Error objects', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: vi.fn().mockReturnValue('req-123'),
      },
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Title is required.',
            details: [{ field: 'title', message: 'Title is required.' }],
            requestId: 'req-123',
          },
        }),
      ),
    })

    await expect(apiRequest('/articles', { method: 'POST', body: {} })).rejects.toMatchObject({
      message: 'Title is required.',
      status: 400,
      code: 'VALIDATION_ERROR',
      requestId: 'req-123',
    })
  })

  it('falls back to plain-text backend errors', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
      text: vi.fn().mockResolvedValue('Unexpected failure'),
    })

    await expect(apiRequest('/articles')).rejects.toMatchObject({
      message: 'Unexpected failure',
      status: 500,
    })
  })
})
