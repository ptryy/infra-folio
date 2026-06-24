import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import GithubFeed from '../GithubFeed'

const mockEvents = [
  {
    id: '1',
    type: 'PushEvent',
    repo: { name: 'phuctruong/infra-folio', url: 'https://api.github.com/repos/phuctruong/infra-folio' },
    created_at: '2026-06-23T12:00:00Z',
    payload: {},
  },
]

afterEach(() => vi.restoreAllMocks())

describe('GithubFeed', () => {
  it('shows loading state initially', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ events: mockEvents, cached: false }),
    } as Response)

    render(<GithubFeed apiBase="http://localhost:8787" />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders events after fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ events: mockEvents, cached: false }),
    } as Response)

    render(<GithubFeed apiBase="http://localhost:8787" />)
    await waitFor(() => expect(screen.getByText(/infra-folio/i)).toBeInTheDocument())
  })

  it('shows error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    render(<GithubFeed apiBase="http://localhost:8787" />)
    await waitFor(() => expect(screen.getByText(/failed to load/i)).toBeInTheDocument())
  })
})
