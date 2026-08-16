import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import CreateArticlePage from '../pages/CreateArticlePage'
import { apiRequest } from '../api'

vi.mock('../api', () => ({
  apiRequest: vi.fn(),
  resolveImageUrl: vi.fn((path) => (
    String(path || '').startsWith('/uploads/')
      ? `http://localhost:4000${path}`
      : path
  )),
}))

vi.mock('../components/Editor', () => ({
  default: ({ value, onChange }) => (
    <textarea
      aria-label="Article editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}))

vi.mock('../components/LoadingDots', () => ({
  default: () => <span>Loading...</span>,
}))

const session = {
  user: {
    id: 'user-1',
    role: 'author',
    profile: {
      displayName: 'Author One',
    },
  },
}

const mlTags = ['Machine Learning', 'Model Evaluation', 'Feature Engineering']

async function selectDefaultTags() {
  fireEvent.focus(screen.getByRole('textbox', { name: /^Tags/ }))

  for (const tag of mlTags) {
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(tag, 'i') }))
  }
}

describe('CreateArticlePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    apiRequest.mockImplementation((endpoint, options) => {
      if (endpoint.startsWith('/tags/suggestions')) {
        return Promise.resolve({ tags: mlTags })
      }

      if (endpoint === '/uploads/cover') {
        return Promise.resolve({
          image: {
            path: '/uploads/covers/cover.png',
            url: 'http://localhost:4000/uploads/covers/cover.png',
          },
        })
      }

      if (options?.method === 'POST') {
        return Promise.resolve({ draft: { id: 'draft-1' } })
      }

      return Promise.resolve({})
    })
  })

  it('shows login gating when no session exists', () => {
    render(<CreateArticlePage onPublish={vi.fn()} session={null} />)

    expect(screen.getByText(/Login required/i)).toBeInTheDocument()
  })

  it('publishes a valid article draft payload through onPublish', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined)

    render(<CreateArticlePage onPublish={onPublish} session={session} />)

    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), {
      target: { value: 'Practical Vision Launch Guide' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /^Summary/ }), {
      target: { value: 'A practical summary that is definitely long enough for validation.' },
    })
    fireEvent.change(screen.getByLabelText('Article editor'), {
      target: { value: `<p>${'Camera systems and deployment tradeoffs '.repeat(6)}</p>` },
    })
    await selectDefaultTags()

    fireEvent.click(screen.getByRole('button', { name: /Publish article/i }))

    await waitFor(() => {
      expect(onPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Practical Vision Launch Guide',
          summary: 'A practical summary that is definitely long enough for validation.',
          tags: mlTags,
        }),
        expect.objectContaining({
          articleId: '',
          draftId: '',
        }),
      )
    })
  })

  it('saves a draft to the backend and shows success feedback', async () => {
    render(<CreateArticlePage onPublish={vi.fn()} session={session} />)

    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), {
      target: { value: 'Draft Ready Article' },
    })
    fireEvent.change(screen.getByLabelText('Article editor'), {
      target: { value: `<p>${'Draft body with enough useful detail for validation. '.repeat(4)}</p>` },
    })
    await selectDefaultTags()
    fireEvent.click(screen.getByRole('button', { name: /Save as Draft/i }))

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        '/drafts',
        expect.objectContaining({
          method: 'POST',
          body: expect.objectContaining({
            title: 'Draft Ready Article',
            saveAsDraft: true,
          }),
        }),
      )
    })

    expect(screen.getByText(/Draft saved/i)).toBeInTheDocument()
  })

  it('shows validation feedback instead of publishing invalid content', async () => {
    const onPublish = vi.fn()

    render(<CreateArticlePage onPublish={onPublish} session={session} />)

    fireEvent.change(screen.getByRole('textbox', { name: /^Title/ }), {
      target: { value: 'bad' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Publish article/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Title must be at least 5 characters/i, {
          selector: '.form-message--error',
        }),
      ).toBeInTheDocument()
    })
    expect(onPublish).not.toHaveBeenCalled()
  })

  it('renders a cover image preview after upload', async () => {
    render(<CreateArticlePage onPublish={vi.fn()} session={session} />)

    const file = new File(['cover-image'], 'cover.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/Cover picture/i), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getByAltText('Cover preview')).toHaveAttribute(
        'src',
        'http://localhost:4000/uploads/covers/cover.png',
      )
    })

    expect(apiRequest).toHaveBeenCalledWith(
      '/uploads/cover',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      }),
    )
  })

  it('shows a clear error when a cover image is too large', async () => {
    render(<CreateArticlePage onPublish={vi.fn()} session={session} />)

    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'cover.png', {
      type: 'image/png',
    })
    fireEvent.change(screen.getByLabelText(/Cover picture/i), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getAllByText(/Cover image must be 10 MB or smaller/i).length).toBeGreaterThan(0)
    })
  })
})
