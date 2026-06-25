# Frontend Visual Refactor — Design Spec

- **Date:** 2026-06-25
- **Status:** ✅ Approved — **Option A (Polished Edge Terminal)**
- **Scope:** Visual-only refactor of the `infra-folio` site frontend across every page. No change to architecture, routing, content model, workers, or feature flags.
- **Mockups:** `docs/superpowers/specs/mockups/2026-06-25-frontend-visual-refactor/`
  - `option-a-edge-terminal-APPROVED.html` — the approved direction
  - `option-c-glassmorphic-ALT.html` — recorded alternate
  - `option-d-hybrid-ALT.html` — recorded alternate

---

## 1. Goal

Re-skin the existing portfolio with a single, coherent visual language that reinforces the
DevOps / edge-engineering positioning, while keeping the site readable for its two audiences
(freelance clients and the engineering community). This is a presentation-layer change only:
the 8-section homepage, the blog/projects listings, the detail pages, and the interactive
islands keep their current structure, data, and behavior.

### Pages in scope (all rendered in the mockups)

1. **Homepage** — Hero, About, Skills, Projects, Open Source, Blog, Status Panel (LiveTerminal), Contact
2. **Blog listing** (`/blog`)
3. **Blog post** (`/blog/[slug]`) — including the Giscus comments region
4. **Projects listing** (`/projects`)
5. **Project detail** (`/projects/[slug]`) — including media gallery
6. **Shared chrome** — Nav, Footer

---

## 2. Decision

Three directions were mocked up and compared interactively in the Superpowers Visual Companion,
plus a hybrid. Outcome:

| Option | Direction | Decision |
|---|---|---|
| **A** | Polished Edge Terminal (futuristic cyber monospace) | ✅ **Approved** |
| B | Neo-Brutalist DevOps | ❌ Rejected |
| C | Glassmorphic Cloud-Native | 📁 Recorded alternate |
| D | Hybrid — Option C readability + Option A CRT terminal | 📁 Recorded alternate |

**Option B rejected** because the stark brutalist treatment (hard 4px borders, solid color blocks,
all-caps weight) read as too aggressive/opinionated for a portfolio meant to also win freelance
trust, and it fought the live-terminal centerpiece rather than supporting it.

**C and D are kept on file** so the project can switch direction later without re-running
brainstorming — their full mockups are committed alongside this spec, and their design tokens are
captured in §5.

---

## 3. Approved Direction — Option A: Polished Edge Terminal

Aesthetic intent: high-performance engineering hardware / a polished operator console. Leans
into the LiveTerminal feature and the edge architecture.

### 3.1 Design tokens

```
/* Palette */
--bg:       #05060a   /* deep matte black */
--panel:    #0a0d14   /* raised surfaces */
--cyan:     #22e3ff   /* primary accent */
--magenta:  #ff3df0   /* secondary accent */
--orange:   #ff7a18   /* project-card borders / warnings */
--green:    #39ff8a   /* terminal logs / success */
--text:     #cfe8f0   /* body text */
--dim:      #6f8694   /* muted text */
--grey:     #5a6b7a   /* lines */

/* Typography */
font-family: 'Fira Code', monospace;   /* universal — all text, not just code */
headlines:  weight 700, large (hero clamp(2.6rem, 8vw, 5.2rem))

/* Effects */
text-glow (cyan):    0 0 8px rgba(34,227,255,.7), 0 0 22px rgba(34,227,255,.35)
text-glow (magenta): 0 0 8px rgba(255,61,240,.7), 0 0 22px rgba(255,61,240,.3)
```

### 3.2 Background (revised per review)

The original mockup used a vertical "Matrix digital rain". **This was rejected as off-domain**
(reads as sci-fi, not ops). The approved background is a **continuous, horizontally-scrolling
command-stream wall**:

- Multiple rows of real DevOps/Linux commands scroll left continuously at varied speeds (parallax):
  `$ kubectl get pods -A`, `$ terraform apply --auto-approve`, `$ wrangler deploy --name infra-folio`,
  `$ argocd app sync prod`, `$ helm upgrade --install`, `$ journalctl -fu api-worker`, etc.
- Prompts in green, flags in magenta, occasional `[✓] success` outputs in green.
- Rendered at low opacity (~0.13) with a radial mask so it fades at the edges and never competes
  with foreground content. Loops seamlessly (duplicated segment + `translateX(0 → -50%)`).
- A faint cyan **circuit grid** (48px) sits behind it, edge-masked, for subtle texture.

### 3.3 Per-section / per-page treatment

- **Nav:** sticky, translucent black with cyan bottom border; brand `PHUC::TRUONG` (cyan/magenta).
- **Hero:** huge glowing monospace name; animated green "● Available for freelance" badge;
  `> DevOps & Infrastructure Engineer` subtitle in magenta glow; cyan/magenta CTA buttons with glow.
- **About / Skills:** `// section` magenta labels; skill tags as bordered cyan/magenta chips.
- **Projects (cards):** sharp-edged **glowing terminal windows** — orange border, traffic-light
  dots, a `~/project-path` title bar, neon tech chips (Astro/React/etc. as simple neon SVGs).
- **Open Source:** same card pattern, cyan-bordered, with `★ stars · repo` headers.
- **Status Panel (LiveTerminal — centerpiece):** dark CRT screen with **scanline overlay**,
  vignette, green border glow; a `crt-bar` header with a live "connected" dot; **scrolling
  green/cyan logs** (`[✓] site-worker: deploy → success`, `[!] og-worker: cache miss…`); a status
  row (region / uptime / workers / p50) in cyan with green values.
- **Contact:** dark inputs with cyan focus glow; primary "Send transmission" button.
- **Blog listing:** monospace rows, magenta `date · tags` meta, cyan glowing titles on hover.
- **Blog post:** large glowing title; `// comments · giscus` block (dashed cyan border) with
  gradient avatars; code blocks are green-on-panel with a cyan left rule.
- **Project detail:** title + neon chips, demo/repo buttons, a 2-up media gallery (cyan-bordered
  gradient placeholders), and a deploy-log `<pre>` styled like the terminal.
- **Footer:** `$ built on the cloudflare edge · © 2026 Phuc Truong`.

### 3.4 Accessibility & performance constraints (carry into implementation)

- **Body legibility:** glow is reserved for headlines, labels, links-on-hover, and terminal text.
  Long-form body copy (About, blog posts) stays plain `--text` on `--bg` for contrast; do not glow
  paragraph text. Verify body text meets WCAG AA contrast on `--bg`.
- **`prefers-reduced-motion`:** the command-stream background, matrix-style motion, badge blink,
  and log auto-scroll must pause/disable under reduced-motion. Provide a static fallback.
- **Background cost:** the command-stream is CSS transform animation (cheap, GPU-composited), not a
  per-frame canvas. Keep it off the main thread; cap row count responsively.
- **Monospace-everywhere readability:** Fira Code at comfortable size/line-height for paragraphs;
  reassess if long posts feel dense (acceptable per approved direction, but tune leading).
- **Theme:** Option A is **dark-only by design**. (A light/dark toggle remains out of scope per the
  project roadmap; revisit only if requested.)

---

## 4. Implementation notes (design-level, not a plan)

The refactor is expected to be largely contained to:

- `src/styles/global.css` — CSS variables (the token set above) and shared primitives.
- `src/components/layout/*` — Nav, Footer, layout shell (background layers live here).
- `src/components/sections/*.astro` — per-section styling (markup/data unchanged).
- `src/components/islands/*` — visual styling of `LiveTerminal`, `GithubFeed`, `Comments`,
  `ContactForm`; **behavior, props, and feature-flag handling unchanged**.
- The og-worker template (`workers/og/src/template.tsx`) should be revisited so social cards match
  the new look, but that can be a follow-up.

No changes to routing, the rendering model, content collections/schemas, the workers' APIs, the
storage adapter, or feature flags.

---

## 5. Recorded alternates (for a future switch)

### Option C — Glassmorphic Cloud-Native (`option-c-glassmorphic-ALT.html`)

- **Palette:** light-first; pastel mesh-gradient background (purple `#8b5cf6`, blue `#3b82f6`,
  pink `#ec4899`, yellow `#facc15`) with halo glows; text `#1d2333`, muted `#5b647e`.
- **Type:** Inter (Geist-style clean sans); gradient-filled headings.
- **Surfaces:** frosted glass — `backdrop-filter: blur(18px) saturate(160%)`, 22px radius, soft
  shadows, floating cards that lift on hover.
- **LiveTerminal:** translucent glass island with a purple halo glow behind it.
- **Cards:** floating glass tiles with soft diffused-light gradient icons.

### Option D — Hybrid (`option-d-hybrid-ALT.html`)

- Foundation = Option C (glass readability, pastel mesh, Inter, gradient headings, light mode).
- Centerpiece = Option A's **CRT LiveTerminal** (dark screen, scanlines, vignette, glowing
  green/cyan scrolling logs) cradled inside a C-style glass frame with a purple→cyan halo.
- Bridge: Fira Code used as a monospace *accent* (nav `~/`, `// labels`, `>` tagline, skill
  headers, tech chips); blog/project code blocks echo the CRT green-on-black so the terminal feels
  native rather than bolted on.

---

## 6. Out of scope

- Architecture, routing, rendering model, content schemas, worker APIs, storage adapter, feature flags.
- New sections or content; copy changes.
- Light/dark toggle (per project roadmap).
- Analytics, CMS, auth.

---

## 7. Follow-ups (non-blocking)

- Update the og-worker OG-image template to match the approved look.
- Tune monospace body leading after seeing real long-form posts.
- Confirm reduced-motion and contrast in implementation review.
