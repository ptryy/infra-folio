/// <reference types="@cloudflare/workers-types" />

type Env = {
  GITHUB_CACHE: KVNamespace
  GITHUB_TOKEN: string
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
  return json({ status: 'ok' })
}

async function handleGithubFeed(_env: Env): Promise<Response> {
  return json({ events: [] })
}

async function handleGithubStats(_env: Env): Promise<Response> {
  return json({ stars: 0, commits: 0 })
}
