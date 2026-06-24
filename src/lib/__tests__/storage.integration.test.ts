import { describe, it, expect, afterAll } from 'vitest'
import { createStorage } from '../storage'

const env = {
  ENVIRONMENT: 'local',
  MINIO_ENDPOINT: 'http://localhost:9000',
  MINIO_ROOT_USER: 'minioadmin',
  MINIO_ROOT_PASSWORD: 'minioadmin',
}

const KEY = `test/integration-${Date.now()}.txt`
const CONTENT = 'hello from integration test'

describe('MinIO integration', () => {
  const storage = createStorage(env)

  afterAll(async () => {
    await storage.delete(KEY)
  })

  it('put then get returns the same data', async () => {
    const encoder = new TextEncoder()
    await storage.put(KEY, encoder.encode(CONTENT).buffer, 'text/plain')

    const stream = await storage.get(KEY)
    expect(stream).not.toBeNull()

    const reader = stream!.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    const total = chunks.reduce((sum, c) => sum + c.length, 0)
    const merged = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    const text = new TextDecoder().decode(merged)
    expect(text).toBe(CONTENT)
  })

  it('get on missing key returns null', async () => {
    const result = await storage.get('test/does-not-exist.txt')
    expect(result).toBeNull()
  })

  it('getPublicUrl returns correct URL', () => {
    expect(storage.getPublicUrl(KEY)).toBe(`http://localhost:9000/infra-folio-media/${KEY}`)
  })
})
