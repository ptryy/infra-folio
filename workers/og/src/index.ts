import { Resvg } from '@resvg/resvg-wasm'
import { ensureWasm } from './wasm'
import { renderOgSvg } from './template'

type Env = {
  MEDIA_BUCKET: R2Bucket
}

function badRequest(message: string): Response {
  return new Response(message, { status: 400 })
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname !== '/og') {
      return new Response('Not found', { status: 404 })
    }

    const type = url.searchParams.get('type')
    const slug = url.searchParams.get('slug')
    const title = url.searchParams.get('title')
    const description = url.searchParams.get('description')

    if (!type || (type !== 'blog' && type !== 'project')) {
      return badRequest('?type must be "blog" or "project"')
    }
    if (!slug) return badRequest('?slug is required')
    if (!title) return badRequest('?title is required')
    if (!description) return badRequest('?description is required')

    const cacheKey = `og/${type}-${slug}.png`

    // Check R2 cache
    const cached = await env.MEDIA_BUCKET.get(cacheKey)
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'HIT',
        },
      })
    }

    // Generate PNG
    await ensureWasm()
    const svg = await renderOgSvg({ title, description, type })
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    const pngBuffer = resvg.render().asPng() as Uint8Array<ArrayBuffer>

    // Write to R2 (fire-and-forget; don't block the response)
    ctx.waitUntil(
      env.MEDIA_BUCKET.put(cacheKey, pngBuffer, {
        httpMetadata: { contentType: 'image/png' },
      }).catch(console.error)
    )

    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
      },
    })
  },
} satisfies ExportedHandler<Env>
