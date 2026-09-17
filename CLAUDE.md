# CLAUDE.md — Developer Guide for EOHA Prototype

## Architecture

Plain HTML5 / CSS3 / Vanilla JavaScript. No framework, no build step, no package manager. Open `index.html` directly in a browser or serve from any static file server.

```bash
python -m http.server 5500   # from project root
```

All pages live in `pages/`. `index.html` is the landing page at the project root.

---

## Theming (light / dark mode)

Every page must load two files in `<head>` in this order, **before** the page-specific CSS:

```html
<link rel="stylesheet" href="../styles/theme.css">
<link rel="stylesheet" href="../styles/page-name.css">
<script src="../scripts/theme.js"></script>
```

`theme.js` runs immediately (IIFE) to set `data-theme` on `<html>` before the body renders, preventing a flash of the wrong theme. It reads from `localStorage` (`eoha-theme`) and falls back to `prefers-color-scheme`.

`theme.css` declares CSS custom properties in `:root` (light) and `[data-theme="dark"]`. Every new color you add must use one of these tokens — never hard-code `#hex` for backgrounds or text in new CSS.

**Core tokens:**

| Token | Light | Dark |
|-------|-------|------|
| `--bg-page` | `#ffffff` | `#0f172a` |
| `--bg-soft` | `#f8fafc` | `#1e293b` |
| `--text-primary` | `#0f172a` | `#f1f5f9` |
| `--text-secondary` | `#475569` | `#94a3b8` |
| `--primary-brand` | `#0ea5e9` | `#38bdf8` |
| `--bg-main` | `#f4f7f9` | `#1e293b` |
| `--panel-bg` | `rgba(255,255,255,0.95)` | `rgba(15,23,42,0.95)` |
| `--text-dark` | `#1a2b4b` | `#f1f5f9` |
| `--text-muted` | `#7d8da1` | `#94a3b8` |
| `--border` | `#f0f2f5` | `rgba(255,255,255,0.08)` |
| `--primary` | `#1a82ff` | `#38bdf8` |

**Dark strip sections** (feature strip, partners bar, site footer) always use `background: #0f172a` — intentionally not a token.

Add the theme toggle button to every page's nav/header:

```html
<button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode">
    <svg class="sun-icon" ...></svg>
    <svg class="moon-icon" ...></svg>
</button>
```

---

## Scroll Reveal (landing page)

Any element on `index.html` animates in on scroll by adding `.reveal` (plus optional `.reveal-left` or `.reveal-right`) in HTML. `scripts/script.js` wires the `IntersectionObserver` automatically — no extra JS needed.

Stagger with inline `style="transition-delay: 150ms"`.

```css
/* Already in styles.css: */
.reveal          { opacity: 0; transform: translateY(40px); transition: ... }
.reveal.revealed { opacity: 1; transform: none; }
.reveal-left     { transform: translateX(-50px); }
.reveal-right    { transform: translateX(50px); }
```

---

## Landing Page Section Layout

Sections below the hero follow a shared pattern:

- Wrapper: `<section class="alt-section bg-white">` or `bg-light`
- Container: `<div class="section-inner">` — max-width 1200px, auto margins, 2rem side padding
- Alternating two-column: `.alt-layout` (grid 1fr 1fr); reverse with `.alt-reverse`
- Chip label: `<span class="section-chip">Label</span>`
- CTA: `<a class="btn-section" href="...">Text →</a>`

---

## Risk Score Formula

Malaria risk is computed from four EO features:

```
score = Soil_Moisture(40) + LST_Surface_C(30) + NDWI_Water(20) + Population_Density(10)
```

- **High** ≥ 50
- **Moderate** 25 – 49
- **Low** < 25

Lives in `scripts/malaria-reports.js` (`calculateRisk()`) and `scripts/malaria-page.js` (`calculateDynamicRisk()`). Keep both in sync.

---

## Adding a New Page

1. Copy the most similar existing page in `pages/`.
2. Update `<head>` — load `theme.css` first, then your page CSS, then `theme.js` as a `<script>`.
3. Add the theme toggle button in the nav/header.
4. Link the page from `index.html` and from the nav of every other page it relates to.
5. Use `var(--token)` for any new background/text colors; add missing tokens to `theme.css` if needed.

---

## Key Files

| File | Purpose |
|------|---------|
| `styles/theme.css` | All CSS variables + dark mode overrides for every page |
| `scripts/theme.js` | Theme init IIFE + `toggleTheme()` |
| `scripts/script.js` | Landing page: stat counters, hamburger, IntersectionObserver reveal |
| `scripts/malaria-page.js` | Heatmap, ward selection, risk scoring, timeline |
| `scripts/malaria-reports.js` | CSV parse, filter system, sort, CSV export |
| `data/Limpopo_Risk_Jan25_Jan26_Safe.csv` | Primary dataset (13 months × 560 wards) |
