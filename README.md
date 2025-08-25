# README — JS files, `data/projects.json`, and CSS file roles (updated for new category names and overlay thumbnail logic)

This README documents the JavaScript modules, the `data/projects.json` format (with updated category keys), and the purpose of each CSS file in your project. It matches your current file tree and naming conventions.

---

## Project structure
```
/index.html
/css/
  ├─ variables.css      // CSS variables (tokens) used across all styles
  ├─ reset.css          // reset + basic accessibility defaults
  ├─ layout.css         // page layout: sidebar, main-content, mobile bar
  ├─ components.css     // panels, panel-inner, titles, grids, and card styles
  ├─ overlay.css        // fullscreen overlay, fs-split, embed helpers
  └─ responsive.css     // responsive tweaks and mobile-specific styles
/data/
  └─ projects.json
/js/
  ├─ main.js
  ├─ utils.js
  ├─ nav.js
  ├─ mobileMenu.js
  ├─ overlay.js
  └─ projects.js
/assets/ (images, logos, thumbs, etc.)
README.md
```

---

## What each JS file does (quick reference)

- **`main.js`** — entrypoint. On DOM ready, wires modules together (init nav, init mobile menu, init overlay, then load projects).
- **`utils.js`** — helper utilities: `slugifyForLogo()`, YouTube/Drive/Imgur parsers, `generateLogosHTML()`, etc.
- **`nav.js`** — highlights sidebar/mobile nav links based on scroll position.
- **`mobileMenu.js`** — hamburger toggle and mobile menu open/close behavior.
- **`overlay.js`** — creates and manages the single overlay DOM node (`#fullscreen-overlay`), handles media previews (images, local video, YouTube, Drive), thumbs, fullscreen button, vertical split, and thumbnail mapping for mixed media.
- **`projects.js`** — fetches `data/projects.json`, renders featured and normal cards, and attaches card click handlers that open the overlay.

---

## `projects.json` — shape reminder (UPDATED)

Top-level: `{ "digitalCreativeArts": [ ... ], "animationMotion": [ ... ], "threeDCreations": [ ... ] }` — each category is an array of project objects.

Project fields (used by the code):
- `title`, `description`, `image`, `thumb`
- `createdUsing` (array) → maps to `assets/logos/<slug>.png`
- `featured`, `keep`, `highlight` (booleans)
- `dateCreated` (string, ISO format: YYYY-MM-DD)
- `media` object:
  - `type` ('video' | 'images' | 'gallery' | 'mixed')
  - `source` ('local' | 'youtube' | 'drive' | etc.)
  - `link` (URL or local path)
  - `links` (array of video URLs for mixed type)
  - `format` ('horizontal' | 'vertical' | 'square')
  - `images` (array) — gallery images and/or video thumbnails

**Important**: `fetch('data/projects.json')` requires an HTTP server (not file://).

### Overlay thumbnail logic for mixed media
- If `media.type` is `"mixed"` and there are multiple video links (`links` array), the first N images in `images` are used as thumbnails and preload images for the N videos.
- Any additional images (after the first N) are shown as image slides/thumbnails in the overlay gallery.
- For a single video, the first image is used as its thumbnail/preload.
- This logic ensures correct mapping of video thumbnails and gallery images in overlays.

---

## CSS files — purpose & what to edit where

### `variables.css`
- **Contains:** `:root` CSS variables (colors, `--sidebar-width`, overlay sizes).
- **Edit when:** changing theme colors, sidebar width, overlay height, and other global tokens.

### `reset.css`
- **Contains:** reset rules and small accessibility defaults (focus outlines, tap highlight).
- **Edit when:** changing global resets or focus styles.

### `layout.css`
- **Contains:** layout primitives: `.sidebar`, `.main-content`, `.mobile-bar`, `.mobile-menu` positioning and z-indexes.
- **Edit when:** changing overall page structure (sidebar width/position, mobile bar height, scroll container behavior).

### `components.css`
- **Contains:** `.panel`, `.panel-inner`, `.panel-content`, card grids (`.card-grid`, `#featured-cards`, etc.), and **card styles** (`.project`, `.featured-project`, `.highlight-project`, `.built-with-logos`).
- **Edit when:** adjusting section spacing, typography for titles, grid column sizes, or card visuals (thumbnail height, border radius, shadows).

### `overlay.css`
- **Contains:** full-screen overlay dialog (`#fullscreen-overlay`, `.fs-inner`), `.fs-content` grid, `.fs-media`, `.fs-thumbs`, `.embed-container` aspect helpers, `.fs-split` vertical layout and related responsive fixes.
- **Edit when:** changing how overlay displays media, split widths, aspect helpers, or thumbnail behavior.

### `responsive.css`
- **Contains:** responsive rules: breakpoints for hiding sidebar, showing mobile bar, grid adjustments, and overlay/mobile tweaks.
- **Edit when:** changing breakpoint values or mobile-specific layout.

---

## How to include CSS (order matters)

Include CSS in the `<head>` in this order:

```html
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/reset.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/overlay.css">
<link rel="stylesheet" href="css/responsive.css">
```

- `variables.css` must come first so tokens are available.
- `responsive.css` last so mobile overrides apply after base styles.
- `overlay.css` comes after `components.css` because it overrides some component defaults in vertical mode.

---

## Quick sanity checks

- CSS folder contains: `variables.css`, `reset.css`, `layout.css`, `components.css`, `overlay.css`, `responsive.css` — **matched**.
- JS folder contains: `main.js`, `mobileMenu.js`, `nav.js`, `overlay.js`, `projects.js`, `utils.js` — **matched**.
- `data/projects.json` exists and uses new keys — **matched**.

---

## Troubleshooting & next steps

- If your styling appears wrong, check the CSS inclusion order and open DevTools → Elements → Styles to see which file/rule wins.
- If projects don't load, confirm `data/projects.json` HTTP 200 from the same origin and that keys match the new names.
- If you'd like, I can:
  - validate `data/projects.json` and return a cleaned copy, or
  - produce a tiny script that checks the presence of expected files and reports any missing ones.

---

If you'd like the README file updated on disk with this exact content, it's now up to date.