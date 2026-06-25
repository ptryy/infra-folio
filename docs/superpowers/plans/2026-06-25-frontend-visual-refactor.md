# Frontend Visual Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the entire `infra-folio` site frontend to the approved **Option A — Polished Edge Terminal** visual direction, across all pages, with no change to architecture, routing, data, or behavior.

**Architecture:** The site already uses CSS custom properties (`--color-*`, `--font-*`) in `src/styles/global.css` that almost every component references. We re-tokenize those variables first (re-skins most of the site in one move), then update the components that bypass tokens — `.astro` scoped styles with hardcoded colors and the React islands which use inline-style objects with hardcoded hex. A new background layer renders continuously-scrolling DevOps command streams behind all content.

**Tech Stack:** Astro 4.x (hybrid), React 18 islands, plain CSS (custom properties + scoped component styles), Fira Code via Google Fonts, Vitest + Testing Library (jsdom) for island regression tests.

## How this plan is verified (read first)

This is a **visual refactor**: no new application logic, no new routes, no changed data contracts. There is no `.astro`/CSS unit-test harness in this repo (tests cover only the `.tsx` islands' behavior). So each task's "test" gate is a combination of:

- `pnpm check` — Astro + TypeScript type check (must stay green).
- `pnpm build` — full hybrid build; catches route/type/import errors (must stay green).
- `pnpm test` — existing island **behavior** tests; for tasks that touch `.tsx` islands these are the **regression gate** (must stay green — restyling must not change text, roles, or behavior the tests assert).
- **Visual review** — run `pnpm dev` (http://localhost:4321) and compare against the committed reference mockup `docs/superpowers/specs/mockups/2026-06-25-frontend-visual-refactor/option-a-edge-terminal-APPROVED.html`. For the live terminal, set `LIVE_TERMINAL=true` (see each task).

Do **not** invent new island unit tests for pure styling — there is no behavior to assert. Where a task edits an island, the deliverable's test gate is "existing tests still pass".

## Global Constraints

Copied verbatim from `docs/superpowers/specs/2026-06-25-frontend-visual-refactor-design.md`. Every task implicitly includes these.

- **Direction:** Option A — Polished Edge Terminal. Dark-only by design (no light/dark toggle).
- **Palette (exact):** `--bg #05060a`, `--panel #0a0d14`, `--cyan #22e3ff`, `--magenta #ff3df0`, `--orange #ff7a18`, `--green #39ff8a`, `--text #cfe8f0`, `--dim #6f8694`, `--grey #5a6b7a`.
- **Typography:** `'Fira Code', monospace` universally — all text, not just code. Headlines weight 700.
- **Glow (exact):** cyan `0 0 8px rgba(34,227,255,.7), 0 0 22px rgba(34,227,255,.35)`; magenta `0 0 8px rgba(255,61,240,.7), 0 0 22px rgba(255,61,240,.3)`.
- **Background:** continuous horizontally-scrolling DevOps command streams (NOT vertical Matrix rain), low opacity (~0.13), edge-masked, CSS-transform animated, plus a faint cyan circuit grid.
- **Accessibility:** body/long-form text stays plain `--text` on `--bg` (no glow on paragraphs); verify WCAG AA contrast. All motion (command stream, badge blink, terminal animation) must disable under `prefers-reduced-motion`.
- **Out of scope:** architecture, routing, rendering model, content schemas, worker APIs, storage adapter, feature flags, new content/copy, og-worker template (follow-up).
- **Behavior unchanged:** island props, data fetching, and feature-flag gating (`LIVE_TERMINAL`, `CONTACT_FORM`) must not change. The live terminal must keep showing **real** `/status` + GitHub feed data — do not fabricate fake scrolling logs; instead style the real status/feed content as terminal output.

## File touch map

| File | Action | Responsibility | Task |
|---|---|---|---|
| `src/styles/global.css` | Modify | Token overhaul + shared primitives (glow, headings, links, `.tag`, `.btn*`, `.crt*`) | 1, 7 |
| `src/components/layout/Layout.astro` | Modify | Swap font link → Fira Code; mount background layer | 1, 2 |
| `src/components/layout/CommandStream.astro` | Create | Command-stream + circuit-grid background, reduced-motion aware | 2 |
| `src/components/layout/Nav.astro` | Modify | Terminal-styled nav (cyan border, brand) | 3 |
| `src/components/layout/Footer.astro` | Modify | `$`-prompt footer | 3 |
| `src/components/sections/Hero.astro` | Modify | Glow headline, badge, CTA buttons | 4 |
| `src/components/sections/About.astro` | Modify | `// about` label, body legibility | 4 |
| `src/components/sections/Skills.astro` | Modify | `//` labels, cyan/magenta chips | 4 |
| `src/components/sections/Projects.astro` | Modify | Terminal-window cards, orange border, neon chips | 5 |
| `src/components/sections/OpenSource.astro` | Modify | Terminal-styled stats | 5 |
| `src/components/sections/BlogSection.astro` | Modify | Terminal post cards | 6 |
| `src/components/sections/Contact.astro` | Modify | Section label + intro | 6 |
| `src/components/islands/ContactForm.tsx` | Modify | Input focus-glow, primary button | 6 |
| `src/components/sections/StatusPanel.astro` | Modify | Section heading/label | 7 |
| `src/components/islands/LiveTerminal.tsx` | Modify | CRT chrome (scanlines/vignette/glow), green/cyan recolor | 7 |
| `src/components/islands/GithubFeed.tsx` | Modify | Terminal-output recolor | 7 |
| `src/pages/blog/index.astro` | Modify | Listing restyle | 8 |
| `src/pages/blog/[slug].astro` | Modify | Post restyle, terminal code blocks, comments wrapper | 8 |
| `src/pages/projects/index.astro` | Modify | Listing restyle (terminal cards) | 8 |
| `src/pages/projects/[slug].astro` | Modify | Detail restyle, gallery, terminal code blocks | 8 |
| `src/components/islands/Comments.tsx` | Modify | Wrapper border color (giscus stays dark theme) | 8 |

---

## Task 1: Design tokens & global primitives

Re-tokenize `global.css` and swap the page font to Fira Code. After this task the whole site shifts to the near-black/cyan palette and monospace type — most components inherit it through the variables. Also add shared primitives (`.glow`, `.glow-m`, `.btn*`, restyled `.tag`) that later tasks rely on.

**Files:**
- Modify: `src/styles/global.css` (full `:root` block + base rules + add primitives)
- Modify: `src/components/layout/Layout.astro:38` (Google Fonts `<link>`)

**Interfaces:**
- Produces (consumed by all later tasks):
  - CSS variables: `--color-bg #05060a`, `--color-panel #0a0d14`, `--color-surface #0a0d14`, `--color-border rgba(34,227,255,.18)`, `--color-text #cfe8f0`, `--color-muted #6f8694`, `--color-accent #22e3ff`, `--color-accent-2 #39ff8a`, `--color-magenta #ff3df0`, `--color-orange #ff7a18`, `--color-grey #5a6b7a`, `--font-sans`/`--font-mono` = `'Fira Code', ui-monospace, monospace`, `--glow-cyan`, `--glow-magenta`, `--glow-green`.
  - CSS classes: `.glow`, `.glow-m` (text glow), `.btn`, `.btn--primary`, `.btn--ghost` (global buttons), `.tag` (cyan chip), `.label` (uppercase magenta `//` section label).

- [ ] **Step 1: Replace the `:root` token block and base rules in `global.css`**

Replace the existing `:root { … }` block and the base element rules with:

```css
:root {
  --color-bg: #05060a;
  --color-panel: #0a0d14;
  --color-surface: #0a0d14;
  --color-border: rgba(34, 227, 255, 0.18);
  --color-text: #cfe8f0;
  --color-muted: #6f8694;
  --color-grey: #5a6b7a;
  --color-accent: #22e3ff;    /* cyan */
  --color-accent-2: #39ff8a;  /* green */
  --color-magenta: #ff3df0;
  --color-orange: #ff7a18;
  --font-sans: 'Fira Code', ui-monospace, 'Cascadia Code', monospace;
  --font-mono: 'Fira Code', ui-monospace, 'Cascadia Code', monospace;
  --max-width: 1100px;
  --section-pad: clamp(3rem, 8vw, 6rem) 1.5rem;
  --glow-cyan: 0 0 8px rgba(34,227,255,.7), 0 0 22px rgba(34,227,255,.35);
  --glow-magenta: 0 0 8px rgba(255,61,240,.7), 0 0 22px rgba(255,61,240,.3);
  --glow-green: 0 0 6px rgba(57,255,138,.55);
}

html { scroll-behavior: smooth; }
body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-sans); line-height: 1.6; }
a { color: var(--color-accent); text-decoration: none; transition: text-shadow 0.2s, color 0.2s; }
a:hover { text-decoration: none; text-shadow: var(--glow-cyan); }
img { max-width: 100%; display: block; }

.container { max-width: var(--max-width); margin: 0 auto; padding: 0 1.5rem; position: relative; z-index: 2; }
section { padding: var(--section-pad); position: relative; z-index: 2; }
h1, h2, h3 { line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
h2 { font-size: clamp(1.75rem, 4vw, 2.5rem); margin-bottom: 2rem; }
```

- [ ] **Step 2: Append shared primitives to the end of `global.css`**

```css
/* ---- Edge Terminal primitives ---- */
.glow   { text-shadow: var(--glow-cyan); }
.glow-m { text-shadow: var(--glow-magenta); }

.label {
  font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--color-magenta); display: inline-block; margin-bottom: 0.75rem;
}
.label::before { content: '// '; }

.tag {
  background: rgba(34,227,255,0.05);
  border: 1px solid rgba(34,227,255,0.35);
  color: var(--color-accent);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  padding: 0.25rem 0.6rem;
  border-radius: 3px;
}

.btn {
  display: inline-block; font-family: var(--font-mono); font-size: 0.82rem;
  cursor: pointer; padding: 0.7rem 1.4rem; border-radius: 3px;
  text-transform: uppercase; letter-spacing: 0.06em; transition: all 0.15s; text-decoration: none;
}
.btn--primary { background: var(--color-accent); color: var(--color-bg); border: 1px solid var(--color-accent); box-shadow: 0 0 16px rgba(34,227,255,.5); }
.btn--primary:hover { background: var(--color-magenta); border-color: var(--color-magenta); color: #fff; box-shadow: 0 0 16px rgba(255,61,240,.6); text-decoration: none; text-shadow: none; }
.btn--ghost { background: transparent; color: var(--color-accent); border: 1px solid var(--color-accent); }
.btn--ghost:hover { box-shadow: 0 0 14px rgba(34,227,255,.5); text-decoration: none; text-shadow: none; }
```

- [ ] **Step 3: Swap the font link in `Layout.astro`**

Replace line 38 (the Inter `<link>`):

```html
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

with:

```html
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 4: Type-check and build**

Run: `pnpm check && pnpm build`
Expected: both succeed with no errors (warnings about unused CSS are acceptable).

- [ ] **Step 5: Visual verification**

Run: `pnpm dev` and open http://localhost:4321
Expected: background is near-black `#05060a`, all text renders in Fira Code, headings/links glow cyan on hover, tags are cyan-bordered chips. Some sections still carry old indigo accents in their scoped styles — that is expected and fixed in later tasks. Stop the dev server (Ctrl+C) when done.

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css src/components/layout/Layout.astro
git commit -m "feat(ui): re-tokenize global styles to Edge Terminal palette + Fira Code"
```

---

## Task 2: Command-stream background layer

Add the signature background: continuous left-scrolling rows of real DevOps commands, plus a faint cyan circuit grid, behind all content. Reduced-motion disables the animation.

**Files:**
- Create: `src/components/layout/CommandStream.astro`
- Modify: `src/components/layout/Layout.astro` (mount the component as the first child of `<body>`)

**Interfaces:**
- Consumes: tokens from Task 1 (`--color-accent`, `--color-green`, `--color-magenta`, `--font-mono`).
- Produces: a fixed, `z-index:0`, `pointer-events:none` background layer. (All `.container`/`section` are `z-index:2` from Task 1, so they sit above it.)

- [ ] **Step 1: Create `CommandStream.astro`**

```astro
---
// Fixed, non-interactive background: horizontally-scrolling DevOps command
// streams + faint circuit grid. Rows are generated at build time; the inline
// script only varies speeds. Honors prefers-reduced-motion.
const COMMANDS = [
  '$ kubectl get pods -A', '$ terraform apply --auto-approve', '$ docker build -t app:latest .',
  '$ git push origin main', '$ wrangler deploy --name infra-folio', '$ helm upgrade --install grafana ./chart',
  '$ argocd app sync prod', '$ ansible-playbook site.yml', '$ aws s3 sync ./dist s3://media',
  '$ journalctl -fu api-worker', '$ kubectl rollout status deploy/web', '$ curl -s /healthz | jq .',
  '$ make deploy ENV=prod', '$ flux reconcile source git', '$ kubectl logs -f pod/og-worker',
  '$ terraform plan -out tfplan', '$ docker compose up -d', '$ vault kv get secret/db',
]
const ROWS = 16
function row() {
  const n = 6
  const parts = []
  for (let i = 0; i < n; i++) parts.push(COMMANDS[Math.floor(Math.random() * COMMANDS.length)])
  return parts.join('   [✓] ok   ')
}
const rows = Array.from({ length: ROWS }, () => row())
---
<div class="cmd-bg" aria-hidden="true">
  <div class="circuit"></div>
  <div class="streams">
    {rows.map((text, i) => (
      <div class="cmd-row" style={`top:${((i / ROWS) * 100).toFixed(2)}%`} data-i={i}>
        <span class="seg">{text}</span><span class="seg">{text}</span>
      </div>
    ))}
  </div>
</div>

<style>
.cmd-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.circuit {
  position: absolute; inset: 0; opacity: 0.10;
  background-image:
    linear-gradient(var(--color-accent) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-accent) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 30%, #000 30%, transparent 80%);
          mask-image: radial-gradient(ellipse 70% 70% at 50% 30%, #000 30%, transparent 80%);
}
.streams {
  position: absolute; inset: 0; opacity: 0.13;
  -webkit-mask-image: radial-gradient(ellipse 85% 80% at 50% 40%, #000 35%, transparent 92%);
          mask-image: radial-gradient(ellipse 85% 80% at 50% 40%, #000 35%, transparent 92%);
}
.cmd-row {
  position: absolute; left: 0; white-space: nowrap;
  font-family: var(--font-mono); font-size: 13px; color: var(--color-accent);
  will-change: transform; animation: streamL 40s linear infinite;
}
.cmd-row .seg { display: inline-block; padding-right: 3rem; }
@keyframes streamL { from { transform: translateX(0); } to { transform: translateX(-50%); } }

@media (prefers-reduced-motion: reduce) {
  .cmd-row { animation: none; transform: translateX(-10%); }
}
</style>

<script>
  // Vary speed per row for a parallax feel. Respect reduced-motion.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce) {
    document.querySelectorAll<HTMLElement>('.cmd-row').forEach((el) => {
      const dur = (26 + Math.random() * 30).toFixed(1)
      el.style.animationDuration = `${dur}s`
      el.style.animationDelay = `${(-Math.random() * 30).toFixed(1)}s`
    })
  }
</script>
```

- [ ] **Step 2: Mount the background in `Layout.astro`**

Add the import to the frontmatter (with the other layout imports near the top):

```astro
import CommandStream from './CommandStream.astro'
```

Then make it the first child of `<body>`, before `<Nav />`:

```astro
  <body>
    <CommandStream />
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
```

- [ ] **Step 3: Type-check and build**

Run: `pnpm check && pnpm build`
Expected: both succeed.

- [ ] **Step 4: Visual verification (incl. reduced motion)**

Run: `pnpm dev` → http://localhost:4321
Expected: faint cyan command lines scroll continuously leftward behind the content at varied speeds, fading at the edges; a subtle circuit grid sits behind them; foreground text stays fully readable.
Then, in the browser devtools, emulate `prefers-reduced-motion: reduce` (Rendering tab) and reload.
Expected: command rows are static (no scrolling). Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/CommandStream.astro src/components/layout/Layout.astro
git commit -m "feat(ui): add scrolling DevOps command-stream background layer"
```

---

## Task 3: Nav & Footer chrome

**Files:**
- Modify: `src/components/layout/Nav.astro` (markup brand + `<style>`)
- Modify: `src/components/layout/Footer.astro` (`<style>` + copy)

**Interfaces:**
- Consumes: tokens + `--glow-*` from Task 1.

- [ ] **Step 1: Update the Nav logo markup**

In `Nav.astro`, replace the logo anchor:

```astro
    <a href="/" class="nav__logo">phuctruong.dev</a>
```

with:

```astro
    <a href="/" class="nav__logo">phuc<b>::</b>truong</a>
```

- [ ] **Step 2: Replace the Nav `<style>` block**

```css
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(5, 6, 10, 0.82);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(34, 227, 255, 0.25);
}
.nav__inner { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.nav__logo { font-weight: 700; font-size: 1.05rem; letter-spacing: 0.04em; color: var(--color-accent); text-decoration: none; }
.nav__logo b { color: var(--color-magenta); }
.nav__logo:hover { text-shadow: var(--glow-cyan); text-decoration: none; }
.nav__links { display: flex; list-style: none; gap: 2rem; }
.nav__links a { color: var(--color-muted); font-size: 0.85rem; font-weight: 500; transition: color 0.2s, text-shadow 0.2s; }
.nav__links a:hover { color: var(--color-accent); text-decoration: none; text-shadow: var(--glow-cyan); }
```

- [ ] **Step 3: Update Footer copy + `<style>`**

In `Footer.astro`, replace the copy span:

```astro
    <span class="footer__copy">&copy; {year} Phuc Truong. All rights reserved.</span>
```

with:

```astro
    <span class="footer__copy">$ built on the cloudflare edge &middot; &copy; {year} Phuc Truong</span>
```

Replace the Footer `<style>` block:

```css
.footer { border-top: 1px solid rgba(34,227,255,0.15); padding: 2.5rem 0; position: relative; z-index: 2; }
.footer__inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
.footer__copy { color: var(--color-muted); font-size: 0.8rem; font-family: var(--font-mono); }
.footer__links { display: flex; gap: 1.5rem; }
.footer__links a { color: var(--color-muted); font-size: 0.8rem; }
.footer__links a:hover { color: var(--color-accent); text-decoration: none; text-shadow: var(--glow-cyan); }
```

- [ ] **Step 4: Build + visual verify**

Run: `pnpm check && pnpm build`, then `pnpm dev`.
Expected: nav has a thin cyan bottom border, `phuc::truong` brand (magenta `::`), links glow cyan on hover; footer shows the `$ built on the cloudflare edge` prompt. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Nav.astro src/components/layout/Footer.astro
git commit -m "feat(ui): restyle nav and footer to Edge Terminal chrome"
```

---

## Task 4: Hero, About, Skills

**Files:**
- Modify: `src/components/sections/Hero.astro`
- Modify: `src/components/sections/About.astro`
- Modify: `src/components/sections/Skills.astro`

**Interfaces:**
- Consumes: `.glow`, `.glow-m`, `.btn`, `.btn--primary`, `.btn--ghost`, `.label`, `.tag` from Task 1.

- [ ] **Step 1: Hero — add glow classes to headings + magenta `>` subtitle**

In `Hero.astro`, update the heading/subtitle markup:

```astro
    <h1 class="hero__name glow">Phuc Truong</h1>
    <p class="hero__title glow-m">&gt; DevOps &amp; Infrastructure Engineer</p>
```

In the Hero `<style>`, change the hero background radial (indigo → cyan) and the title color:

```css
.hero {
  min-height: calc(100vh - 64px);
  display: flex; align-items: center; padding: var(--section-pad);
  background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(34,227,255,0.12) 0%, transparent 70%);
}
.hero__title { font-size: clamp(1.1rem, 3vw, 1.5rem); color: var(--color-accent); font-weight: 500; margin-bottom: 1.25rem; }
```

(The hero badge already uses `--color-accent-2`, which is now green — no change needed. The `.btn`/`.btn--primary`/`.btn--ghost` now come from global — if Hero defines its own scoped `.btn*` rules, delete them so the global ones apply.)

- [ ] **Step 2: About — add `// about` label and keep body legible**

In `About.astro`, add a label above the `<h2>`:

```astro
    <p class="label">about</p>
    <h2 class="glow">About me</h2>
```

Body paragraphs must NOT glow (per Global Constraints). The existing `.about__text p { color: var(--color-muted); }` is fine. If About defines a scoped `.btn--ghost`, delete it so the global button applies.

- [ ] **Step 3: Skills — `//` labels and accent chips**

In `Skills.astro`, add a label before the `<h2>`:

```astro
    <p class="label">skills</p>
    <h2 class="glow">Skills &amp; Stack</h2>
```

Update the scoped group-heading color and remove the scoped `.tag` override so the global cyan chip applies:

```css
.skills__group h3 { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--color-accent); margin-bottom: 1rem; }
```

Delete the scoped `.tag { … }` rule in `Skills.astro` (global `.tag` from Task 1 now styles them).

- [ ] **Step 4: Build + visual verify**

Run: `pnpm check && pnpm build`, then `pnpm dev`.
Expected: hero name glows cyan, `> DevOps & Infrastructure Engineer` subtitle in cyan with magenta glow, CTA buttons are cyan (primary) / ghost with glow; About and Skills show magenta `// about` / `// skills` labels; skill tags are cyan chips; body copy is plain and readable. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Hero.astro src/components/sections/About.astro src/components/sections/Skills.astro
git commit -m "feat(ui): restyle hero, about, skills sections"
```

---

## Task 5: Projects & Open Source (terminal-window cards)

**Files:**
- Modify: `src/components/sections/Projects.astro`
- Modify: `src/components/sections/OpenSource.astro`

**Interfaces:**
- Consumes: tokens + `.label`, `.tag`, `.btn--ghost` from Task 1.

- [ ] **Step 1: Projects — add label and a terminal title bar to each card**

In `Projects.astro`, add a label above the `<h2>`:

```astro
    <p class="label">projects</p>
    <h2 class="glow">Featured Projects</h2>
```

Inside `<article class="project-card">`, add a title bar as the first child (before the image/body):

```astro
        <article class="project-card">
          <div class="project-card__bar">
            <span class="tl-dot tl-r"></span><span class="tl-dot tl-y"></span><span class="tl-dot tl-g"></span>
            <span class="project-card__path">~/{project.slug}</span>
          </div>
```

- [ ] **Step 2: Projects — replace the scoped `<style>` with the terminal-window look**

```css
.projects { background: transparent; }
.projects__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
.project-card {
  background: var(--color-panel);
  border: 1px solid var(--color-orange);
  border-radius: 4px; overflow: hidden;
  box-shadow: 0 0 20px rgba(255,122,24,0.18);
  transition: box-shadow 0.18s, transform 0.18s;
}
.project-card:hover { box-shadow: 0 0 28px rgba(255,122,24,0.45); transform: translateY(-3px); }
.project-card__bar {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 0.7rem; background: #120c06;
  border-bottom: 1px solid var(--color-orange);
  font-size: 0.7rem; color: var(--color-orange); font-family: var(--font-mono);
}
.tl-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.tl-r { background: #ff5f56; } .tl-y { background: #ffbd2e; } .tl-g { background: #27c93f; }
.project-card__path { margin-left: 0.5rem; }
.project-card__img { width: 100%; height: 180px; object-fit: cover; }
.project-card__body { padding: 1.1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.project-card__title { font-size: 1rem; font-weight: 700; color: var(--color-text); }
.project-card__desc { color: var(--color-muted); font-size: 0.85rem; line-height: 1.6; }
.project-card__tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.project-card__links { display: flex; gap: 1rem; flex-wrap: wrap; }
.project-card__links a { color: var(--color-accent); font-size: 0.8rem; font-weight: 500; }
.project-card__links a:hover { text-shadow: var(--glow-cyan); text-decoration: none; }
.projects__more { margin-top: 2.5rem; text-align: center; }
```

(Delete the scoped `.btn--ghost` rule — the global one applies.)

- [ ] **Step 3: Open Source — label + green/cyan stats**

In `OpenSource.astro`, add a label above the `<h2>`:

```astro
    <p class="label">open source</p>
    <h2 class="glow">Open Source</h2>
```

Replace the scoped `<style>`:

```css
.oss { background: transparent; }
.oss__intro { color: var(--color-muted); max-width: 600px; margin-bottom: 2.5rem; line-height: 1.7; }
.oss__stats { display: flex; gap: 3rem; flex-wrap: wrap; margin-bottom: 2rem; }
.stat { display: flex; flex-direction: column; gap: 0.25rem; }
.stat__value { font-size: 2.5rem; font-weight: 800; color: var(--color-accent-2); text-shadow: var(--glow-green); }
.stat__label { font-size: 0.85rem; color: var(--color-muted); }
.oss__note { color: var(--color-muted); font-size: 0.8rem; }
.oss__note code { color: var(--color-accent); background: rgba(34,227,255,0.1); padding: 0.1em 0.4em; border-radius: 4px; font-family: var(--font-mono); }
```

- [ ] **Step 4: Build + visual verify**

Run: `pnpm check && pnpm build`, then `pnpm dev`.
Expected: project cards are orange-bordered terminal windows with traffic-light dots + `~/slug` path bar and a soft orange glow that intensifies on hover; tech tags are cyan chips; Open Source stat numbers glow green. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Projects.astro src/components/sections/OpenSource.astro
git commit -m "feat(ui): restyle projects (terminal-window cards) and open source"
```

---

## Task 6: Blog section, Contact section & ContactForm island

**Files:**
- Modify: `src/components/sections/BlogSection.astro`
- Modify: `src/components/sections/Contact.astro`
- Modify: `src/components/islands/ContactForm.tsx`

**Interfaces:**
- Consumes: tokens, `.label`, `.tag`, `.btn--ghost` from Task 1.
- ContactForm behavior (validation, submit, error states) is unchanged — its existing test `src/components/islands/__tests__/ContactForm.test.tsx` is the regression gate.

- [ ] **Step 1: BlogSection — label + terminal post cards**

In `BlogSection.astro`, add a label above the `<h2>`:

```astro
    <p class="label">blog</p>
    <h2 class="glow">Latest Posts</h2>
```

Replace the scoped `<style>` (post cards + remove scoped `.btn--ghost`):

```css
.blog-section__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
.post-card {
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: 4px; overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s;
}
.post-card:hover { border-color: var(--color-accent); box-shadow: 0 0 18px rgba(34,227,255,0.18); }
.post-card__img { width: 100%; height: 160px; object-fit: cover; }
.post-card__body { padding: 1.1rem; display: flex; flex-direction: column; gap: 0.5rem; }
.post-card__date { color: var(--color-magenta); font-size: 0.75rem; font-weight: 600; font-family: var(--font-mono); }
.post-card__title { font-size: 1rem; font-weight: 700; }
.post-card__title a { color: var(--color-text); }
.post-card__title a:hover { color: var(--color-accent); text-decoration: none; text-shadow: var(--glow-cyan); }
.post-card__excerpt { color: var(--color-muted); font-size: 0.85rem; line-height: 1.6; }
.post-card__tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.25rem; }
.blog-section__more { margin-top: 2.5rem; text-align: center; }
```

- [ ] **Step 2: Contact — label + intro**

In `Contact.astro`, add the label above the `<h2>` and drop the panel background:

```astro
    <p class="label">contact</p>
    <h2 class="glow">Get in Touch</h2>
```

Replace the scoped `<style>`:

```css
.contact { background: transparent; }
.contact__intro { color: var(--color-muted); max-width: 560px; margin-bottom: 2.5rem; line-height: 1.7; }
```

- [ ] **Step 3: ContactForm — restyle inputs (focus glow) and the submit button**

In `ContactForm.tsx`, update the `fieldStyle` object:

```tsx
const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  background: '#0a0d14',
  border: '1px solid rgba(34,227,255,0.35)',
  borderRadius: '3px',
  color: '#cfe8f0',
  fontSize: '0.9rem',
  fontFamily: "var(--font-mono, monospace)",
  outline: 'none',
}
```

Find the submit `<button>` in the component's returned JSX and ensure it uses the global primary button by setting `className="btn btn--primary"` and removing any inline `background`/`border`/`color` style props on it (leave layout props like width/margin if present). If the button currently has no `className`, add `className="btn btn--primary"`.

- [ ] **Step 4: Run the island regression tests**

Run: `pnpm test`
Expected: PASS — all existing island tests green (ContactForm validation/submit behavior unchanged).

- [ ] **Step 5: Build + visual verify**

Run: `pnpm check && pnpm build`, then `CONTACT_FORM=true pnpm dev`.
Expected: blog post cards are dark panels with magenta dates and cyan-glow titles on hover; the contact form inputs are dark with a cyan focus glow and the submit button is the cyan primary button. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/BlogSection.astro src/components/sections/Contact.astro src/components/islands/ContactForm.tsx
git commit -m "feat(ui): restyle blog section, contact section, and contact form"
```

---

## Task 7: LiveTerminal CRT centerpiece

Give the live infrastructure panel the CRT treatment — green border glow, scanline overlay, vignette, monospace green/cyan content — while keeping its real `/status` + GitHub feed data and behavior. Scanlines/vignette require pseudo-elements, so add CRT CSS classes to `global.css` and apply them in the island (inline styles can't do `::before`/`::after`).

**Files:**
- Modify: `src/styles/global.css` (append `.crt*` classes)
- Modify: `src/components/islands/LiveTerminal.tsx`
- Modify: `src/components/islands/GithubFeed.tsx`
- Modify: `src/components/sections/StatusPanel.astro` (heading/label)

**Interfaces:**
- Consumes: tokens + `--glow-green` from Task 1.
- Produces: `.crt`, `.crt-bar`, `.crt-body` CSS classes.
- `LiveTerminal`/`GithubFeed` props, fetch logic, and `enabled` gating are unchanged — `GithubFeed.test.tsx` is the regression gate.

- [ ] **Step 1: Append CRT classes to `global.css`**

```css
/* ---- CRT live terminal ---- */
.crt {
  position: relative; border: 1px solid var(--color-accent-2); border-radius: 6px;
  background: #02070a; overflow: hidden;
  box-shadow: 0 0 40px rgba(57,255,138,0.22), inset 0 0 60px rgba(57,255,138,0.06);
}
.crt::after {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background: repeating-linear-gradient(transparent 0 2px, rgba(0,0,0,0.35) 2px 4px);
  mix-blend-mode: multiply;
}
.crt::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 3;
  background: radial-gradient(ellipse 100% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%);
}
.crt-bar {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 0.9rem; background: #04130c;
  border-bottom: 1px solid rgba(57,255,138,0.4);
  font-family: var(--font-mono); font-size: 0.74rem; color: var(--color-accent-2);
}
.crt-body { position: relative; z-index: 2; }
@media (prefers-reduced-motion: reduce) {
  .crt * { animation: none !important; }
}
```

- [ ] **Step 2: LiveTerminal — apply CRT chrome and recolor**

In `LiveTerminal.tsx`, replace the outer container `<div style={{…}}>` (the one with `background: '#0d1117'`) with a class-based CRT shell. Change the opening of the returned JSX from:

```tsx
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #30363d',
      borderRadius: '12px',
      fontFamily: 'var(--font-mono, monospace)',
      overflow: 'hidden',
    }}>
      {/* Terminal title bar */}
      <div style={{
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        padding: '0.625rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        <span style={{ marginLeft: '0.5rem', color: '#8b949e', fontSize: '0.8rem' }}>infra-folio — live terminal</span>
      </div>
```

to:

```tsx
  return (
    <div className="crt" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
      {/* Terminal title bar */}
      <div className="crt-bar">
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#39ff8a', display: 'inline-block' }} />
        infra-folio@edge — live tail
        <span style={{ marginLeft: 'auto', color: '#22e3ff' }}>● connected</span>
      </div>
```

Then add the `crt-body` wrapper around the content grid: change the grid container `<div style={{ padding: '1.5rem', display: 'grid', … }}>` to include the class:

```tsx
      <div className="crt-body" style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
```

Recolor the status/feed inline hex to the terminal palette — apply these replacements throughout `LiveTerminal.tsx`:
- section heading `color: '#8b949e'` → `color: '#22e3ff'` (the `$ worker status` / `$ github activity` labels)
- status label `color: '#8b949e'` (the `status:`/`region:`/etc. keys) → `color: '#6f8694'`
- status value `color: '#28c840'` → `color: '#39ff8a'` and `color: '#e6edf3'` → `color: '#cfe8f0'`
- error `color: '#ef4444'` → keep `#ff7a18` (orange warn)
- "Connecting…" `color: '#8b949e'` → `color: '#6f8694'`

- [ ] **Step 3: GithubFeed — recolor to terminal output**

In `GithubFeed.tsx`, apply these inline-style replacements:
- prompt `›` `color: '#6366f1'` → `color: '#39ff8a'`
- event type label `color: '#94a3b8'` → `color: '#6f8694'`
- repo link `color: '#f1f5f9'` → `color: '#22e3ff'`
- time-ago `color: '#475569'` → `color: '#5a6b7a'`
- loading text `color: '#94a3b8'` → `color: '#6f8694'`
- error text `color: '#ef4444'` → `color: '#ff7a18'`

- [ ] **Step 4: StatusPanel — label + heading + drop panel bg**

In `StatusPanel.astro`, update the heading area:

```astro
    <p class="label">status panel</p>
    <h2 class="glow-m">Live Infrastructure</h2>
```

In its `<style>`, change `.status-panel { background: var(--color-surface); }` to `.status-panel { background: transparent; }` and update the `code` color to `var(--color-accent)` (already cyan via token — no further change needed).

- [ ] **Step 5: Run island regression tests**

Run: `pnpm test`
Expected: PASS — `GithubFeed.test.tsx` still green (text/links/behavior unchanged; only colors changed).

- [ ] **Step 6: Build + visual verify with the terminal enabled**

Run: `pnpm check && pnpm build`, then `LIVE_TERMINAL=true API_BASE=http://localhost:8787 pnpm dev`.
(The feed/status will show their error/connecting states if the api-worker isn't running — that's fine; we're verifying the CRT styling.)
Expected: the panel is a dark CRT screen with green border glow, visible scanlines, a vignette, a `infra-folio@edge — live tail` bar with a green dot and cyan "● connected", and green/cyan monospace status + feed text. Toggle reduced-motion and confirm nothing animates. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/styles/global.css src/components/islands/LiveTerminal.tsx src/components/islands/GithubFeed.tsx src/components/sections/StatusPanel.astro
git commit -m "feat(ui): give live terminal the CRT scanline/glow treatment"
```

---

## Task 8: Listing & detail pages + Comments wrapper

Re-skin the four content pages (which use inline styles + scoped `.tag`/`.prose`) and recolor the Comments island wrapper. The blog/project `<pre>` code blocks adopt the CRT green-on-black look so the dev language is consistent.

**Files:**
- Modify: `src/pages/blog/index.astro`
- Modify: `src/pages/blog/[slug].astro`
- Modify: `src/pages/projects/index.astro`
- Modify: `src/pages/projects/[slug].astro`
- Modify: `src/components/islands/Comments.tsx`

**Interfaces:**
- Consumes: tokens, `.tag` (global). Each page currently re-declares a scoped `.tag` — delete those so the global cyan chip applies.
- Comments behavior (giscus script injection) is unchanged — `Comments.test.tsx` is the regression gate.

- [ ] **Step 1: blog/index.astro — restyle listing**

Update the inline `<time>` color and the article border to cyan, and the title hover glow. Replace the `<time …>` style color `var(--color-accent)` (already cyan — fine) and the article border color. Concretely, change the article style attribute from:

```astro
          <article style="border-bottom: 1px solid var(--color-border); padding-bottom: 2rem">
```

to:

```astro
          <article style="border-bottom: 1px solid rgba(34,227,255,0.12); padding-bottom: 2rem">
```

Delete the scoped `<style>` block's `.tag { … }` rule (global `.tag` applies). Add a `.glow` class to the page `<h1>`:

```astro
      <h1 class="glow" style="margin-bottom: 2.5rem">Blog</h1>
```

- [ ] **Step 2: blog/[slug].astro — restyle post + terminal code blocks + comments wrapper**

Add `.glow` to the `<h1>`:

```astro
      <h1 class="glow" style="margin-bottom: 0.75rem">{post.data.title}</h1>
```

In the scoped `<style>`, delete the `.tag { … }` rule, and replace the `.prose code`/`.prose pre`/`.prose pre code` rules with the terminal look:

```css
.prose code { color: var(--color-accent-2); background: rgba(57,255,138,0.08); padding: 0.1em 0.4em; border-radius: 3px; font-family: var(--font-mono); font-size: 0.875em; }
.prose pre { background: #02070a; border: 1px solid rgba(57,255,138,0.3); border-radius: 6px; padding: 1.1rem; overflow-x: auto; margin: 1.5rem 0; box-shadow: inset 0 0 40px rgba(57,255,138,0.08); }
.prose pre code { background: none; padding: 0; color: var(--color-accent-2); text-shadow: var(--glow-green); }
```

- [ ] **Step 3: projects/index.astro — terminal cards**

Replace the article style attribute from:

```astro
          <article style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden">
```

to:

```astro
          <article style="background: var(--color-panel); border: 1px solid var(--color-orange); border-radius: 4px; overflow: hidden; box-shadow: 0 0 18px rgba(255,122,24,0.16)">
```

Add `.glow` to the `<h1>`:

```astro
      <h1 class="glow" style="margin-bottom: 2.5rem">Projects</h1>
```

- [ ] **Step 4: projects/[slug].astro — detail restyle + terminal code blocks**

Add `.glow` to the `<h1>`. Delete the scoped `.tag { … }` rule. Replace the `.prose code` rule and add `.prose pre` rules to match Step 2:

```css
.prose code { color: var(--color-accent-2); background: rgba(57,255,138,0.08); padding: 0.1em 0.4em; border-radius: 3px; font-family: var(--font-mono); font-size: 0.875em; }
.prose pre { background: #02070a; border: 1px solid rgba(57,255,138,0.3); border-radius: 6px; padding: 1.1rem; overflow-x: auto; margin: 1.5rem 0; box-shadow: inset 0 0 40px rgba(57,255,138,0.08); }
.prose pre code { background: none; padding: 0; color: var(--color-accent-2); text-shadow: var(--glow-green); }
```

(The media gallery `<img>` styling can stay; just confirm the radius reads as `border-radius: 8px` for consistency — optional.)

- [ ] **Step 5: Comments.tsx — recolor wrapper border**

In `Comments.tsx`, update the returned `<div>` style:

```tsx
    <div
      ref={ref}
      style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(34,227,255,0.18)' }}
    />
```

(Leave `data-theme="dark"` as-is — giscus stays dark, which matches the design.)

- [ ] **Step 6: Run island regression tests**

Run: `pnpm test`
Expected: PASS — `Comments.test.tsx` still green.

- [ ] **Step 7: Build + visual verify all pages**

Run: `pnpm check && pnpm build`, then `pnpm dev`. Visit `/blog`, a post at `/blog/<slug>`, `/projects`, and a project at `/projects/<slug>`.
Expected: listings use cyan chips and glowing `h1`s; project listing cards are orange-bordered; post/detail code blocks are green-on-black with a green glow; the comments separator is a thin cyan rule. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/pages/blog/index.astro src/pages/blog/\[slug\].astro src/pages/projects/index.astro src/pages/projects/\[slug\].astro src/components/islands/Comments.tsx
git commit -m "feat(ui): restyle blog/project listing and detail pages"
```

---

## Final verification (after all tasks)

- [ ] Run the full gate: `pnpm check && pnpm test && pnpm build` — all green.
- [ ] `pnpm dev` and walk every page (home with all 8 sections, `/blog`, a post, `/projects`, a project) against the reference mockup `docs/superpowers/specs/mockups/2026-06-25-frontend-visual-refactor/option-a-edge-terminal-APPROVED.html`.
- [ ] Toggle `prefers-reduced-motion: reduce` and confirm the command-stream background and CRT are static.
- [ ] Confirm `LIVE_TERMINAL=true` and `LIVE_TERMINAL` unset both render correctly (StatusPanel present/absent), and `CONTACT_FORM` toggling shows/hides the contact section — i.e., feature-flag behavior is unchanged.
- [ ] Sanity-check body-text contrast (About paragraphs, blog prose) is comfortable on `#05060a`.

---

## Self-review notes

- **Spec coverage:** palette/typography/glow → Task 1; background (command streams + circuit grid + reduced-motion) → Task 2; nav/footer → Task 3; hero/about/skills → Task 4; project terminal-window cards + open source → Task 5; blog cards + contact + form → Task 6; CRT LiveTerminal centerpiece → Task 7; listings/detail + comments + terminal code blocks → Task 8. Accessibility constraints (no body glow, reduced-motion, contrast) appear in Tasks 1, 2, 7 and Final verification. Out-of-scope items (og-worker template, light/dark) intentionally excluded.
- **Behavior preserved:** island tasks (6, 7, 8) each gate on the existing `pnpm test` suite; no props/fetch/flag logic is edited.
- **No fake data:** Task 7 styles the *real* status + feed content as terminal output rather than fabricating scrolling logs (the mockup's logs were illustrative).
- **Type consistency:** token names used in later tasks (`--color-panel`, `--color-orange`, `--color-accent-2`, `--glow-green`, `.crt`, `.label`, `.btn--primary`) are all defined in Task 1 / Task 7 Step 1.
