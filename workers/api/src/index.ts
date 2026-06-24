export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response('api-worker: not yet implemented', { status: 501 })
  },
} satisfies ExportedHandler
