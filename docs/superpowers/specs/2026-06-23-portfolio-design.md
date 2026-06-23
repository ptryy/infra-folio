# infra-folio Portfolio Site — Design Spec

**Date:** 2026-06-23
**Status:** Approved

---

## 1. Goals & Audience

Build a high-performance DevOps/Developer portfolio and personal website that serves two distinct audiences simultaneously:

- **Freelance clients** — want to evaluate capability, professionalism, and contact the owner
- **Engineers & open-source community** — want technical credibility, project depth, and open-source activity

Success criteria: a visitor from either audience lands, immediately understands who you are and what you do, can find relevant work, and has a clear path to action (contact or follow).

---

## 2. Architecture Overview

Three independently deployable Cloudflare Workers back a single Astro-powered site:

```
Browser
  └── Cloudflare CDN
        ├── site-worker          ← Astro hybrid SSG/SSR (main site)
        ├── og-worker            ← OG image generation (Satori + resvg-wasm)
        └── api-worker           ← Infra status + GitHub feed proxy

Local dev
  └── Wrangler dev (all workers) + Astro dev server + MinIO (Docker)
```

The Makefile is the single operator interface for all local and production workflows.

---

## 3. Repository Structure

```
infra-folio/
├── src/                          # Astro application
│   ├── pages/
│   │   ├── index.astro           # Main single-page sections
│   │   ├── blog/
│   │   │   ├── index.astro       # Blog listing (static)
│   │   │   └── [slug].astro      # Post page (SSR — dynamic og:image meta tag)
│   │   ├── projects/
│   │   │   ├── index.astro       # Projects listing (static)
│   │   │   └── [slug].astro      # Project page (SSR — dynamic og:image meta tag)
│   │   └── api/
│   │       └── contact.ts        # Edge contact form handler
│   ├── components/
│   │   ├── layout/               # Shell, Nav, Footer
│   │   ├── sections/             # Hero, About, Skills, Projects, Blog, Contact
│   │   └── islands/              # Interactive Astro islands
│   │       ├── LiveTerminal.tsx  # Feature-flagged status + GitHub panel
│   │       ├── GithubFeed.tsx    # Open source activity feed (used by LiveTerminal)
│   │       └── Comments.tsx      # Giscus comments widget (blog posts only)
│   ├── content/                  # Astro Content Collections
│   │   ├── blog/                 # MDX posts
│   │   └── projects/             # MDX project entries
│   └── lib/
│       ├── storage.ts            # Unified MinIO/R2 adapter
│       └── flags.ts              # Feature flag resolution
├── workers/
│   ├── og/
│   │   ├── src/index.ts          # OG image Worker
│   │   └── wrangler.toml
│   └── api/
│       ├── src/index.ts          # Status + GitHub feed Worker
│       └── wrangler.toml
├── infra/
│   ├── docker-compose.yml        # MinIO for local dev
│   └── minio-init.sh             # Bucket creation + public-read policy
├── docs/
│   └── superpowers/specs/
├── astro.config.mjs
├── wrangler.toml                 # Main site Worker config
├── Makefile
├── package.json
└── .env.example
```

---

## 4. Site Content Sections

The homepage (`/`) is a single scrollable page with these sections in order:

1. **Hero** — name, title, one-line value proposition, CTA buttons (hire me / view work)
2. **About** — brief bio, background, what makes this perspective unique
3. **Skills / Stack** — technology icons/tags grouped by domain (languages, infra, cloud, tools)
4. **Projects** — featured project cards (pulled from `projects` Content Collection, `featured: true`)
5. **Open Source** — contributions summary (static snapshot + live feed if `LIVE_TERMINAL` enabled)
6. **Blog** — latest 3 posts (pulled from `blog` Content Collection)
7. **Status Panel** — infra status + GitHub activity feed (rendered only when `LIVE_TERMINAL=true`)
8. **Contact** — contact form (rendered only when `CONTACT_FORM=true`)

`/blog` and `/projects` are separate routed listing pages. Individual posts/projects are at `/blog/[slug]` and `/projects/[slug]`.

---

## 5. Rendering Model

Uses `@astrojs/cloudflare` adapter in **hybrid mode**. Pages default to static prerendering; routes opt into SSR explicitly with `export const prerender = false`.

| Route | Mode | Reason |
|---|---|---|
| `/` | Static | All content is build-time deterministic |
| `/blog/` | Static | Listing regenerated on deploy |
| `/blog/[slug]` | SSR | Emits dynamic `og:image` meta tag pointing to og-worker with title/description query params |
| `/projects/` | Static | Listing regenerated on deploy |
| `/projects/[slug]` | SSR | Same as blog slug |
| `/api/contact` | SSR | Form submission handler |

**Astro Islands:**
- `LiveTerminal.tsx` — hydrated with `client:visible`; receives `enabled` prop from parent. If `enabled=false`, component renders nothing and neither `api-worker` endpoint is called.
- `GithubFeed.tsx` — composed inside `LiveTerminal`; polls `/github/feed` on mount and every 5 minutes.
- `Comments.tsx` — Giscus widget rendered at the bottom of every `/blog/[slug]` page with `client:visible`. Backed by GitHub Discussions on this repo. Requires `GISCUS_REPO`, `GISCUS_REPO_ID`, `GISCUS_CATEGORY_ID` env vars (obtained from giscus.app configuration). No backend — all data lives in GitHub.
- All other sections are zero-JS Astro components.

**Content Collections schema:**

```typescript
// blog
{
  title: string
  date: Date
  tags: string[]
  coverImage: string   // R2 public URL
  excerpt: string
  // body: MDX
}

// projects
{
  title: string
  description: string
  tags: string[]
  demoUrl?: string
  repoUrl?: string
  media: string[]      // R2 public URLs
  featured: boolean
  // body: MDX
}
```

---

## 6. Storage Architecture

### Adapter Interface

`src/lib/storage.ts` exports a singleton `storage` object conforming to:

```typescript
interface StorageAdapter {
  get(key: string): Promise<ReadableStream | null>
  put(key: string, data: ReadableStream | ArrayBuffer, contentType: string): Promise<void>
  getPublicUrl(key: string): string
  delete(key: string): Promise<void>
}
```

No consumer imports an S3 or R2 SDK directly.

### Environment Switching

| `ENVIRONMENT` | Adapter | Endpoint | Bucket |
|---|---|---|---|
| `local` | MinIO (S3-compatible via `@aws-sdk/client-s3`) | `http://localhost:9000` | `infra-folio-media` |
| `prod` | R2 (Cloudflare R2 binding) | `MEDIA_BUCKET` Worker binding | R2 public domain: `assets.yourdomain.com` |

The switch occurs at module initialization — the correct adapter is constructed once and exported. Zero conditional branching in feature code.

### Bucket Layout (identical in MinIO and R2)

```
media/
├── blog/{slug}/          # Post images, diagrams
├── projects/{slug}/      # Demo videos, screenshots
├── og/{type}-{slug}.png  # Cached OG images (written by og-worker; type=blog|project)
├── assets/
│   ├── resume.pdf
│   └── avatar.{ext}
└── downloads/            # Open-source zips, etc.
```

---

## 7. Workers Design

### `og-worker`

**Endpoint:** `GET /og?type=blog|project&slug={slug}&title={title}&description={description}`

Metadata (title, description) is passed as query params from the slug page's SSR render — no KV lookup needed.

**Flow:**
1. Check R2 `og/{type}-{slug}.png` — return cached PNG immediately if found
2. On miss: render PNG using Satori (HTML→SVG) + resvg-wasm (SVG→PNG) from query param metadata
3. Write PNG to R2 `og/{type}-{slug}.png`
4. Return PNG with `Cache-Control: public, max-age=31536000, immutable`

**Cache invalidation:** `make og-purge SLUG={slug}` deletes the R2 key. `make og-gen` pre-warms all slugs at deploy time.

**Bindings:** `MEDIA_BUCKET` (R2)

---

### `api-worker`

**Endpoints:**

| Route | Purpose | Cache |
|---|---|---|
| `GET /status` | Edge region, Worker health, uptime timestamp | No cache (real-time) |
| `GET /github/feed` | Recent public GitHub events (proxied) | KV, 5-minute TTL |
| `GET /github/stats` | Repo stars, commit count, contribution summary | KV, 5-minute TTL |

GitHub API calls are proxied through the Worker — the `GITHUB_TOKEN` secret is never exposed to the browser. Responses are cached in KV to prevent rate limiting.

**Bindings:** `GITHUB_CACHE` (KV), `GITHUB_TOKEN` (Secret)

---

## 8. Feature Flag System

### Definition (`src/lib/flags.ts`)

```typescript
export const flags = {
  LIVE_TERMINAL: env('LIVE_TERMINAL', 'false') === 'true',
  CONTACT_FORM:  env('CONTACT_FORM',  'true')  === 'true',
} as const
```

`env()` reads from `import.meta.env` in Astro context and Worker env bindings at runtime — one helper, both runtimes.

### Flag Behavior

| Flag | Default | Off behavior | On behavior |
|---|---|---|---|
| `LIVE_TERMINAL` | `false` | Island not emitted in bundle; status/GitHub sections render static fallback | `LiveTerminal` island mounts, polls `api-worker` for live data |
| `CONTACT_FORM` | `true` | Contact section hidden; `/api/contact` route returns 404 | Contact form rendered and functional |

### Propagation

| Layer | Mechanism |
|---|---|
| Static Astro pages | Checked at build time — false flags eliminate island imports from bundle |
| SSR Astro routes | Re-read from Worker env binding per request |
| Islands | Receive flag as prop from parent Astro component |
| Makefile | `LIVE_TERMINAL=true make deploy` overrides per deploy |

Flags are deploy-time configuration only — no database or KV storage. Changing a flag requires a redeploy (intentional — no hidden runtime state).

---

## 9. Makefile Orchestration

The Makefile is the single operator interface. All targets load `.env` via `include .env`.

```makefile
# ── Dev ──────────────────────────────────────────────────────
make dev              # Start Astro dev server + MinIO + all Wrangler dev workers (-j3)
make minio-up         # Start MinIO via Docker Compose + run minio-init.sh
make minio-down       # Stop MinIO
make tunnel           # Open Cloudflare tunnel to expose local dev publicly

# ── Media ────────────────────────────────────────────────────
make media-upload PATH=./assets/   # Sync local assets → MinIO (dev) or R2 (prod)
make media-pull   PATH=./assets/   # Pull R2 bucket → local for inspection
make og-gen                        # Pre-warm all OG images
make og-purge SLUG=my-post         # Delete cached OG image → force regeneration

# ── Build & Preview ──────────────────────────────────────────
make build            # Astro static + hybrid build
make preview          # Production-like local env (Wrangler + MinIO, no tunnel)

# ── Deploy ───────────────────────────────────────────────────
make deploy           # Deploy site + og-worker + api-worker in sequence
make deploy-site      # Deploy main Astro Worker only
make deploy-og        # Deploy og-worker only
make deploy-api       # Deploy api-worker only
make rollback         # Wrangler rollback on all three Workers

# ── Promote ──────────────────────────────────────────────────
make promote ENV=staging   # Deploy to staging environment
make promote ENV=prod      # Full production deploy + og-gen + health check

# ── Ops ──────────────────────────────────────────────────────
make logs             # Tail live Wrangler logs (all workers, multiplexed)
make status           # Curl /status endpoint and pretty-print JSON
make r2-sync          # Mirror MinIO → R2 (used in CI before prod deploy)
```

`make dev` uses GNU Make's `-j3` parallel flag to start Astro dev server, Wrangler dev (workers), and MinIO simultaneously. A single `Ctrl+C` kills all three.

---

## 10. Technology Stack

| Concern | Technology |
|---|---|
| Site framework | Astro 4.x |
| Edge runtime | Cloudflare Workers (`@astrojs/cloudflare`) |
| Island UI | React (islands only — no full React app) |
| OG rendering | Satori + resvg-wasm |
| Object storage (local) | MinIO (Docker) |
| Object storage (prod) | Cloudflare R2 |
| KV store | Cloudflare Workers KV |
| Content authoring | MDX + Astro Content Collections |
| Package manager | pnpm |
| Orchestration | GNU Make |
| Local MinIO client | mc (MinIO Client CLI) |
| Container runtime | Docker Compose |
| Blog comments | Giscus (GitHub Discussions-backed) |

---

## 11. Out of Scope

- CMS integrations (Sanity, Contentlayer, Notion) — MDX-in-repo is sufficient
- Analytics beyond Cloudflare's built-in analytics
- Authentication / admin panel
- Admin panel or comment moderation UI (Giscus delegates moderation to GitHub Discussions)
- Dark/light mode toggle (can be added later without architectural changes)
- CI/CD pipeline (Makefile is the deploy mechanism; GitHub Actions can wrap it later)
