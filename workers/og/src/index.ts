export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response('og-worker: not yet implemented', { status: 501 })
  },
} satisfies ExportedHandler
