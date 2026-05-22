import { expect, test } from '@playwright/test'

const APP_ORIGIN = 'http://127.0.0.1:4173'
const CORS_HEADERS = {
  'access-control-allow-origin': APP_ORIGIN,
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': 'Content-Type, Authorization',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'content-type': 'application/json',
}

const adminSession = {
  user: {
    id: 'admin-1',
    role: 'admin',
    canWrite: true,
    email: 'admin@example.com',
    profile: {
      handle: 'admin-example',
      displayName: 'Admin Example',
      headline: 'Editorial administrator',
    },
  },
}

const authorSession = {
  user: {
    id: 'author-1',
    role: 'author',
    canWrite: true,
    email: 'author@example.com',
    profile: {
      handle: 'author-example',
      displayName: 'Author Example',
      headline: 'Contributing author',
    },
  },
}

const otherAuthorSession = {
  user: {
    id: 'author-2',
    role: 'author',
    canWrite: true,
    email: 'other-author@example.com',
    profile: {
      handle: 'other-author',
      displayName: 'Other Author',
      headline: 'Contributing author',
    },
  },
}

function paginated(bodyKey, items) {
  return {
    [bodyKey]: items,
    totalCount: items.length,
    page: 1,
    limit: 10,
    totalPages: Math.max(1, items.length || 1),
  }
}

async function bootstrapPage(page, { session = null, promptValue = '', confirmValue = true } = {}) {
  await page.addInitScript(
    ({ storedSession, nextPromptValue, nextConfirmValue }) => {
      if (storedSession) {
        window.localStorage.setItem('innoblog-auth-session', JSON.stringify(storedSession))
      } else {
        window.localStorage.removeItem('innoblog-auth-session')
      }

      window.prompt = () => nextPromptValue
      window.confirm = () => nextConfirmValue
    },
    {
      storedSession: session,
      nextPromptValue: promptValue,
      nextConfirmValue: confirmValue,
    },
  )
}

async function mockApi(page, handler) {
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      })
      return
    }

    if (url.pathname === '/api/tags/suggestions') {
      const domain = url.searchParams.get('domain')
      const tagsByDomain = {
        ds: ['Data Science', 'Business Metrics', 'Data Storytelling'],
        ml: ['Machine Learning', 'Model Evaluation', 'Feature Engineering'],
        nlp: ['Natural Language Processing', 'RAG', 'Embeddings'],
      }

      await route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ tags: tagsByDomain[domain] || tagsByDomain.ml }),
      })
      return
    }

    const response = await handler({
      method: request.method(),
      pathname: url.pathname,
      search: url.search,
      route,
    })

    if (!response) {
      await route.fulfill({
        status: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: `Unhandled API route: ${url.pathname}` }),
      })
      return
    }

    await route.fulfill({
      status: response.status ?? 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(response.body ?? {}),
    })
  })
}

test.describe('browser publishing flows', () => {
  test('admin can approve a publication request in the browser', async ({ page }) => {
    const state = {
      requests: [
        {
          id: 'request-1',
          draft: {
            id: 'draft-1',
            slug: 'approve-this-story',
            title: 'Approve This Story',
            summary: 'A draft ready for review.',
            domain: 'ds',
            body: '<p>Draft body</p>',
            tags: ['ds'],
            coverImage: '',
            coverLabel: 'DS',
            createdAt: '2024-05-01T00:00:00.000Z',
          },
          author: {
            id: 'author-1',
            email: 'author@example.com',
          },
          requestedAt: '2024-05-02T00:00:00.000Z',
        },
      ],
      publications: [],
    }

    await bootstrapPage(page, {
      session: adminSession,
      promptValue: 'Looks ready to publish.',
    })

    await mockApi(page, async ({ method, pathname }) => {
      if (pathname === '/api/auth/me') {
        return { body: { user: adminSession.user } }
      }

      if (pathname === '/api/articles') {
        return { body: paginated('articles', []) }
      }

      if (pathname === '/api/articles/top') {
        return { body: { articles: [] } }
      }

      if (pathname === '/api/profiles/me') {
        return {
          body: {
            profile: adminSession.user.profile,
            user: adminSession.user,
            articles: state.publications,
            totalArticles: state.publications.length,
          },
        }
      }

      if (pathname === '/api/author/publications') {
        return { body: paginated('articles', state.publications) }
      }

      if (pathname === '/api/drafts') {
        return { body: paginated('drafts', []) }
      }

      if (pathname === '/api/author/requests') {
        return { body: paginated('drafts', []) }
      }

      if (pathname === '/api/admin/metrics') {
        return {
          body: {
            totalReaders: 10,
            activeReaderLogins: 4,
            totalPublishedArticles: state.publications.length,
            publishedLast24Hours: state.publications.length,
          },
        }
      }

      if (pathname === '/api/admin/publication-requests') {
        return { body: paginated('requests', state.requests) }
      }

      if (
        method === 'POST' &&
        pathname === '/api/admin/publication-requests/request-1/approve'
      ) {
        state.requests = []
        state.publications = [
          {
            id: 'article-1',
            slug: 'approve-this-story',
            title: 'Approve This Story',
            summary: 'A draft ready for review.',
            domain: 'ds',
            coverLabel: 'DS',
            coverImage: '',
            tags: ['ds'],
            publishedAt: '2024-05-03T00:00:00.000Z',
            readTime: '3 min read',
            likeCount: 0,
            commentCount: 0,
            viewCount: 0,
            isFeatured: false,
            isDraft: false,
            isPubliclyVisible: true,
            publicationRequested: false,
            publicationStatus: 'published',
            publicationNotes: '',
            createdAt: '2024-05-01T00:00:00.000Z',
            updatedAt: '2024-05-03T00:00:00.000Z',
            likedByMe: false,
            toc: [],
            author: authorSession.user,
          },
        ]

        return {
          body: {
            message: 'Article published successfully.',
            article: state.publications[0],
          },
        }
      }

      return null
    })

    await page.goto('/#/profile/me?tab=admin-requests')

    await expect(page.getByRole('heading', { name: 'Pending publication requests' })).toBeVisible()
    await expect(page.getByText('Approve This Story')).toBeVisible()

    await page.getByRole('button', { name: 'Approve & Publish' }).click()

    await expect(page.getByText('Article published successfully.')).toBeVisible()
    await expect(page.getByText('No pending publication requests.')).toBeVisible()
  })

  test('admin can reject a publication request in the browser', async ({ page }) => {
    const state = {
      requests: [
        {
          id: 'request-2',
          draft: {
            id: 'draft-2',
            slug: 'reject-this-story',
            title: 'Reject This Story',
            summary: 'A draft that still needs work.',
            domain: 'nlp',
            body: '<p>Draft body</p>',
            tags: ['nlp'],
            coverImage: '',
            coverLabel: 'NLP',
            createdAt: '2024-05-01T00:00:00.000Z',
          },
          author: {
            id: 'author-1',
            email: 'author@example.com',
          },
          requestedAt: '2024-05-02T00:00:00.000Z',
        },
      ],
    }

    await bootstrapPage(page, {
      session: adminSession,
      promptValue: 'Please expand the analysis section.',
    })

    await mockApi(page, async ({ method, pathname }) => {
      if (pathname === '/api/auth/me') {
        return { body: { user: adminSession.user } }
      }

      if (pathname === '/api/articles') {
        return { body: paginated('articles', []) }
      }

      if (pathname === '/api/articles/top') {
        return { body: { articles: [] } }
      }

      if (pathname === '/api/profiles/me') {
        return {
          body: {
            profile: adminSession.user.profile,
            user: adminSession.user,
            articles: [],
            totalArticles: 0,
          },
        }
      }

      if (pathname === '/api/author/publications') {
        return { body: paginated('articles', []) }
      }

      if (pathname === '/api/drafts') {
        return { body: paginated('drafts', []) }
      }

      if (pathname === '/api/author/requests') {
        return { body: paginated('drafts', []) }
      }

      if (pathname === '/api/admin/metrics') {
        return {
          body: {
            totalReaders: 10,
            activeReaderLogins: 4,
            totalPublishedArticles: 0,
            publishedLast24Hours: 0,
          },
        }
      }

      if (pathname === '/api/admin/publication-requests') {
        return { body: paginated('requests', state.requests) }
      }

      if (
        method === 'POST' &&
        pathname === '/api/admin/publication-requests/request-2/reject'
      ) {
        state.requests = []
        return {
          body: {
            message: 'Publication request rejected.',
            draft: {
              id: 'draft-2',
              title: 'Reject This Story',
              publicationStatus: 'rejected',
            },
          },
        }
      }

      return null
    })

    await page.goto('/#/profile/me?tab=admin-requests')

    await expect(page.getByText('Reject This Story')).toBeVisible()
    await page.getByRole('button', { name: 'Reject' }).click()

    await expect(page.getByText('Article rejected. Author can resubmit as draft.')).toBeVisible()
    await expect(page.getByText('No pending publication requests.')).toBeVisible()
  })

  test('draft privacy blocks logged-out users and non-owners', async ({ page }) => {
    await bootstrapPage(page)

    await mockApi(page, async ({ pathname }) => {
      if (pathname === '/api/auth/me') {
        return {
          status: 401,
          body: { message: 'Authentication required.' },
        }
      }

      if (pathname === '/api/articles') {
        return { body: paginated('articles', []) }
      }

      if (pathname === '/api/articles/top') {
        return { body: { articles: [] } }
      }

      if (pathname === '/api/articles/private-draft') {
        return {
          status: 404,
          body: { message: 'Article not found.' },
        }
      }

      return null
    })

    await page.goto('/#/draft/private-draft/edit')
    await expect(page.getByText('Login required')).toBeVisible()

    await page.unroute('**/api/**')
    await page.evaluate((session) => {
      window.localStorage.setItem('innoblog-auth-session', JSON.stringify(session))
    }, otherAuthorSession)
    await mockApi(page, async ({ pathname }) => {
      if (pathname === '/api/auth/me') {
        return { body: { user: otherAuthorSession.user } }
      }

      if (pathname === '/api/articles') {
        return { body: paginated('articles', []) }
      }

      if (pathname === '/api/articles/top') {
        return { body: { articles: [] } }
      }

      if (pathname === '/api/drafts/private-draft') {
        return {
          status: 404,
          body: { message: 'Draft not found.' },
        }
      }

      if (pathname === '/api/articles/private-draft') {
        return {
          status: 404,
          body: { message: 'Article not found.' },
        }
      }

      return null
    })

    await page.goto('/?viewer=reader#/draft/private-draft/edit')
    await expect(page.getByText('Could not open editor')).toBeVisible()
    await expect(page.getByText('Draft not found.')).toBeVisible()

    await page.goto('/#/article/private-draft')
    await expect(page.getByText('This article could not be loaded.')).toBeVisible()
    await expect(page.getByText('Article not found.')).toBeVisible()
  })

  test('cover image upload shows a preview in a real browser', async ({ page }) => {
    await bootstrapPage(page, { session: authorSession })

    await mockApi(page, async ({ pathname }) => {
      if (pathname === '/api/auth/me') {
        return { body: { user: authorSession.user } }
      }

      if (pathname === '/api/articles') {
        return { body: paginated('articles', []) }
      }

      if (pathname === '/api/articles/top') {
        return { body: { articles: [] } }
      }

      return null
    })

    await page.goto('/#/create')

    await expect(page.getByRole('heading', { name: 'Create a new article' })).toBeVisible()

    await page.locator('input[name="coverImage"]').setInputFiles({
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9v2xkAAAAASUVORK5CYII=',
        'base64',
      ),
    })

    await expect(page.getByAltText('Cover preview')).toBeVisible()
  })
})
