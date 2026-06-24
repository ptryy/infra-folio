/// <reference types="@cloudflare/workers-types" />

import { kvGet, kvSet } from './kv-cache'

const GITHUB_USERNAME = 'phuctruong'
const GITHUB_CACHE_TTL = 300 // 5 minutes

type Env = {
  GITHUB_CACHE: KVNamespace
  GITHUB_TOKEN: string
}

const WORKER_START = Date.now()

function githubHeaders(env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'infra-folio-api/1.0',
    Accept: 'application/vnd.github.v3+json',
  }
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`
  return headers
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function notFound(): Response {
  return json({ error: 'Not found' }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    if (url.pathname === '/status') return handleStatus()
    if (url.pathname === '/github/feed') return handleGithubFeed(env)
    if (url.pathname === '/github/stats') return handleGithubStats(env)

    return notFound()
  },
} satisfies ExportedHandler<Env>

async function handleStatus(): Promise<Response> {
  return json({
    status: 'ok',
    region: (globalThis as unknown as { CF?: { colo?: string } }).CF?.colo ?? 'unknown',
    uptimeMs: Date.now() - WORKER_START,
    timestamp: new Date().toISOString(),
  })
}

async function handleGithubFeed(env: Env): Promise<Response> {
  const CACHE_KEY = `github:feed:${GITHUB_USERNAME}`

  const cached = await kvGet<unknown[]>(env.GITHUB_CACHE, CACHE_KEY)
  if (cached) {
    return json({ events: cached, cached: true })
  }

  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=10`,
    {
      headers: githubHeaders(env),
    }
  )

  if (!res.ok) {
    return json({ error: `GitHub API error: ${res.status}` }, 502)
  }

  const events = await res.json() as unknown[]

  await kvSet(env.GITHUB_CACHE, CACHE_KEY, events, GITHUB_CACHE_TTL)

  return json({ events, cached: false })
}

async function handleGithubStats(_env: Env): Promise<Response> {
  return json({ stars: 0, commits: 0 })
}
