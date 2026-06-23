# Storage Adapter & Feature Flags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `src/lib/storage.ts` (unified MinIO/R2 adapter) and `src/lib/flags.ts` (deploy-time feature flags) with full unit test coverage via vitest.

**Architecture:** Two utility modules with no knowledge of each other. The storage adapter is a factory function that returns the correct implementation based on `ENVIRONMENT`. Feature flags are evaluated once at module import for static pages; SSR pages call `getFlags(runtime.env)` per request. No conditional branching escapes these two modules — all feature code receives already-resolved values.

**Tech Stack:** vitest 2.x, @aws-sdk/client-s3 (MinIO), @cloudflare/workers-types (R2Bucket), TypeScript 5.x

## Global Constraints

- Prerequisite: Plan 01 (Foundation) must be complete — workspace and `tsconfig.json` must exist
- No S3/R2 SDK imports outside `src/lib/storage.ts`
- The `StorageAdapter` interface is the only public contract — implementations are private to the module
- Feature flags are deploy-time only — no KV, no runtime toggle
- Test files live in `src/lib/__tests__/`; run with `pnpm test`

---

### Task 1: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add vitest dev dependency and `"test"` script)

**Interfaces:**
- Produces: `pnpm test` runs the test suite and exits 0 on pass

- [ ] **Step 1: Add vitest to package.json**

Open `package.json`. Add `"vitest": "^2.0.0"` to `devDependencies` and add a `"test"` script:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

(Keep all existing fields; only add the new script and dependency.)

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Create a placeholder test to verify the setup**

Create `src/lib/__tests__/.gitkeep`:

```
```

(Empty file — keeps the directory in git. Delete it once real test files exist.)

- [ ] **Step 4: Install vitest**

Run: `pnpm install`

Expected: `vitest` added to `pnpm-lock.yaml`; exits 0

- [ ] **Step 5: Verify test runner works with an inline smoke test**

Create `src/lib/__tests__/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `pnpm test`

Expected: `1 passed` in output; exits 0

- [ ] **Step 6: Delete the smoke test**

Run: `rm src/lib/__tests__/smoke.test.ts`

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml src/lib/__tests__/
git commit -m "chore: add vitest test runner"
```

---

### Task 2: Feature Flags

**Files:**
- Create: `src/lib/flags.ts`
- Create: `src/lib/__tests__/flags.test.ts`

**Interfaces:**
- Produces:
  - `getFlags(env?)` → `{ LIVE_TERMINAL: boolean, CONTACT_FORM: boolean }`
  - `flags` (convenience re-export using `import.meta.env` at build time)

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/flags.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getFlags } from '../flags'

describe('getFlags', () => {
  it('defaults LIVE_TERMINAL to false and CONTACT_FORM to true', () => {
    const flags = getFlags({})
    expect(flags.LIVE_TERMINAL).toBe(false)
    expect(flags.CONTACT_FORM).toBe(true)
  })

  it('enables LIVE_TERMINAL when env var is "true"', () => {
    const flags = getFlags({ LIVE_TERMINAL: 'true' })
    expect(flags.LIVE_TERMINAL).toBe(true)
  })

  it('disables CONTACT_FORM when env var is "false"', () => {
    const flags = getFlags({ CONTACT_FORM: 'false' })
    expect(flags.CONTACT_FORM).toBe(false)
  })

  it('ignores case — only exact "true" string enables a flag', () => {
    const flags = getFlags({ LIVE_TERMINAL: 'True', CONTACT_FORM: 'TRUE' })
    expect(flags.LIVE_TERMINAL).toBe(false)
    expect(flags.CONTACT_FORM).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `pnpm test`

Expected: FAIL — `Cannot find module '../flags'`

- [ ] **Step 3: Implement src/lib/flags.ts**

```typescript
type FlagEnv = Record<string, string | undefined>

function resolveFlag(env: FlagEnv, key: string, defaultValue: string): boolean {
  return (env[key] ?? defaultValue) === 'true'
}

export function getFlags(runtime: FlagEnv) {
  return {
    LIVE_TERMINAL: resolveFlag(runtime, 'LIVE_TERMINAL', 'false'),
    CONTACT_FORM: resolveFlag(runtime, 'CONTACT_FORM', 'true'),
  } as const
}

// Build-time convenience: reads from Astro's import.meta.env.
// For SSR routes, call getFlags(Astro.locals.runtime.env) instead.
export const flags = getFlags(
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env as FlagEnv)
    : {}
)
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test`

Expected: `4 passed`; exits 0

- [ ] **Step 5: Commit**

```bash
git add src/lib/flags.ts src/lib/__tests__/flags.test.ts
git commit -m "feat: add feature flag system with getFlags and build-time flags export"
```

---

### Task 3: StorageAdapter Interface & MinIO Implementation

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/__tests__/storage.test.ts`
- Modify: `package.json` (add @aws-sdk/client-s3)

**Interfaces:**
- Produces:
  - `StorageAdapter` interface (exported type)
  - `createStorage(env)` → `StorageAdapter` factory function

- [ ] **Step 1: Add S3 SDK to package.json**

Add to `dependencies` in `package.json`:

```json
"@aws-sdk/client-s3": "^3.600.0"
```

Run: `pnpm install`

Expected: SDK added; exits 0

- [ ] **Step 2: Write the failing tests**

Create `src/lib/__tests__/storage.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the S3 client before importing storage
const mockSend = vi.fn()
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  GetObjectCommand: vi.fn((input) => ({ input, name: 'GetObjectCommand' })),
  PutObjectCommand: vi.fn((input) => ({ input, name: 'PutObjectCommand' })),
  DeleteObjectCommand: vi.fn((input) => ({ input, name: 'DeleteObjectCommand' })),
}))

import { createStorage } from '../storage'

const localEnv = {
  ENVIRONMENT: 'local',
  MINIO_ENDPOINT: 'http://localhost:9000',
  MINIO_ROOT_USER: 'minioadmin',
  MINIO_ROOT_PASSWORD: 'minioadmin',
}

describe('createStorage (MinIO / local)', () => {
  beforeEach(() => {
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
  })

  it('calls PutObjectCommand on put', async () => {
    mockSend.mockResolvedValueOnce({})
    const storage = createStorage(localEnv)
    const data = new ArrayBuffer(8)
    await storage.put('media/avatar.png', data, 'image/png')
    expect(mockSend).toHaveBeenCalledOnce()
  })

  it('calls DeleteObjectCommand on delete', async () => {
    mockSend.mockResolvedValueOnce({})
    const storage = createStorage(localEnv)
    await storage.delete('media/avatar.png')
    expect(mockSend).toHaveBeenCalledOnce()
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
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `pnpm test`

Expected: FAIL — `Cannot find module '../storage'`

- [ ] **Step 4: Implement src/lib/storage.ts**

```typescript
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
      return res.Body as ReadableStream
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
```

- [ ] **Step 5: Run tests to confirm they pass**

Run: `pnpm test`

Expected: `6 passed`; exits 0

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/__tests__/storage.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add StorageAdapter with MinIO and R2 implementations"
```

---

### Task 4: Integration Smoke Test Against Live MinIO

**Files:**
- Create: `src/lib/__tests__/storage.integration.test.ts`

**Interfaces:**
- Consumes: `createStorage` from `../storage`, live MinIO on `http://localhost:9000`
- Produces: Confidence that the MinIO adapter actually reads/writes objects

> **Note:** This test requires MinIO running. Run `make minio-up` before executing.
> Skip in CI unless MinIO is in the pipeline. The test file is excluded from the default `pnpm test` glob and must be run explicitly.

- [ ] **Step 1: Write the integration test**

Create `src/lib/__tests__/storage.integration.test.ts`:

```typescript
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
    const text = new TextDecoder().decode(Buffer.concat(chunks))
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
```

- [ ] **Step 2: Update vitest.config.ts to exclude integration tests from default run**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['src/**/__tests__/**/*.integration.test.ts'],
  },
})
```

- [ ] **Step 3: Run integration test (requires running MinIO)**

Run: `make minio-up && pnpm exec vitest run src/lib/__tests__/storage.integration.test.ts`

Expected: `3 passed`; exits 0

- [ ] **Step 4: Run unit tests to confirm exclude works**

Run: `pnpm test`

Expected: Only `flags.test.ts` and `storage.test.ts` run (not the integration test); all pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/__tests__/storage.integration.test.ts vitest.config.ts
git commit -m "test: add MinIO integration test for StorageAdapter"
```

---

## Self-Review

**Spec coverage:**
- ✅ `StorageAdapter` interface with `get`, `put`, `getPublicUrl`, `delete`
- ✅ MinIO adapter using `@aws-sdk/client-s3` with `forcePathStyle: true`
- ✅ R2 adapter using `MEDIA_BUCKET` Worker binding
- ✅ `ENVIRONMENT=local` → MinIO; any other value → R2
- ✅ Zero conditional branching in feature code — factory chooses adapter once
- ✅ No S3/R2 SDK imports outside `storage.ts`
- ✅ `getFlags(runtime)` for SSR per-request use
- ✅ `flags` export for build-time static use
- ✅ Flags are strings compared exactly to `"true"` — case-sensitive
- ✅ `LIVE_TERMINAL` defaults `false`, `CONTACT_FORM` defaults `true`
- ✅ Vitest configured; unit tests exclude integration tests from default run

**Placeholder scan:** None found.

**Type consistency:**
- `StorageAdapter` interface name used consistently in storage.ts and test
- `getFlags` and `flags` names used consistently — later plans must use these exact exports
