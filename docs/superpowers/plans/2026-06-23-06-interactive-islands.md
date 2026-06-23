# Interactive Islands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four interactive Astro islands — `LiveTerminal`, `GithubFeed`, `Comments` (Giscus), and the contact form — then wire them into the pages that the Plan 05 stubs reserved space for.

**Architecture:** Each island is a React component with `client:visible` hydration. `LiveTerminal` composes `GithubFeed`. `Comments` is a thin Giscus wrapper. The contact form component handles client-side validation and calls the `/api/contact` edge handler. Feature flags (`LIVE_TERMINAL`, `CONTACT_FORM`) are passed as props by parent Astro components — islands never read env vars directly.

**Tech Stack:** React 18, Astro islands, Giscus (GitHub Discussions), TypeScript 5.x, @testing-library/react, vitest

## Global Constraints

- Prerequisites: Plans 01–05 complete. `StatusPanel.astro` and `Contact.astro` stubs exist at `src/components/sections/`
- Islands live in `src/components/islands/`
- All islands use `client:visible` hydration
- Islands receive flags as props — they do NOT import `flags` from `src/lib/flags.ts`
- `GithubFeed.tsx` is composed inside `LiveTerminal.tsx`, not rendered standalone by any page
- `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY_ID` are read from Astro `import.meta.env` in the parent `.astro` component and passed as props
- Contact form calls `POST /api/contact` (handled by `src/pages/api/contact.ts`, which is an SSR endpoint)
- `/api/contact` returns `{ success: true }` on success or `{ error: string }` on failure with HTTP 4xx/5xx
- `pnpm check` and `pnpm build` must exit 0 after every task

---

### Task 1: GithubFeed Island

**Files:**
- Create: `src/components/islands/GithubFeed.tsx`
- Create: `src/components/islands/__tests__/GithubFeed.test.tsx`
- Modify: `package.json` (add @testing-library/react, jsdom)

**Interfaces:**
- Consumes: `GET http://localhost:8787/github/feed` (api-worker) → `{ events: GithubEvent[], cached: boolean }`
- Produces: `<GithubFeed apiBase={string} />` React component that renders a list of recent GitHub events

```typescript
type GithubEvent = {
  id: string
  type: string
  repo: { name: string; url: string }
  created_at: string
  payload: Record<string, unknown>
}
```

- [ ] **Step 1: Add testing dependencies**

Add to `devDependencies` in root `package.json`:

```json
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.4.0",
"@testing-library/user-event": "^14.5.0",
"jsdom": "^24.0.0"
```

Update `vitest.config.ts` to support React component tests:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['src/**/__tests__/**/*.integration.test.ts'],
  },
})
```

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Add `@vitejs/plugin-react` to devDependencies as well:

```json
"@vitejs/plugin-react": "^4.3.0"
```

Run: `pnpm install`

Expected: All deps installed; exits 0

- [ ] **Step 2: Write the failing test**

Create `src/components/islands/__tests__/GithubFeed.test.tsx`:

```typescript
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
```

- [ ] **Step 3: Run test to confirm failure**

Run: `pnpm test`

Expected: FAIL — `Cannot find module '../GithubFeed'`

- [ ] **Step 4: Implement src/components/islands/GithubFeed.tsx**

```typescript
import { useState, useEffect, useCallback } from 'react'

type GithubEvent = {
  id: string
  type: string
  repo: { name: string; url: string }
  created_at: string
  payload: Record<string, unknown>
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    PushEvent: 'pushed to',
    PullRequestEvent: 'opened PR in',
    IssuesEvent: 'opened issue in',
    ForkEvent: 'forked',
    WatchEvent: 'starred',
    CreateEvent: 'created branch in',
    DeleteEvent: 'deleted branch in',
  }
  return map[type] ?? type.replace('Event', '').toLowerCase() + ' in'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

type Props = {
  apiBase: string
}

export default function GithubFeed({ apiBase }: Props) {
  const [events, setEvents] = useState<GithubEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/github/feed`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { events: GithubEvent[] }
      setEvents(data.events)
      setError(null)
    } catch {
      setError('Failed to load GitHub activity')
    }
  }, [apiBase])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  if (error) {
    return <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>
  }

  if (!events) {
    return <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading GitHub activity…</p>
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {events.slice(0, 8).map(event => (
        <li key={event.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#6366f1', fontFamily: 'monospace', flexShrink: 0 }}>›</span>
          <span>
            <span style={{ color: '#94a3b8' }}>{formatEventType(event.type)} </span>
            <a
              href={`https://github.com/${event.repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#f1f5f9', fontWeight: 500 }}
            >
              {event.repo.name.split('/')[1]}
            </a>
            <span style={{ color: '#475569', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
              {timeAgo(event.created_at)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: Run tests to confirm they pass**

Run: `pnpm test`

Expected: `3 passed`; exits 0

- [ ] **Step 6: Commit**

```bash
git add src/components/islands/GithubFeed.tsx src/components/islands/__tests__/GithubFeed.test.tsx src/test-setup.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add GithubFeed island with polling and error state"
```

---

### Task 2: LiveTerminal Island

**Files:**
- Create: `src/components/islands/LiveTerminal.tsx`

**Interfaces:**
- Consumes:
  - `<GithubFeed apiBase={string} />` (from Task 1)
  - `apiBase: string` prop — the api-worker base URL (e.g. `http://localhost:8787` in dev, `https://api.yourdomain.com` in prod)
  - `enabled: boolean` prop — if false, renders nothing
- Produces: `<LiveTerminal enabled={boolean} apiBase={string} />` terminal-style panel

- [ ] **Step 1: Implement src/components/islands/LiveTerminal.tsx**

```typescript
import { useState, useEffect } from 'react'
import GithubFeed from './GithubFeed'

type StatusData = {
  status: string
  region: string
  uptimeMs: number
  timestamp: string
}

type Props = {
  enabled: boolean
  apiBase: string
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export default function LiveTerminal({ enabled, apiBase }: Props) {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    async function fetchStatus() {
      try {
        const res = await fetch(`${apiBase}/status`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as StatusData
        setStatus(data)
        setStatusError(null)
      } catch {
        setStatusError('Worker unreachable')
      }
    }

    fetchStatus()
  }, [enabled, apiBase])

  if (!enabled) return null

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '12px',
      fontFamily: 'var(--font-mono, monospace)',
      overflow: 'hidden',
    }}>
      {/* Terminal title bar */}
      <div style={{
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '0.625rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        <span style={{ marginLeft: '0.5rem', color: '#8b949e', fontSize: '0.8rem' }}>infra-folio — live terminal</span>
      </div>

      <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Status panel */}
        <div>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            $ worker status
          </p>
          {statusError ? (
            <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{statusError}</p>
          ) : status ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#8b949e' }}>status: </span>
                <span style={{ color: '#28c840', fontWeight: 600 }}>{status.status}</span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>region: </span>
                <span style={{ color: '#e6edf3' }}>{status.region}</span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>uptime: </span>
                <span style={{ color: '#e6edf3' }}>{formatUptime(status.uptimeMs)}</span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>as of: </span>
                <span style={{ color: '#e6edf3' }}>{new Date(status.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>Connecting…</p>
          )}
        </div>

        {/* GitHub feed */}
        <div>
          <p style={{ color: '#8b949e', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            $ github activity
          </p>
          <GithubFeed apiBase={apiBase} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 3: Commit**

```bash
git add src/components/islands/LiveTerminal.tsx
git commit -m "feat: add LiveTerminal island composing GithubFeed and /status endpoint"
```

---

### Task 3: Wire LiveTerminal Into StatusPanel Section

**Files:**
- Modify: `src/components/sections/StatusPanel.astro` (replace stub from Plan 05)

**Interfaces:**
- Consumes:
  - `LiveTerminal` island with `client:visible`
  - `flags.LIVE_TERMINAL` from `src/lib/flags.ts`
  - `API_BASE` env var for the api-worker URL

- [ ] **Step 1: Replace the StatusPanel stub**

```astro
---
import LiveTerminal from '../islands/LiveTerminal'
import { flags } from '../../lib/flags'

const apiBase = import.meta.env.API_BASE ?? 'http://localhost:8787'
---
<section class="status-panel" id="status">
  <div class="container">
    <h2>Infrastructure Status</h2>
    <LiveTerminal enabled={flags.LIVE_TERMINAL} apiBase={apiBase} client:visible />
    {!flags.LIVE_TERMINAL && (
      <p style="color: var(--color-muted); font-size: 0.875rem">
        Live terminal disabled. Set <code>LIVE_TERMINAL=true</code> and redeploy to enable.
      </p>
    )}
  </div>
</section>

<style>
.status-panel { background: var(--color-surface); }
.status-panel code {
  color: var(--color-accent);
  background: rgba(99,102,241,0.1);
  padding: 0.1em 0.4em;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.875em;
}
</style>
```

- [ ] **Step 2: Add API_BASE to .env.example**

Open `.env.example` and add:

```bash
# API worker base URL (used by LiveTerminal island)
API_BASE=http://localhost:8787
```

- [ ] **Step 3: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/StatusPanel.astro .env.example
git commit -m "feat: wire LiveTerminal island into StatusPanel section"
```

---

### Task 4: Comments Island (Giscus)

**Files:**
- Create: `src/components/islands/Comments.tsx`
- Modify: `src/pages/blog/[slug].astro` (add Comments below the post body)

**Interfaces:**
- Consumes:
  - `repo: string` (e.g. `"phuctruong/infra-folio"`)
  - `repoId: string` (from giscus.app config)
  - `categoryId: string` (from giscus.app config)
- Produces: `<Comments repo repoId categoryId />` renders the Giscus script widget

Giscus docs: https://giscus.app — configure your repo there to get `repoId` and `categoryId` values.

- [ ] **Step 1: Write the failing test**

Create `src/components/islands/__tests__/Comments.test.tsx`:

```typescript
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Comments from '../Comments'

describe('Comments', () => {
  it('renders a container div without crashing', () => {
    const { container } = render(
      <Comments repo="phuctruong/infra-folio" repoId="R_kg..." categoryId="DIC_kw..." />
    )
    expect(container.firstChild).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm test`

Expected: FAIL — `Cannot find module '../Comments'`

- [ ] **Step 3: Implement src/components/islands/Comments.tsx**

```typescript
import { useEffect, useRef } from 'react'

type Props = {
  repo: string
  repoId: string
  categoryId: string
}

export default function Comments({ repo, repoId, categoryId }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-repo', repo)
    script.setAttribute('data-repo-id', repoId)
    script.setAttribute('data-category-id', categoryId)
    script.setAttribute('data-mapping', 'pathname')
    script.setAttribute('data-strict', '0')
    script.setAttribute('data-reactions-enabled', '1')
    script.setAttribute('data-emit-metadata', '0')
    script.setAttribute('data-input-position', 'top')
    script.setAttribute('data-theme', 'dark')
    script.setAttribute('data-lang', 'en')
    script.setAttribute('data-loading', 'lazy')

    ref.current.appendChild(script)
  }, [repo, repoId, categoryId])

  return (
    <div
      ref={ref}
      style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}
    />
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test`

Expected: All tests pass; exits 0

- [ ] **Step 5: Add Comments to /blog/[slug].astro**

Open `src/pages/blog/[slug].astro`. After the `</div>` that closes the `.prose` div, add:

```astro
---
// Add to existing frontmatter imports:
import Comments from '../../components/islands/Comments'

// Add to existing frontmatter variables:
const giscusRepo = import.meta.env.GISCUS_REPO ?? ''
const giscusRepoId = import.meta.env.GISCUS_REPO_ID ?? ''
const giscusCategoryId = import.meta.env.GISCUS_CATEGORY_ID ?? ''
---
```

And in the template, after `<Content />` and its closing `</div>`:

```astro
{giscusRepo && giscusRepoId && giscusCategoryId && (
  <Comments
    repo={giscusRepo}
    repoId={giscusRepoId}
    categoryId={giscusCategoryId}
    client:visible
  />
)}
```

The full updated `[slug].astro` frontmatter block (replacing the existing one):

```astro
---
export const prerender = false

import { getEntryBySlug } from 'astro:content'
import Layout from '../../components/layout/Layout.astro'
import Comments from '../../components/islands/Comments'

const { slug } = Astro.params
if (!slug) return Astro.redirect('/blog/')

const post = await getEntryBySlug('blog', slug)
if (!post) return new Response('Not found', { status: 404 })

const { Content } = await post.render()

const domain = import.meta.env.DOMAIN ?? Astro.url.hostname
const ogUrl = `https://og.${domain}/og?type=blog&slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(post.data.title)}&description=${encodeURIComponent(post.data.excerpt)}`

const giscusRepo = import.meta.env.GISCUS_REPO ?? ''
const giscusRepoId = import.meta.env.GISCUS_REPO_ID ?? ''
const giscusCategoryId = import.meta.env.GISCUS_CATEGORY_ID ?? ''
---
```

And at the bottom of the article, after the prose div:

```astro
    {giscusRepo && giscusRepoId && giscusCategoryId && (
      <Comments
        repo={giscusRepo}
        repoId={giscusRepoId}
        categoryId={giscusCategoryId}
        client:visible
      />
    )}
```

- [ ] **Step 6: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 7: Commit**

```bash
git add src/components/islands/Comments.tsx src/components/islands/__tests__/Comments.test.tsx src/pages/blog/[slug].astro
git commit -m "feat: add Giscus Comments island to blog post pages"
```

---

### Task 5: Contact Form Component

**Files:**
- Create: `src/components/islands/ContactForm.tsx`
- Create: `src/components/islands/__tests__/ContactForm.test.tsx`

**Interfaces:**
- Produces: `<ContactForm />` React component that POSTs to `/api/contact` with `{ name, email, message }`

- [ ] **Step 1: Write the failing test**

Create `src/components/islands/__tests__/ContactForm.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, afterEach } from 'vitest'
import ContactForm from '../ContactForm'

afterEach(() => vi.restoreAllMocks())

describe('ContactForm', () => {
  it('shows validation error when submitting empty form', async () => {
    render(<ContactForm />)
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'John')
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows success message after successful submit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'John Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    await userEvent.type(screen.getByLabelText(/message/i), 'Hello there!')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => expect(screen.getByText(/message sent/i)).toBeInTheDocument())
  })

  it('shows error message when submit fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response)

    render(<ContactForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'John')
    await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com')
    await userEvent.type(screen.getByLabelText(/message/i), 'Hello!')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => expect(screen.getByText(/server error/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

Run: `pnpm test`

Expected: FAIL — `Cannot find module '../ContactForm'`

- [ ] **Step 3: Implement src/components/islands/ContactForm.tsx**

```typescript
import { useState } from 'react'

type FormState = {
  name: string
  email: string
  message: string
}

type FormErrors = Partial<FormState>

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (!form.message.trim()) errors.message = 'Message is required'
  return errors
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-text)',
  fontSize: '0.95rem',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--color-muted)',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '0.4rem',
}

const errorStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '0.8rem',
  marginTop: '0.25rem',
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setServerError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { success?: boolean; error?: string }
      if (!res.ok || !data.success) {
        setServerError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: '2rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', textAlign: 'center' }}>
        <p style={{ color: '#10b981', fontWeight: 600, fontSize: '1.1rem' }}>Message sent!</p>
        <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          Thanks for reaching out. I'll get back to you within 24–48 hours.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '560px' }}>
      <div>
        <label htmlFor="name" style={labelStyle}>Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          style={fieldStyle}
          placeholder="Jane Smith"
          autoComplete="name"
        />
        {errors.name && <p style={errorStyle}>{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" style={labelStyle}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          style={fieldStyle}
          placeholder="jane@company.com"
          autoComplete="email"
        />
        {errors.email && <p style={errorStyle}>{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="message" style={labelStyle}>Message</label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          style={{ ...fieldStyle, minHeight: '140px', resize: 'vertical' }}
          placeholder="Tell me about your project or what you'd like to work on together..."
        />
        {errors.message && <p style={errorStyle}>{errors.message}</p>}
      </div>

      {serverError && (
        <p style={{ ...errorStyle, fontSize: '0.875rem' }}>{serverError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '0.75rem 2rem',
          background: submitting ? 'var(--color-border)' : 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.95rem',
          cursor: submitting ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
          transition: 'background 0.2s',
        }}
      >
        {submitting ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test`

Expected: `7 passed` (3 GithubFeed + 1 Comments + 4 ContactForm); exits 0

- [ ] **Step 5: Commit**

```bash
git add src/components/islands/ContactForm.tsx src/components/islands/__tests__/ContactForm.test.tsx
git commit -m "feat: add ContactForm island with validation and error handling"
```

---

### Task 6: /api/contact Edge Handler

**Files:**
- Create: `src/pages/api/contact.ts`

**Interfaces:**
- Consumes: `POST /api/contact` with JSON body `{ name: string, email: string, message: string }`
- Produces:
  - `200 { success: true }` on valid submission
  - `400 { error: string }` on missing/invalid fields
  - `500 { error: string }` on email send failure

Email delivery uses the Resend API. Add `RESEND_API_KEY` as a wrangler secret (prod) and env var (local dev).

- [ ] **Step 1: Add RESEND_API_KEY to .env.example**

Open `.env.example` and add:

```bash
# Contact form email delivery (Resend — https://resend.com)
# Get a free API key at resend.com; add your verified domain as sender
RESEND_API_KEY=
CONTACT_TO_EMAIL=your@email.com
```

- [ ] **Step 2: Add RESEND_API_KEY to workers/api/wrangler.toml**

Not needed — the contact form handler runs in the Astro site Worker (`wrangler.toml`), not in api-worker. Add the binding to the main `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "prod"
LIVE_TERMINAL = "false"
CONTACT_FORM = "true"
CONTACT_TO_EMAIL = "your@email.com"
# RESEND_API_KEY is set via wrangler secret put RESEND_API_KEY
```

- [ ] **Step 3: Create src/pages/api/contact.ts**

```typescript
export const prerender = false

import type { APIContext } from 'astro'

type ContactBody = {
  name: string
  email: string
  message: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST({ request, locals }: APIContext): Promise<Response> {
  let body: ContactBody
  try {
    body = await request.json() as ContactBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { name, email, message } = body

  if (!name?.trim()) return jsonResponse({ error: 'Name is required' }, 400)
  if (!email?.trim() || !isValidEmail(email)) return jsonResponse({ error: 'Valid email is required' }, 400)
  if (!message?.trim()) return jsonResponse({ error: 'Message is required' }, 400)

  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {}
  const resendKey = env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY
  const toEmail = env.CONTACT_TO_EMAIL ?? import.meta.env.CONTACT_TO_EMAIL ?? 'hoangphuc1662@gmail.com'

  if (!resendKey) {
    console.error('RESEND_API_KEY not set — contact form submission dropped')
    return jsonResponse({ success: true }, 200)
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'infra-folio <contact@noreply.phuctruong.dev>',
      to: [toEmail],
      subject: `Portfolio contact from ${name}`,
      html: `
        <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
      reply_to: email,
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('Resend API error:', res.status, detail)
    return jsonResponse({ error: 'Failed to send message. Please try again.' }, 500)
  }

  return jsonResponse({ success: true }, 200)
}
```

- [ ] **Step 4: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 5: Test the endpoint manually (requires wrangler dev)**

Run: `pnpm exec wrangler dev`

In a separate terminal:

```bash
# Missing field — should return 400
curl -s -X POST http://localhost:8788/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"test@test.com","message":"hi"}' | python3 -m json.tool

# Invalid email — should return 400
curl -s -X POST http://localhost:8788/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"not-email","message":"hi"}' | python3 -m json.tool

# Valid — should return 200 (RESEND_API_KEY not set, so silently succeeds)
curl -s -X POST http://localhost:8788/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","message":"Hello!"}' | python3 -m json.tool
```

Expected:
- First request: `{"error": "Name is required"}`; HTTP 400
- Second request: `{"error": "Valid email is required"}`; HTTP 400
- Third request: `{"success": true}`; HTTP 200

Stop wrangler dev.

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/contact.ts .env.example wrangler.toml
git commit -m "feat: add /api/contact SSR edge handler with Resend email delivery"
```

---

### Task 7: Wire ContactForm Into Contact Section

**Files:**
- Modify: `src/components/sections/Contact.astro` (replace stub from Plan 05)

**Interfaces:**
- Consumes: `ContactForm` island with `client:visible`; `flags.CONTACT_FORM` (already gating at homepage level)

- [ ] **Step 1: Replace the Contact stub**

```astro
---
import ContactForm from '../islands/ContactForm'
---
<section class="contact" id="contact">
  <div class="container">
    <h2>Get in Touch</h2>
    <p class="contact__intro">
      Interested in working together? Whether you need infrastructure help, a DevOps
      consultant, or just want to connect — drop me a line.
    </p>
    <ContactForm client:visible />
  </div>
</section>

<style>
.contact { background: var(--color-surface); }
.contact__intro {
  color: var(--color-muted);
  max-width: 560px;
  margin-bottom: 2.5rem;
  line-height: 1.7;
}
</style>
```

- [ ] **Step 2: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`

Expected: All tests pass; exits 0

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Contact.astro
git commit -m "feat: wire ContactForm island into Contact section"
```

---

## Self-Review

**Spec coverage:**
- ✅ `LiveTerminal.tsx` — hydrated with `client:visible`; receives `enabled` prop; if `enabled=false`, renders nothing
- ✅ `GithubFeed.tsx` — composed inside `LiveTerminal`; polls `/github/feed` on mount and every 5 minutes
- ✅ `Comments.tsx` — Giscus widget at the bottom of every `/blog/[slug]` page; `client:visible`
- ✅ `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY_ID` read from `import.meta.env` in parent Astro component; passed as props
- ✅ Islands receive `enabled` / flag as prop — no direct `flags` import in island files
- ✅ `/api/contact` SSR edge handler (not a Worker endpoint — runs in site-worker)
- ✅ Contact form gated by `flags.CONTACT_FORM` (set at homepage level in Plan 05 index.astro)
- ✅ `RESEND_API_KEY` and `CONTACT_TO_EMAIL` in `.env.example`
- ✅ Component tests for `GithubFeed`, `Comments`, `ContactForm` via @testing-library/react
- ✅ `pnpm check` and `pnpm build` verified after every task

**Placeholder scan:** None found.

**Type consistency:**
- `GithubFeed` receives `apiBase: string` — `LiveTerminal` passes `apiBase` (same prop name, same type)
- `/github/feed` response shape `{ events: GithubEvent[], cached: boolean }` — matches Plan 04 `handleGithubFeed` return
- `ContactForm` POSTs `{ name, email, message }` as JSON — `/api/contact` handler reads these exact keys
- `/api/contact` returns `{ success: true }` or `{ error: string }` — `ContactForm` handles both shapes
- `Comments` props: `repo`, `repoId`, `categoryId` (string) — Giscus data attributes match
