# infra-folio

A high-performance **DevOps / developer portfolio** built on the Cloudflare edge. One Astro site backed by three independently deployable Cloudflare Workers, with a single `make` command for every local and production workflow.

It's designed to serve two audiences at once — **freelance clients** evaluating capability and reach-out paths, and **engineers / the open-source community** looking for technical depth and live activity.

> **Use this as a template.** infra-folio is structured so you can fork it, swap in your own content and config, and deploy your own portfolio. Search for the placeholders (`your-handle`, `yourdomain.com`, `you@example.com`) and follow the [Make it yours](#make-it-yours) checklist.

<p align="center">
  <img alt="Astro" src="https://img.shields.io/badge/Astro-4.x-FF5D01?logo=astro&logoColor=white">
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg">
</p>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start (Local Dev)](#quick-start-local-dev)
- [Configuration](#configuration)
- [Authoring Content](#authoring-content)
- [Feature Flags](#feature-flags)
- [Rendering Model](#rendering-model)
- [The Workers](#the-workers)
- [Storage](#storage)
- [Make Targets](#make-targets)
- [Deploying to Production](#deploying-to-production)
- [Make it yours](#make-it-yours)
- [Testing](#testing)
- [Roadmap & Out of Scope](#roadmap--out-of-scope)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Features

- **Edge-native.** Astro in `hybrid` mode on Cloudflare Workers — static pages prerendered, dynamic routes server-rendered at the edge.
- **Single-page homepage** assembled from 8 composable sections: Hero, About, Skills, Projects, Open Source, Blog, Status Panel, Contact.
- **MDX content collections** for blog posts and projects, with type-safe frontmatter (Zod schemas).
- **Dynamic Open Graph images.** A dedicated `og-worker` renders per-post / per-project social cards (Satori → SVG → PNG via resvg-wasm) and caches them in R2 for a year.
- **Live infrastructure panel.** An optional `LiveTerminal` island shows real-time edge region / uptime plus a polling GitHub activity feed, proxied through `api-worker` (token never hits the browser).
- **Contact form** with client-side validation and an SSR edge handler that delivers email via [Resend](https://resend.com).
- **Blog comments** via [Giscus](https://giscus.app) (GitHub Discussions–backed, zero backend).
- **Feature flags** (`LIVE_TERMINAL`, `CONTACT_FORM`) resolved identically in Astro and Worker runtimes — deploy-time config, no hidden runtime state.
- **One operator interface.** A `Makefile` orchestrates dev, build, deploy, media sync, OG pre-warming, logs, and health checks.
- **Local parity.** MinIO (Docker) stands in for R2 locally behind a single storage adapter — feature code never imports an S3/R2 SDK directly.
- **Tested.** Component tests (Testing Library + jsdom) and unit/integration tests via Vitest.

---

## Architecture

Three independently deployable Cloudflare Workers sit behind the Cloudflare CDN:

```
Browser
  └── Cloudflare CDN
        ├── site-worker   ← Astro hybrid SSG/SSR (the website itself)
        ├── og-worker     ← OG image generation (Satori + resvg-wasm), cached in R2
        └── api-worker    ← /status + GitHub feed/stats proxy (KV-cached)

Local dev
  └── Astro dev server + Wrangler dev (og + api) + MinIO (Docker), all via `make dev`
```

Each Worker has its own `wrangler.toml` and deploys on its own cadence. The site talks to the workers over HTTP (`API_BASE` / `og.<domain>`), so you can deploy, roll back, or flag-off any piece in isolation.

The full design rationale lives in [`docs/superpowers/specs/2026-06-23-portfolio-design.md`](docs/superpowers/specs/2026-06-23-portfolio-design.md).

---

## Tech Stack

| Concern | Technology |
|---|---|
| Site framework | [Astro 4.x](https://astro.build) (`hybrid` output) |
| Edge runtime | [Cloudflare Workers](https://workers.cloudflare.com) via `@astrojs/cloudflare` |
| Island UI | React 18 (islands only — no full SPA) |
| OG image rendering | [Satori](https://github.com/vercel/satori) + [resvg-wasm](https://github.com/yisibl/resvg-js) |
| Object storage | MinIO (local) / [Cloudflare R2](https://developers.cloudflare.com/r2/) (prod) |
| Cache / KV | Cloudflare Workers KV |
| Content | MDX + Astro Content Collections |
| Email delivery | [Resend](https://resend.com) |
| Comments | [Giscus](https://giscus.app) (GitHub Discussions) |
| Package manager | [pnpm](https://pnpm.io) (workspace) |
| Orchestration | GNU Make |
| Tests | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) + jsdom |

---

## Repository Structure

```
infra-folio/
├── src/                          # Astro application (the site-worker)
│   ├── pages/
│   │   ├── index.astro           # Single-page homepage (8 sections)
│   │   ├── blog/
│   │   │   ├── index.astro       # Blog listing (static)
│   │   │   └── [slug].astro      # Post page (SSR — dynamic og:image)
│   │   ├── projects/
│   │   │   ├── index.astro       # Projects listing (static)
│   │   │   └── [slug].astro      # Project page (SSR — dynamic og:image)
│   │   └── api/
│   │       └── contact.ts        # SSR contact-form handler (Resend)
│   ├── components/
│   │   ├── layout/               # Layout shell, Nav, Footer
│   │   ├── sections/             # Hero, About, Skills, Projects, OpenSource,
│   │   │                         #   BlogSection, StatusPanel, Contact
│   │   └── islands/              # Interactive React islands
│   │       ├── LiveTerminal.tsx  #   status + GitHub panel (composes GithubFeed)
│   │       ├── GithubFeed.tsx    #   polling activity feed
│   │       ├── Comments.tsx      #   Giscus widget (blog posts)
│   │       └── ContactForm.tsx   #   validated contact form
│   ├── content/                  # Content Collections
│   │   ├── config.ts             #   blog + projects schemas (Zod)
│   │   ├── blog/                 #   MDX posts
│   │   └── projects/             #   MDX project entries
│   ├── lib/
│   │   ├── storage.ts            # Unified MinIO/R2 adapter
│   │   └── flags.ts              # Feature-flag resolution
│   └── styles/global.css
├── workers/
│   ├── og/                       # OG image Worker (own wrangler.toml)
│   └── api/                      # Status + GitHub Worker (own wrangler.toml)
├── infra/
│   ├── docker-compose.yml        # MinIO for local dev
│   └── minio-init.sh             # Bucket creation + public-read policy
├── docs/superpowers/             # Design spec + implementation plans
├── astro.config.mjs
├── wrangler.toml                 # site-worker config
├── Makefile                      # single operator interface
└── .env.example
```

---

## Prerequisites

- **Node.js** ≥ 18
- **[pnpm](https://pnpm.io/installation)** (this repo is a pnpm workspace)
- **Docker** + Docker Compose (for local MinIO)
- **GNU Make**
- **[MinIO Client `mc`](https://min.io/docs/minio/linux/reference/minio-mc.html)** (for media sync targets)
- A **Cloudflare account** (for deploying) — Workers, R2, and KV
- Optional accounts for full functionality: **GitHub** (activity feed token + Giscus), **Resend** (contact email)

---

## Quick Start (Local Dev)

```bash
# 1. Clone and install
git clone https://github.com/your-handle/infra-folio.git
cd infra-folio
pnpm install

# 2. Configure
cp .env.example .env
#    edit .env — for a first run the defaults work; MinIO creds are pre-filled

# 3. Run everything (Astro + og-worker + api-worker + MinIO) in parallel
make dev
```

`make dev` brings up MinIO via Docker, initializes the bucket, then starts the Astro dev server and both Wrangler dev workers together (GNU Make `-j3`). A single `Ctrl+C` stops all of them.

Default local ports:

| Service | URL |
|---|---|
| Astro site | http://localhost:4321 |
| api-worker (`/status`, `/github/feed`) | http://localhost:8787 |
| og-worker (`/og`) | http://localhost:8788 |
| MinIO API / console | http://localhost:9000 / http://localhost:9001 |

> **Just the site?** `pnpm dev` runs the Astro dev server alone. The `LiveTerminal` island is off by default (`LIVE_TERMINAL=false`), so the site renders fully without the workers running.

---

## Configuration

All configuration is environment-driven. Copy `.env.example` → `.env` and fill in values. The `Makefile` loads `.env` automatically.

| Variable | Used by | Notes |
|---|---|---|
| `ENVIRONMENT` | storage adapter | `local` → MinIO, `prod` → R2 |
| `LIVE_TERMINAL` | site | Feature flag (default `false`) |
| `CONTACT_FORM` | site | Feature flag (default `true`) |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | local storage | MinIO credentials |
| `MINIO_ENDPOINT` | local storage | Default `http://localhost:9000` |
| `MINIO_ALIAS` | Makefile / `mc` | MinIO Client alias name |
| `DOMAIN` | Makefile (`og-gen`, `status`) | Your production domain |
| `MEDIA_PUBLIC_DOMAIN` | prod storage | R2 public domain (e.g. `assets.yourdomain.com`) |
| `API_BASE` | `LiveTerminal` island | api-worker base URL |
| `GITHUB_TOKEN` | api-worker | **Secret** in prod (`wrangler secret put`); use `.dev.vars` locally |
| `GISCUS_REPO` / `GISCUS_REPO_ID` / `GISCUS_CATEGORY_ID` | blog comments | From [giscus.app](https://giscus.app) |
| `RESEND_API_KEY` | contact handler | **Secret** in prod; if unset, submissions are accepted but dropped (logged) |
| `CONTACT_TO_EMAIL` | contact handler | Where contact emails are delivered |

> **Secrets vs. vars.** `GITHUB_TOKEN` and `RESEND_API_KEY` are secrets — never commit them. In production set them with `wrangler secret put <NAME>`. For local Worker dev, put them in a git-ignored `.dev.vars` inside the relevant worker directory.

---

## Authoring Content

Content lives in `src/content/` as MDX, validated against Zod schemas in `src/content/config.ts`.

**Blog post** (`src/content/blog/my-post.mdx`):

```mdx
---
title: "My Post Title"
date: 2026-06-24
tags: ["devops", "cloudflare"]
coverImage: "https://assets.yourdomain.com/blog/my-post/cover.png"
excerpt: "One-sentence summary used in listings and OG cards."
---

Your **MDX** content here.
```

**Project** (`src/content/projects/my-project.mdx`):

```mdx
---
title: "My Project"
description: "What it does and why it matters."
tags: ["kubernetes", "terraform"]
demoUrl: "https://demo.example.com"      # optional
repoUrl: "https://github.com/your-handle/my-project"  # optional
media: ["https://assets.yourdomain.com/projects/my-project/screenshot.png"]
featured: true                            # featured: true surfaces it on the homepage
---

Project write-up in MDX.
```

The homepage **Projects** section shows entries with `featured: true`; **Blog** shows the latest 3 posts by date. `/blog` and `/projects` list everything.

---

## Feature Flags

Flags are defined once in `src/lib/flags.ts` and resolved the same way in both Astro and Worker runtimes:

| Flag | Default | Off | On |
|---|---|---|---|
| `LIVE_TERMINAL` | `false` | Status Panel section not rendered; api-worker is not called | `LiveTerminal` island mounts and polls api-worker for live status + GitHub feed |
| `CONTACT_FORM` | `true` | Contact section hidden | Contact form rendered; `/api/contact` active |

Flags are **deploy-time configuration** — there's no database or runtime store. Changing one requires a redeploy (intentional: no hidden state). Override per deploy, e.g.:

```bash
LIVE_TERMINAL=true make deploy
```

---

## Rendering Model

`@astrojs/cloudflare` in **hybrid** mode. Pages prerender to static by default; routes opt into SSR with `export const prerender = false`.

| Route | Mode | Why |
|---|---|---|
| `/` | Static | Build-time deterministic |
| `/blog/`, `/projects/` | Static | Regenerated on deploy |
| `/blog/[slug]`, `/projects/[slug]` | SSR | Emit a dynamic `og:image` meta tag pointing at og-worker |
| `/api/contact` | SSR | Form submission handler |

**Islands** all hydrate with `client:visible` and receive flags/config as **props** — island components never read env vars or import `flags` directly. `GithubFeed` is only ever composed inside `LiveTerminal`.

---

## The Workers

### `og-worker` — Open Graph images

```
GET /og?type=blog|project&slug={slug}&title={title}&description={description}
```

1. Look up `og/{type}-{slug}.png` in R2 — return immediately on hit (`X-Cache: HIT`).
2. On miss: render with Satori (HTML→SVG) + resvg-wasm (SVG→PNG), stream the PNG back, and write to R2 in the background (`X-Cache: MISS`).
3. Served with `Cache-Control: public, max-age=31536000, immutable`.

Inputs are validated (type whitelist, slug charset, title ≤ 200, description ≤ 300). Bindings: `MEDIA_BUCKET` (R2). Invalidate with `make og-purge SLUG=<slug>`; pre-warm all slugs with `make og-gen`.

### `api-worker` — status & GitHub

| Route | Purpose | Cache |
|---|---|---|
| `GET /status` | Edge region (`cf.colo`), worker uptime, timestamp | none (real-time) |
| `GET /github/feed` | Recent public GitHub events | KV, 5-min TTL |
| `GET /github/stats` | Stars / public repos / followers | KV, 5-min TTL |

GitHub calls are proxied so `GITHUB_TOKEN` stays server-side; CORS is enabled for browser fetches. Bindings: `GITHUB_CACHE` (KV), `GITHUB_TOKEN` (secret).

### `/api/contact` — contact handler (in site-worker)

SSR endpoint that validates `{ name, email, message }`, then sends email via Resend. Returns `{ success: true }` (200) or `{ error }` (400/500). User input is HTML-escaped before going into the email body. If `RESEND_API_KEY` is unset it returns success but logs that the submission was dropped (so the form degrades gracefully in dev).

---

## Storage

`src/lib/storage.ts` exports one adapter that switches on `ENVIRONMENT` at module init — **MinIO** (S3-compatible, via `@aws-sdk/client-s3`) locally, **R2** in production. No feature code imports a storage SDK directly.

Bucket layout (identical in MinIO and R2):

```
media/
├── blog/{slug}/          # post images, diagrams
├── projects/{slug}/      # demo media, screenshots
├── og/{type}-{slug}.png  # cached OG images (written by og-worker)
├── assets/               # resume.pdf, avatar, …
└── downloads/            # zips, etc.
```

Sync local media up with `make media-upload SRC=./media`, pull with `make media-pull SRC=./media`, and mirror MinIO → R2 before a prod deploy with `make r2-sync`.

---

## Make Targets

```text
# Dev
make dev                      # Astro + og + api + MinIO (parallel)
make minio-up / minio-down    # start / stop MinIO
make tunnel                   # expose local dev via Cloudflare tunnel

# Media / OG
make media-upload SRC=./media # local assets → MinIO (dev) / R2 (prod)
make media-pull   SRC=./media # bucket → local
make og-gen                   # pre-warm all OG images
make og-purge SLUG=my-post    # delete a cached OG image → force regen

# Build & preview
make build                    # Astro hybrid build
make preview                  # production-like local (Wrangler + MinIO)

# Deploy
make deploy                   # og + api + site, in order
make deploy-site|deploy-og|deploy-api
make rollback                 # wrangler rollback on all three workers

# Promote
make promote ENV=staging      # deploy to staging
make promote ENV=prod         # full prod deploy + og-gen + health check

# Ops
make logs                     # tail all three workers (multiplexed)
make status                   # curl /status and pretty-print
make r2-sync                  # mirror MinIO → R2
```

---

## Deploying to Production

1. **Authenticate Wrangler:** `pnpm exec wrangler login`.
2. **Create an R2 bucket** named `infra-folio-media` (or rename it consistently in the worker `wrangler.toml` files), and attach a public domain (`assets.yourdomain.com`).
3. **Create a KV namespace** and put its ID in `workers/api/wrangler.toml` (replace `REPLACE_WITH_ACTUAL_KV_NAMESPACE_ID`).
4. **Set secrets:**
   ```bash
   cd workers/api && pnpm exec wrangler secret put GITHUB_TOKEN
   # site-worker (contact form):
   pnpm exec wrangler secret put RESEND_API_KEY
   ```
5. **Set vars** in `wrangler.toml` (`CONTACT_TO_EMAIL`, flags) and `.env` (`DOMAIN`, `MEDIA_PUBLIC_DOMAIN`).
6. **Configure routes/custom domains** for all three workers in the Cloudflare dashboard (site at `yourdomain.com`, `api.yourdomain.com`, `og.yourdomain.com`).
7. **Deploy:** `make promote ENV=prod` (deploys all three, pre-warms OG images, runs a health check).

---

## Make it yours

After forking, work through this checklist:

- [ ] **Identity & copy** — edit the `src/components/sections/*.astro` files (Hero, About, Skills, etc.) and `Footer.astro` / `Nav.astro`.
- [ ] **GitHub handle** — set `GITHUB_USERNAME` in `workers/api/src/index.ts`.
- [ ] **Contact email** — set `CONTACT_TO_EMAIL` in `wrangler.toml`/`.env`, and update the `from` sender address in `src/pages/api/contact.ts` to a domain you've verified in Resend. (Remove the hardcoded fallback recipient there too.)
- [ ] **Worker names / bucket** — the `name` in each `wrangler.toml` (`infra-folio`, `infra-folio-api`, `infra-folio-og`) and the R2 bucket name (`infra-folio-media`).
- [ ] **KV namespace id** — `workers/api/wrangler.toml`.
- [ ] **Comments** — configure your repo at [giscus.app](https://giscus.app) and set `GISCUS_*` vars (or remove `Comments.tsx` usage to disable).
- [ ] **Content** — replace the sample MDX in `src/content/blog` and `src/content/projects`.
- [ ] **Domains** — `DOMAIN`, `MEDIA_PUBLIC_DOMAIN`, and the worker routes.
- [ ] **Branding** — `src/styles/global.css` (CSS variables) and the OG template in `workers/og/src/template.tsx`.
- [ ] **License** — update the copyright holder in `LICENSE`.

---

## Testing

```bash
pnpm check              # astro check (type-check)
pnpm test               # unit + component tests (Vitest, jsdom)
pnpm test:integration   # integration tests
pnpm test:watch         # watch mode
pnpm build              # full build (also catches type/route errors)
```

Component tests for the islands live in `src/components/islands/__tests__/`; library tests in `src/lib/__tests__/`.

---

## Roadmap & Out of Scope

Intentionally **not** included (and why):

- **CMS integrations** — MDX-in-repo is sufficient.
- **Auth / admin panel** — no moderation UI; Giscus delegates moderation to GitHub Discussions.
- **Dark/light toggle** — can be added without architectural change.
- **Analytics** beyond Cloudflare's built-in.
- **CI/CD pipeline** — the Makefile is the deploy mechanism; wrap it in GitHub Actions if you want.

Possible future hardening (tracked, non-blocking): fetch timeouts on the live-feed islands, fail-closed handling when `CONTACT_TO_EMAIL` is unset.

---

## Contributing

Issues and PRs are welcome. For non-trivial changes, please open an issue first to discuss the approach. Before submitting:

```bash
pnpm check && pnpm test && pnpm build   # all green
```

Keep changes focused, match the surrounding code style, and add tests for new behavior.

---

## License

Released under the [MIT License](LICENSE). Update the copyright holder in `LICENSE` to your name when you fork.

---

## Acknowledgements

Built with [Astro](https://astro.build), [Cloudflare Workers](https://workers.cloudflare.com), [Satori](https://github.com/vercel/satori), [resvg-wasm](https://github.com/yisibl/resvg-js), [Giscus](https://giscus.app), and [Resend](https://resend.com).
