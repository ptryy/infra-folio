import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

export interface StorageAdapter {
  get(key: string): Promise<ReadableStream | null>
  put(key: string, data: ReadableStream | ArrayBuffer, contentType: string): Promise<void>
  getPublicUrl(key: string): string
  delete(key: string): Promise<void>
}

const BUCKET = 'infra-folio-media'

class MinioAdapter implements StorageAdapter {
  private client: S3Client

  constructor(
    endpoint: string,
    user: string,
    pass: string,
    private publicEndpoint: string
  ) {
    this.client = new S3Client({
      endpoint,
      credentials: { accessKeyId: user, secretAccessKey: pass },
      region: 'us-east-1',
      forcePathStyle: true,
    })
  }

  async get(key: string): Promise<ReadableStream | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
      const body = res.Body as { transformToWebStream?: () => ReadableStream } & ReadableStream
      return typeof body.transformToWebStream === 'function'
        ? body.transformToWebStream()
        : body
    } catch (e) {
      if ((e as { name?: string }).name === 'NoSuchKey') return null
      throw e
    }
  }

  async put(key: string, data: ReadableStream | ArrayBuffer, contentType: string): Promise<void> {
    const body = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    await this.client.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
    )
  }

  getPublicUrl(key: string): string {
    return `${this.publicEndpoint}/${BUCKET}/${key}`
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  }
}

type R2Bucket = {
  get(key: string): Promise<{ body: ReadableStream } | null>
  put(key: string, data: ReadableStream | ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<void>
  delete(key: string): Promise<void>
}

class R2Adapter implements StorageAdapter {
  constructor(private bucket: R2Bucket, private publicDomain: string) {}

  async get(key: string): Promise<ReadableStream | null> {
    const obj = await this.bucket.get(key)
    return obj ? obj.body : null
  }

  async put(key: string, data: ReadableStream | ArrayBuffer, contentType: string): Promise<void> {
    await this.bucket.put(key, data, { httpMetadata: { contentType } })
  }

  getPublicUrl(key: string): string {
    return `https://${this.publicDomain}/${key}`
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key)
  }
}

type StorageEnv = {
  ENVIRONMENT?: string
  MINIO_ENDPOINT?: string
  MINIO_ROOT_USER?: string
  MINIO_ROOT_PASSWORD?: string
  MEDIA_BUCKET?: R2Bucket
  MEDIA_PUBLIC_DOMAIN?: string
}

export function createStorage(env: StorageEnv): StorageAdapter {
  if (env.ENVIRONMENT === 'local') {
    return new MinioAdapter(
      env.MINIO_ENDPOINT ?? 'http://localhost:9000',
      env.MINIO_ROOT_USER ?? 'minioadmin',
      env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
      env.MINIO_ENDPOINT ?? 'http://localhost:9000'
    )
  }
  if (!env.MEDIA_BUCKET) {
    throw new Error('MEDIA_BUCKET binding is required when ENVIRONMENT != local')
  }
  return new R2Adapter(env.MEDIA_BUCKET, env.MEDIA_PUBLIC_DOMAIN ?? 'assets.example.com')
}
