# Astro Site Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Astro site — Content Collections, global layout, all homepage sections, and blog/project listing + detail pages — so `make build` produces a fully navigable portfolio site with sample content.

**Architecture:** Astro hybrid mode. All homepage sections and listing pages are statically prerendered at build time. Individual post/project pages (`/blog/[slug]`, `/projects/[slug]`) are SSR-rendered per-request so they can emit dynamic `og:image` meta tags pointing to the og-worker. Feature flags gate two sections (`LIVE_TERMINAL`, `CONTACT_FORM`). The interactive islands (`LiveTerminal`, `Comments`, contact form) are stubs in this plan — Plan 06 implements them.

**Tech Stack:** Astro 4.x, @astrojs/cloudflare (hybrid), MDX, Astro Content Collections, React 18 (islands only), TypeScript 5.x

## Global Constraints

- Prerequisite: Plans 01–02 complete (`storage.ts`, `flags.ts`, Makefile, Astro scaffold exist)
- Page routes must match exactly: `/`, `/blog/`, `/blog/[slug]`, `/projects/`, `/projects/[slug]`, `/api/contact` (Plan 06)
- SSR pages must have `export const prerender = false` — static pages must NOT have this export
- OG image meta tag format: `https://og.{DOMAIN}/og?type={type}&slug={slug}&title={encodeURIComponent(title)}&description={encodeURIComponent(description)}`
- Content Collections: `blog` collection uses `src/content/blog/*.mdx`; `projects` uses `src/content/projects/*.mdx`
- Featured projects: `featured: true` in frontmatter; homepage shows only featured projects
- Homepage blog section: latest 3 posts sorted by `date` descending
- `pnpm check` and `pnpm build` must both exit 0 after every task

---

### Task 1: Content Collections Schema & Sample Content

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/blog/hello-world.mdx`
- Create: `src/content/projects/infra-folio.mdx`

**Interfaces:**
- Produces:
  - `getCollection('blog')` returns posts with `{ title, date, tags, coverImage, excerpt }` frontmatter
  - `getCollection('projects')` returns projects with `{ title, description, tags, demoUrl, repoUrl, media, featured }` frontmatter

> **Note (added post-merge):** the sample content is authored as `.mdx`, which requires the `@astrojs/mdx` integration. Without it, Astro **silently** drops `.mdx` entries — `getCollection` returns an empty array, the build only emits a `"collection ... does not exist or is empty"` warning (not an error), and the blog/projects listing pages render empty. Install and register it: `pnpm add @astrojs/mdx` and add `mdx()` to `integrations` in `astro.config.mjs`.

- [ ] **Step 1: Write the failing type check**

At this point `src/content/config.ts` doesn't exist; running `pnpm check` will pass (no schema = no validation). The "failure" here is that sample content without a schema would silently ignore type errors. We write the schema first, then sample content, then verify.

- [ ] **Step 2: Create src/content/config.ts**

```typescript
import { z, defineCollection } from 'astro:content'

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()),
    coverImage: z.string().url(),
    excerpt: z.string(),
  }),
})

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    demoUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
    media: z.array(z.string().url()),
    featured: z.boolean(),
  }),
})

export const collections = { blog, projects }
```

- [ ] **Step 3: Create src/content/blog/hello-world.mdx**

```mdx
---
title: "Hello World: Building infra-folio"
date: 2026-06-23
tags: ["devops", "cloudflare", "astro"]
coverImage: "http://localhost:9000/infra-folio-media/blog/hello-world/cover.png"
excerpt: "A walkthrough of how I built this portfolio site on Cloudflare Workers with Astro."
---

# Hello World

This is the first post on infra-folio. It documents the journey of building a developer
portfolio on Cloudflare Workers using Astro in hybrid mode.

## Why Cloudflare Workers?

Edge computing eliminates cold starts and keeps latency under 50ms globally.
```

- [ ] **Step 4: Create src/content/projects/infra-folio.mdx**

```mdx
---
title: "infra-folio"
description: "High-performance DevOps portfolio built on Cloudflare Workers + Astro hybrid SSG/SSR."
tags: ["cloudflare", "astro", "typescript", "r2"]
repoUrl: "https://github.com/phuctruong/infra-folio"
media:
  - "http://localhost:9000/infra-folio-media/projects/infra-folio/screenshot.png"
featured: true
---

## Overview

infra-folio is this portfolio site. It uses Astro in hybrid mode, three independently
deployable Cloudflare Workers, Cloudflare R2 for media, and a unified MinIO/R2 storage
adapter for local dev parity.
```

- [ ] **Step 5: Run type check**

Run: `pnpm check`

Expected: Exits 0

- [ ] **Step 6: Run build**

Run: `pnpm build`

Expected: Exits 0; content collections synced in `.astro/`

- [ ] **Step 7: Commit**

```bash
git add src/content/
git commit -m "feat: add Content Collections schema and sample blog post + project"
```

---

### Task 2: Global Layout, Nav & Footer

**Files:**
- Create: `src/styles/global.css`
- Create: `src/components/layout/Layout.astro`
- Create: `src/components/layout/Nav.astro`
- Create: `src/components/layout/Footer.astro`

**Interfaces:**
- Produces: `<Layout title="..." description="..." ogImage="...">` wrapper used by all pages

- [ ] **Step 1: Create src/styles/global.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-border: #334155;
  --color-text: #f1f5f9;
  --color-muted: #94a3b8;
  --color-accent: #6366f1;
  --color-accent-2: #10b981;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --max-width: 1100px;
  --section-pad: clamp(3rem, 8vw, 6rem) 1.5rem;
}

html { scroll-behavior: smooth; }
body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-sans); line-height: 1.6; }
a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; display: block; }

.container { max-width: var(--max-width); margin: 0 auto; padding: 0 1.5rem; }
section { padding: var(--section-pad); }
h1, h2, h3 { line-height: 1.2; font-weight: 700; }
h2 { font-size: clamp(1.75rem, 4vw, 2.5rem); margin-bottom: 2rem; }
```

- [ ] **Step 2: Create src/components/layout/Nav.astro**

```astro
---
---
<nav class="nav">
  <div class="container nav__inner">
    <a href="/" class="nav__logo">phuctruong.dev</a>
    <ul class="nav__links">
      <li><a href="/#about">About</a></li>
      <li><a href="/#projects">Projects</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/#contact">Contact</a></li>
    </ul>
  </div>
</nav>

<style>
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
}
.nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}
.nav__logo {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-text);
  text-decoration: none;
}
.nav__links {
  display: flex;
  list-style: none;
  gap: 2rem;
}
.nav__links a {
  color: var(--color-muted);
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
}
.nav__links a:hover { color: var(--color-text); text-decoration: none; }
</style>
```

- [ ] **Step 3: Create src/components/layout/Footer.astro**

```astro
---
const year = new Date().getFullYear()
---
<footer class="footer">
  <div class="container footer__inner">
    <span class="footer__copy">&copy; {year} Phuc Truong. All rights reserved.</span>
    <nav class="footer__links">
      <a href="https://github.com/phuctruong" target="_blank" rel="noopener">GitHub</a>
      <a href="https://linkedin.com/in/phuctruong" target="_blank" rel="noopener">LinkedIn</a>
    </nav>
  </div>
</footer>

<style>
.footer {
  border-top: 1px solid var(--color-border);
  padding: 2rem 0;
}
.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.footer__copy { color: var(--color-muted); font-size: 0.875rem; }
.footer__links { display: flex; gap: 1.5rem; }
.footer__links a { color: var(--color-muted); font-size: 0.875rem; }
.footer__links a:hover { color: var(--color-text); text-decoration: none; }
</style>
```

- [ ] **Step 4: Create src/components/layout/Layout.astro**

```astro
---
import Nav from './Nav.astro'
import Footer from './Footer.astro'
import '../../../src/styles/global.css'

interface Props {
  title: string
  description: string
  ogImage?: string
}

const { title, description, ogImage } = Astro.props
const canonicalUrl = new URL(Astro.url.pathname, Astro.site ?? 'https://phuctruong.dev')
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalUrl.href} />

    <!-- Open Graph -->
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonicalUrl.href} />
    <meta property="og:type" content="website" />
    {ogImage && <meta property="og:image" content={ogImage} />}
    {ogImage && <meta name="twitter:card" content="summary_large_image" />}
    {ogImage && <meta name="twitter:image" content={ogImage} />}

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

> **Note:** The `import '../../../src/styles/global.css'` path assumes Layout.astro is at `src/components/layout/Layout.astro`. Adjust if the nesting changes.

- [ ] **Step 5: Update src/pages/index.astro to use the layout**

```astro
---
import Layout from '../components/layout/Layout.astro'
---
<Layout title="Phuc Truong — DevOps Engineer" description="Portfolio of Phuc Truong, DevOps and infrastructure engineer.">
  <h1>Coming soon</h1>
</Layout>
```

- [ ] **Step 6: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 7: Commit**

```bash
git add src/styles/ src/components/layout/ src/pages/index.astro
git commit -m "feat: add global layout, Nav, Footer, and CSS variables"
```

---

### Task 3: Hero & About Sections

**Files:**
- Create: `src/components/sections/Hero.astro`
- Create: `src/components/sections/About.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Produces: Homepage renders Hero (name, title, CTAs) and About (bio) sections

- [ ] **Step 1: Create src/components/sections/Hero.astro**

```astro
---
---
<section class="hero" id="home">
  <div class="container hero__inner">
    <div class="hero__badge">Available for freelance work</div>
    <h1 class="hero__name">Phuc Truong</h1>
    <p class="hero__title">DevOps & Infrastructure Engineer</p>
    <p class="hero__value">
      I build reliable, scalable infrastructure so your team can ship faster and sleep better.
    </p>
    <div class="hero__cta">
      <a href="/#contact" class="btn btn--primary">Hire me</a>
      <a href="/#projects" class="btn btn--ghost">View work</a>
    </div>
  </div>
</section>

<style>
.hero {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  padding: var(--section-pad);
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 70%);
}
.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.3);
  color: var(--color-accent-2);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  margin-bottom: 1.5rem;
}
.hero__badge::before { content: '●'; font-size: 0.5rem; }
.hero__name {
  font-size: clamp(2.5rem, 8vw, 5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}
.hero__title {
  font-size: clamp(1.1rem, 3vw, 1.5rem);
  color: var(--color-accent);
  font-weight: 500;
  margin-bottom: 1.25rem;
}
.hero__value {
  font-size: clamp(1rem, 2vw, 1.2rem);
  color: var(--color-muted);
  max-width: 560px;
  margin-bottom: 2.5rem;
  line-height: 1.7;
}
.hero__cta { display: flex; gap: 1rem; flex-wrap: wrap; }
.btn {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.btn--primary {
  background: var(--color-accent);
  color: #fff;
}
.btn--primary:hover { background: #4f46e5; text-decoration: none; }
.btn--ghost {
  border: 1px solid var(--color-border);
  color: var(--color-text);
}
.btn--ghost:hover { border-color: var(--color-accent); text-decoration: none; }
</style>
```

- [ ] **Step 2: Create src/components/sections/About.astro**

```astro
---
---
<section class="about" id="about">
  <div class="container">
    <h2>About me</h2>
    <div class="about__grid">
      <div class="about__text">
        <p>
          I'm a DevOps and infrastructure engineer with a passion for building systems that
          are observable, reproducible, and boring in the best possible way.
        </p>
        <p>
          My background spans cloud infrastructure (AWS, GCP, Cloudflare), container
          orchestration (Kubernetes, Docker), and platform engineering — with a strong
          preference for infrastructure-as-code and GitOps workflows.
        </p>
        <p>
          What makes my perspective unique: I've worked on both the ops side (keeping
          things running) and the developer experience side (making it easy to ship).
          That overlap is where I do my best work.
        </p>
        <a href="/assets/resume.pdf" class="btn btn--ghost" target="_blank">Download resume</a>
      </div>
    </div>
  </div>
</section>

<style>
.about { background: var(--color-surface); }
.about__grid { max-width: 720px; }
.about__text { display: flex; flex-direction: column; gap: 1.25rem; }
.about__text p { color: var(--color-muted); line-height: 1.8; }
.btn--ghost {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
  transition: all 0.2s;
  align-self: flex-start;
  margin-top: 0.5rem;
}
.btn--ghost:hover { border-color: var(--color-accent); text-decoration: none; }
</style>
```

- [ ] **Step 3: Update src/pages/index.astro to render Hero and About**

```astro
---
import Layout from '../components/layout/Layout.astro'
import Hero from '../components/sections/Hero.astro'
import About from '../components/sections/About.astro'
---
<Layout title="Phuc Truong — DevOps Engineer" description="Portfolio of Phuc Truong, DevOps and infrastructure engineer.">
  <Hero />
  <About />
</Layout>
```

- [ ] **Step 4: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Hero.astro src/components/sections/About.astro src/pages/index.astro
git commit -m "feat: add Hero and About homepage sections"
```

---

### Task 4: Skills & Projects Sections

**Files:**
- Create: `src/components/sections/Skills.astro`
- Create: `src/components/sections/Projects.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection('projects')` — renders only entries where `featured === true`
- Produces: Skills grid with technology tags; Projects grid with featured project cards

- [ ] **Step 1: Create src/components/sections/Skills.astro**

```astro
---
const skills = {
  Languages: ['TypeScript', 'Python', 'Go', 'Bash', 'HCL'],
  Infrastructure: ['Terraform', 'Ansible', 'Docker', 'Kubernetes', 'Helm'],
  Cloud: ['AWS', 'Google Cloud', 'Cloudflare', 'Cloudflare Workers', 'R2'],
  'CI/CD & Ops': ['GitHub Actions', 'ArgoCD', 'Prometheus', 'Grafana', 'Datadog'],
}
---
<section class="skills" id="skills">
  <div class="container">
    <h2>Skills & Stack</h2>
    <div class="skills__groups">
      {Object.entries(skills).map(([group, items]) => (
        <div class="skills__group">
          <h3>{group}</h3>
          <div class="skills__tags">
            {items.map(tag => <span class="tag">{tag}</span>)}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
.skills__groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 2rem; }
.skills__group h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-accent); margin-bottom: 1rem; }
.skills__tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.tag {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}
</style>
```

- [ ] **Step 2: Create src/components/sections/Projects.astro**

```astro
---
import { getCollection } from 'astro:content'

const allProjects = await getCollection('projects')
const featured = allProjects.filter(p => p.data.featured)
---
<section class="projects" id="projects">
  <div class="container">
    <h2>Featured Projects</h2>
    <div class="projects__grid">
      {featured.map(project => (
        <article class="project-card">
          {project.data.media[0] && (
            <img
              src={project.data.media[0]}
              alt={project.data.title}
              class="project-card__img"
              loading="lazy"
            />
          )}
          <div class="project-card__body">
            <h3 class="project-card__title">{project.data.title}</h3>
            <p class="project-card__desc">{project.data.description}</p>
            <div class="project-card__tags">
              {project.data.tags.map(tag => <span class="tag">{tag}</span>)}
            </div>
            <div class="project-card__links">
              {project.data.repoUrl && (
                <a href={project.data.repoUrl} target="_blank" rel="noopener">GitHub →</a>
              )}
              {project.data.demoUrl && (
                <a href={project.data.demoUrl} target="_blank" rel="noopener">Demo →</a>
              )}
              <a href={`/projects/${project.slug}/`}>Details →</a>
            </div>
          </div>
        </article>
      ))}
    </div>
    <div class="projects__more">
      <a href="/projects/" class="btn btn--ghost">All projects</a>
    </div>
  </div>
</section>

<style>
.projects { background: var(--color-surface); }
.projects__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
.project-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.project-card:hover { border-color: var(--color-accent); }
.project-card__img { width: 100%; height: 200px; object-fit: cover; }
.project-card__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
.project-card__title { font-size: 1.1rem; font-weight: 700; color: var(--color-text); }
.project-card__desc { color: var(--color-muted); font-size: 0.9rem; line-height: 1.6; }
.project-card__tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.project-card__links { display: flex; gap: 1rem; flex-wrap: wrap; }
.project-card__links a { color: var(--color-accent); font-size: 0.875rem; font-weight: 500; }
.projects__more { margin-top: 2.5rem; text-align: center; }
.btn--ghost {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
  transition: all 0.2s;
}
.btn--ghost:hover { border-color: var(--color-accent); text-decoration: none; }
</style>
```

- [ ] **Step 3: Update index.astro**

```astro
---
import Layout from '../components/layout/Layout.astro'
import Hero from '../components/sections/Hero.astro'
import About from '../components/sections/About.astro'
import Skills from '../components/sections/Skills.astro'
import Projects from '../components/sections/Projects.astro'
---
<Layout title="Phuc Truong — DevOps Engineer" description="Portfolio of Phuc Truong, DevOps and infrastructure engineer.">
  <Hero />
  <About />
  <Skills />
  <Projects />
</Layout>
```

- [ ] **Step 4: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Skills.astro src/components/sections/Projects.astro src/pages/index.astro
git commit -m "feat: add Skills and Projects homepage sections"
```

---

### Task 5: Open Source & Blog Sections + Conditional Stubs

**Files:**
- Create: `src/components/sections/OpenSource.astro`
- Create: `src/components/sections/BlogSection.astro`
- Create: `src/components/sections/StatusPanel.astro` (stub — Plan 06 fills this in)
- Create: `src/components/sections/Contact.astro` (stub — Plan 06 fills this in)
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `getCollection('blog')` for latest 3 posts; `flags` from `src/lib/flags.ts`
- Produces: Full homepage with all 8 sections; StatusPanel and Contact are conditionally rendered

- [ ] **Step 1: Create src/components/sections/OpenSource.astro**

```astro
---
---
<section class="oss" id="open-source">
  <div class="container">
    <h2>Open Source</h2>
    <p class="oss__intro">
      I contribute to open source projects in the DevOps and infrastructure space.
      Here's a snapshot of my public activity.
    </p>
    <div class="oss__stats">
      <div class="stat">
        <span class="stat__value">50+</span>
        <span class="stat__label">Public repositories</span>
      </div>
      <div class="stat">
        <span class="stat__value">200+</span>
        <span class="stat__label">Pull requests merged</span>
      </div>
      <div class="stat">
        <span class="stat__value">500+</span>
        <span class="stat__label">GitHub stars</span>
      </div>
    </div>
    <p class="oss__note">
      Live GitHub activity panel available — enable <code>LIVE_TERMINAL=true</code> to display it.
    </p>
  </div>
</section>

<style>
.oss { background: var(--color-surface); }
.oss__intro { color: var(--color-muted); max-width: 600px; margin-bottom: 2.5rem; line-height: 1.7; }
.oss__stats { display: flex; gap: 3rem; flex-wrap: wrap; margin-bottom: 2rem; }
.stat { display: flex; flex-direction: column; gap: 0.25rem; }
.stat__value { font-size: 2.5rem; font-weight: 800; color: var(--color-accent); }
.stat__label { font-size: 0.85rem; color: var(--color-muted); }
.oss__note { color: var(--color-muted); font-size: 0.875rem; }
.oss__note code { color: var(--color-accent); background: rgba(99,102,241,0.1); padding: 0.1em 0.4em; border-radius: 4px; }
</style>
```

- [ ] **Step 2: Create src/components/sections/BlogSection.astro**

```astro
---
import { getCollection } from 'astro:content'

const posts = (await getCollection('blog'))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  .slice(0, 3)
---
<section class="blog-section" id="blog">
  <div class="container">
    <h2>Latest Posts</h2>
    <div class="blog-section__grid">
      {posts.map(post => (
        <article class="post-card">
          {post.data.coverImage && (
            <img
              src={post.data.coverImage}
              alt={post.data.title}
              class="post-card__img"
              loading="lazy"
            />
          )}
          <div class="post-card__body">
            <time class="post-card__date" datetime={post.data.date.toISOString()}>
              {post.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <h3 class="post-card__title">
              <a href={`/blog/${post.slug}/`}>{post.data.title}</a>
            </h3>
            <p class="post-card__excerpt">{post.data.excerpt}</p>
            <div class="post-card__tags">
              {post.data.tags.map(tag => <span class="tag">{tag}</span>)}
            </div>
          </div>
        </article>
      ))}
    </div>
    <div class="blog-section__more">
      <a href="/blog/" class="btn btn--ghost">All posts</a>
    </div>
  </div>
</section>

<style>
.blog-section__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
.post-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.post-card:hover { border-color: var(--color-accent); }
.post-card__img { width: 100%; height: 180px; object-fit: cover; }
.post-card__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.post-card__date { color: var(--color-accent); font-size: 0.8rem; font-weight: 600; }
.post-card__title { font-size: 1rem; font-weight: 700; }
.post-card__title a { color: var(--color-text); }
.post-card__title a:hover { color: var(--color-accent); text-decoration: none; }
.post-card__excerpt { color: var(--color-muted); font-size: 0.875rem; line-height: 1.6; }
.post-card__tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.25rem; }
.blog-section__more { margin-top: 2.5rem; text-align: center; }
.btn--ghost {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
  transition: all 0.2s;
}
.btn--ghost:hover { border-color: var(--color-accent); text-decoration: none; }
</style>
```

- [ ] **Step 3: Create src/components/sections/StatusPanel.astro (stub)**

```astro
---
// Full implementation in Plan 06 (Interactive Islands)
---
<section class="status-panel" id="status">
  <div class="container">
    <h2>Infrastructure Status</h2>
    <p style="color: var(--color-muted)">Live terminal requires LIVE_TERMINAL=true and the interactive island.</p>
  </div>
</section>
```

- [ ] **Step 4: Create src/components/sections/Contact.astro (stub)**

```astro
---
// Full implementation in Plan 06 (Interactive Islands)
---
<section class="contact" id="contact">
  <div class="container">
    <h2>Get in Touch</h2>
    <p style="color: var(--color-muted)">Contact form implemented in Plan 06.</p>
  </div>
</section>
```

- [ ] **Step 5: Update src/pages/index.astro — final homepage**

```astro
---
import Layout from '../components/layout/Layout.astro'
import Hero from '../components/sections/Hero.astro'
import About from '../components/sections/About.astro'
import Skills from '../components/sections/Skills.astro'
import Projects from '../components/sections/Projects.astro'
import OpenSource from '../components/sections/OpenSource.astro'
import BlogSection from '../components/sections/BlogSection.astro'
import StatusPanel from '../components/sections/StatusPanel.astro'
import Contact from '../components/sections/Contact.astro'
import { flags } from '../lib/flags'
---
<Layout title="Phuc Truong — DevOps Engineer" description="Portfolio of Phuc Truong, DevOps and infrastructure engineer.">
  <Hero />
  <About />
  <Skills />
  <Projects />
  <OpenSource />
  <BlogSection />
  {flags.LIVE_TERMINAL && <StatusPanel />}
  {flags.CONTACT_FORM && <Contact />}
</Layout>
```

- [ ] **Step 6: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/ src/pages/index.astro
git commit -m "feat: complete homepage with all 8 sections and feature flag gating"
```

---

### Task 6: Blog Listing & Slug Pages

**Files:**
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[slug].astro`

**Interfaces:**
- Consumes: `getCollection('blog')`, `getEntryBySlug('blog', slug)`, `DOMAIN` env var (for OG URL)
- Produces:
  - `/blog/` → static listing of all posts sorted by date
  - `/blog/[slug]` → SSR page with dynamic `og:image` meta tag

- [ ] **Step 1: Create src/pages/blog/index.astro**

```astro
---
import { getCollection } from 'astro:content'
import Layout from '../../components/layout/Layout.astro'

const posts = (await getCollection('blog'))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
---
<Layout title="Blog — Phuc Truong" description="Writing on DevOps, infrastructure, and platform engineering.">
  <section style="padding: var(--section-pad)">
    <div class="container">
      <h1 style="margin-bottom: 2.5rem">Blog</h1>
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 720px">
        {posts.map(post => (
          <article style="border-bottom: 1px solid var(--color-border); padding-bottom: 2rem">
            <time style="color: var(--color-accent); font-size: 0.8rem; font-weight: 600">
              {post.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <h2 style="font-size: 1.3rem; margin: 0.5rem 0">
              <a href={`/blog/${post.slug}/`}>{post.data.title}</a>
            </h2>
            <p style="color: var(--color-muted); line-height: 1.7; margin-bottom: 0.75rem">{post.data.excerpt}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem">
              {post.data.tags.map(tag => <span class="tag">{tag}</span>)}
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
</Layout>

<style>
.tag {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}
</style>
```

- [ ] **Step 2: Create src/pages/blog/[slug].astro**

```astro
---
export const prerender = false

import { getCollection, getEntryBySlug } from 'astro:content'
import Layout from '../../components/layout/Layout.astro'

const { slug } = Astro.params
if (!slug) return Astro.redirect('/blog/')

const post = await getEntryBySlug('blog', slug)
if (!post) return new Response('Not found', { status: 404 })

const { Content } = await post.render()

const domain = import.meta.env.DOMAIN ?? Astro.url.hostname
const ogUrl = `https://og.${domain}/og?type=blog&slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(post.data.title)}&description=${encodeURIComponent(post.data.excerpt)}`
---
<Layout
  title={`${post.data.title} — Phuc Truong`}
  description={post.data.excerpt}
  ogImage={ogUrl}
>
  <article style="max-width: 720px; margin: 0 auto; padding: var(--section-pad)">
    <header style="margin-bottom: 2.5rem">
      <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem">
        {post.data.tags.map(tag => <span class="tag">{tag}</span>)}
      </div>
      <h1 style="margin-bottom: 0.75rem">{post.data.title}</h1>
      <time style="color: var(--color-muted); font-size: 0.875rem">
        {post.data.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </time>
    </header>
    {post.data.coverImage && (
      <img
        src={post.data.coverImage}
        alt={post.data.title}
        style="width: 100%; border-radius: 12px; margin-bottom: 2.5rem"
      />
    )}
    <div class="prose">
      <Content />
    </div>
  </article>
</Layout>

<style>
.tag {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}
.prose { color: var(--color-muted); line-height: 1.8; }
.prose h1, .prose h2, .prose h3 { color: var(--color-text); margin: 2rem 0 1rem; }
.prose p { margin-bottom: 1.25rem; }
.prose code { color: var(--color-accent); background: rgba(99,102,241,0.1); padding: 0.1em 0.4em; border-radius: 4px; font-family: var(--font-mono); font-size: 0.875em; }
.prose pre { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 1.25rem; overflow-x: auto; margin: 1.5rem 0; }
.prose pre code { background: none; padding: 0; }
.prose a { color: var(--color-accent); }
.prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
.prose li { margin-bottom: 0.4rem; }
</style>
```

- [ ] **Step 3: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0; `/blog/` is in the static build; `/blog/[slug]` is SSR (not prerendered)

- [ ] **Step 4: Commit**

```bash
git add src/pages/blog/
git commit -m "feat: add /blog listing page and SSR /blog/[slug] with dynamic OG meta tag"
```

---

### Task 7: Projects Listing & Slug Pages

**Files:**
- Create: `src/pages/projects/index.astro`
- Create: `src/pages/projects/[slug].astro`

**Interfaces:**
- Consumes: `getCollection('projects')`, `getEntryBySlug('projects', slug)`
- Produces:
  - `/projects/` → static listing of all projects
  - `/projects/[slug]` → SSR page with dynamic `og:image` meta tag

- [ ] **Step 1: Create src/pages/projects/index.astro**

```astro
---
import { getCollection } from 'astro:content'
import Layout from '../../components/layout/Layout.astro'

const projects = await getCollection('projects')
---
<Layout title="Projects — Phuc Truong" description="Open source projects and infrastructure work by Phuc Truong.">
  <section style="padding: var(--section-pad)">
    <div class="container">
      <h1 style="margin-bottom: 2.5rem">Projects</h1>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem">
        {projects.map(project => (
          <article style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden">
            {project.data.media[0] && (
              <img src={project.data.media[0]} alt={project.data.title} style="width: 100%; height: 200px; object-fit: cover" loading="lazy" />
            )}
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem">
              <h2 style="font-size: 1.1rem">{project.data.title}</h2>
              <p style="color: var(--color-muted); font-size: 0.9rem; line-height: 1.6">{project.data.description}</p>
              <a href={`/projects/${project.slug}/`} style="color: var(--color-accent); font-size: 0.875rem">View details →</a>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
</Layout>
```

- [ ] **Step 2: Create src/pages/projects/[slug].astro**

```astro
---
export const prerender = false

import { getEntryBySlug } from 'astro:content'
import Layout from '../../components/layout/Layout.astro'

const { slug } = Astro.params
if (!slug) return Astro.redirect('/projects/')

const project = await getEntryBySlug('projects', slug)
if (!project) return new Response('Not found', { status: 404 })

const { Content } = await project.render()

const domain = import.meta.env.DOMAIN ?? Astro.url.hostname
const ogUrl = `https://og.${domain}/og?type=project&slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(project.data.title)}&description=${encodeURIComponent(project.data.description)}`
---
<Layout
  title={`${project.data.title} — Phuc Truong`}
  description={project.data.description}
  ogImage={ogUrl}
>
  <article style="max-width: 800px; margin: 0 auto; padding: var(--section-pad)">
    <header style="margin-bottom: 2rem">
      <h1 style="margin-bottom: 1rem">{project.data.title}</h1>
      <p style="color: var(--color-muted); font-size: 1.1rem; margin-bottom: 1.5rem">{project.data.description}</p>
      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1.5rem">
        {project.data.tags.map(tag => <span class="tag">{tag}</span>)}
      </div>
      <div style="display: flex; gap: 1.5rem">
        {project.data.repoUrl && (
          <a href={project.data.repoUrl} target="_blank" rel="noopener" style="color: var(--color-accent)">GitHub →</a>
        )}
        {project.data.demoUrl && (
          <a href={project.data.demoUrl} target="_blank" rel="noopener" style="color: var(--color-accent)">Live demo →</a>
        )}
      </div>
    </header>
    {project.data.media.length > 0 && (
      <div style="display: grid; gap: 1rem; margin-bottom: 2.5rem">
        {project.data.media.map(url => (
          <img src={url} alt={project.data.title} style="width: 100%; border-radius: 12px" loading="lazy" />
        ))}
      </div>
    )}
    <div class="prose">
      <Content />
    </div>
  </article>
</Layout>

<style>
.tag {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}
.prose { color: var(--color-muted); line-height: 1.8; }
.prose h1, .prose h2, .prose h3 { color: var(--color-text); margin: 2rem 0 1rem; }
.prose p { margin-bottom: 1.25rem; }
.prose code { color: var(--color-accent); background: rgba(99,102,241,0.1); padding: 0.1em 0.4em; border-radius: 4px; font-family: var(--font-mono); font-size: 0.875em; }
.prose a { color: var(--color-accent); }
</style>
```

- [ ] **Step 3: Run check and build**

Run: `pnpm check && pnpm build`

Expected: Both exit 0

- [ ] **Step 4: Commit**

```bash
git add src/pages/projects/
git commit -m "feat: add /projects listing page and SSR /projects/[slug] with dynamic OG meta tag"
```

---

## Self-Review

**Spec coverage:**
- ✅ Content Collections: `blog` with `title, date, tags, coverImage, excerpt`; `projects` with `title, description, tags, demoUrl?, repoUrl?, media[], featured`
- ✅ Route `/` — static, no `prerender = false`
- ✅ Route `/blog/` — static listing
- ✅ Route `/blog/[slug]` — SSR with `export const prerender = false`, dynamic OG meta
- ✅ Route `/projects/` — static listing
- ✅ Route `/projects/[slug]` — SSR with `export const prerender = false`, dynamic OG meta
- ✅ OG meta tag URL format: `https://og.{domain}/og?type={type}&slug={encodeURIComponent(slug)}&title=...&description=...`
- ✅ Homepage sections in order: Hero, About, Skills, Projects, Open Source, Blog, Status Panel (conditional), Contact (conditional)
- ✅ `flags.LIVE_TERMINAL` gates StatusPanel
- ✅ `flags.CONTACT_FORM` gates Contact
- ✅ Featured projects filter: `p.data.featured === true`
- ✅ Blog section: latest 3 posts by `date` descending
- ✅ Sample content: 1 blog post (`hello-world.mdx`), 1 project (`infra-folio.mdx`, `featured: true`)
- ✅ `pnpm check` and `pnpm build` verified after each task

**Placeholder scan:**
- StatusPanel and Contact stubs are explicit placeholders for Plan 06 — documented intentionally, not TBD code.

**Type consistency:**
- `post.slug` (string) used in `/blog/${post.slug}/` href — matches URL param `slug` in `[slug].astro`
- `project.slug` same pattern
- `OG URL` pattern uses `encodeURIComponent` on both `slug`, `title`, and `description` — consistent between blog and project slug pages
- `flags.LIVE_TERMINAL` and `flags.CONTACT_FORM` — exact export names from `src/lib/flags.ts` (Plan 02)
