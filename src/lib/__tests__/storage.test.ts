import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the S3 client before importing storage
const mockSend = vi.fn()
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  GetObjectCommand: vi.fn((input) => ({ input, name: 'GetObjectCommand' })),
  PutObjectCommand: vi.fn((input) => ({ input, name: 'PutObjectCommand' })),
  DeleteObjectCommand: vi.fn((input) => ({ input, name: 'DeleteObjectCommand' })),
}))

import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { createStorage } from '../storage'

const localEnv = {
  ENVIRONMENT: 'local',
  MINIO_ENDPOINT: 'http://localhost:9000',
  MINIO_ROOT_USER: 'minioadmin',
  MINIO_ROOT_PASSWORD: 'minioadmin',
}

describe('createStorage (MinIO / local)', () => {
  beforeEach(() => {
    // Clear command-constructor mocks so per-test inspection of
    // .mock.calls[0][0] is reliable, then reset send behavior.
    vi.clearAllMocks()
    mockSend.mockReset()
  })

  it('returns null on get when object does not exist', async () => {
    const err = Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' })
    mockSend.mockRejectedValueOnce(err)

    const storage = createStorage(localEnv)
    const result = await storage.get('missing/key.png')
    expect(result).toBeNull()
  })

  it('returns a stream on get when object exists', async () => {
    const fakeStream = new ReadableStream()
    mockSend.mockResolvedValueOnce({ Body: fakeStream })

    const storage = createStorage(localEnv)
    const result = await storage.get('media/avatar.png')
    expect(result).toBe(fakeStream)

    const cmd = (GetObjectCommand as any).mock.calls[0][0]
    expect(cmd).toMatchObject({ Bucket: 'infra-folio-media', Key: 'media/avatar.png' })
  })

  it('calls PutObjectCommand on put', async () => {
    mockSend.mockResolvedValueOnce({})
    const storage = createStorage(localEnv)
    const data = new ArrayBuffer(8)
    await storage.put('media/avatar.png', data, 'image/png')
    expect(mockSend).toHaveBeenCalledOnce()

    const cmd = (PutObjectCommand as any).mock.calls[0][0]
    expect(cmd).toMatchObject({
      Bucket: 'infra-folio-media',
      Key: 'media/avatar.png',
      ContentType: 'image/png',
    })
    expect(cmd.Body).toBeInstanceOf(Uint8Array)
  })

  it('calls DeleteObjectCommand on delete', async () => {
    mockSend.mockResolvedValueOnce({})
    const storage = createStorage(localEnv)
    await storage.delete('media/avatar.png')
    expect(mockSend).toHaveBeenCalledOnce()

    const cmd = (DeleteObjectCommand as any).mock.calls[0][0]
    expect(cmd).toMatchObject({ Bucket: 'infra-folio-media', Key: 'media/avatar.png' })
  })

  it('returns correct public URL', () => {
    const storage = createStorage(localEnv)
    expect(storage.getPublicUrl('media/avatar.png')).toBe(
      'http://localhost:9000/infra-folio-media/media/avatar.png'
    )
  })
})

describe('createStorage — throws without MEDIA_BUCKET in prod', () => {
  it('throws if ENVIRONMENT=prod and MEDIA_BUCKET is missing', () => {
    expect(() => createStorage({ ENVIRONMENT: 'prod' })).toThrow('MEDIA_BUCKET')
  })
})
