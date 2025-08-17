# README — JavaScript modules, `data/projects.json`, and CSS file roles

This README documents **only** the JavaScript modules, the `data/projects.json` format, and the purpose of each CSS file in your project. It's written for quick reference so you (or a collaborator) can jump in, maintain, and edit parts of the site without confusion.

---

## Table of contents
- [Project structure (where files live)](#project-structure-where-files-live)  
- [What each JS file does (summary + exports)](#what-each-js-file-does-summary--exports)  
- [`projects.json` — shape & what fields mean](#projectsjson---shape--what-fields-mean)  
- [CSS files — purpose & what to edit where](#css-files---purpose--what-to-edit-where)  
- [How to include the CSS (order matters)](#how-to-include-the-css-order-matters)  
- [Lifecycle / initialization order (JS)](#lifecycle--initialization-order-js)  
- [Troubleshooting checklist](#troubleshooting-checklist)  
- [Quick edit guide: where to make common changes](#quick-edit-guide-where-to-make-common-changes)  
- [Notes](#notes)

---

## Project structure (where files live)
```
/index.html
/css/
  ├─ variables.css      // CSS variables (tokens) used across all styles
  ├─ reset.css          // reset + basic accessibility defaults
  ├─ layout.css         // page layout: sidebar, main-content, mobile bar
  ├─ components.css     // panels, panel-inner, titles, grids
  ├─ cards.css          // featured cards, project cards, built-with logos
  └─ overlay.css        // fullscreen overlay, fs-split, embed helpers
/js/
  ├─ main.js
  ├─ utils.js
  ├─ nav.js
  ├─ mobileMenu.js
  ├─ overlay.js
  └─ projects.js
/data/
  └─ projects.json
/assets/
  └─ logos/, thumbs, images, videos...
```

---

## What each JS file does (summary + exports)

**`utils.js`**
- Helper functions used across modules.
- Key helpers: string slugify for logos, YouTube ID extraction, Drive preview URL normalization, `generateLogosHTML()`.

**`nav.js`**
- Highlights `.nav-link` that corresponds to the currently-visible `.panel`.
- Export: `initNav()` — attaches scroll/resize handlers and runs initial activation.

**`mobileMenu.js`**
- Controls the mobile hamburger and mobile menu open/close behavior.
- Export: `initMobileMenu()` — wires the toggle and auto-close on link click.

**`overlay.js`**
- Creates and manages a single overlay DOM node (`#fullscreen-overlay`).
- Handles media previews (image galleries, local video files, YouTube, Google Drive).
- Supports vertical split layout for tall media (`.fs-split`).
- Exports: `initOverlay()`, `openOverlay(project)`, `closeOverlay()`.

**`projects.js`**
- Fetches `/data/projects.json` and renders project cards into category containers.
- Differentiates featured and normal cards and attaches click handlers to call `openOverlay(project)`.

**`main.js`**
- Entrypoint: imports modules and calls their init functions in the required order.

---

## `projects.json` — shape & what fields mean

Top-level is an object with category keys (`brand`, `animation`, `cgi`, etc.) — each value is an array of project objects.

**Project fields used by the site**
- `title`, `description`, `image`, `thumb` — displayed in cards and overlay.
- `createdUsing` (array) — `"Built with"` logos; files expected at `assets/logos/<slug>.png`.
- `featured` (boolean) — put in `#featured-cards`.
- `keep` (boolean) — if `true` keep a small card in its category in addition to featured area.
- `highlight` (boolean) — adds `.highlight-project` class.
- `media` — object including:
  - `type`: `'video'`, `'images'`, `'gallery'`.
  - `source`: `'local'`, `'youtube'`, `'drive'`.
  - `link`: URL or path for embedding.
  - `format`: `'horizontal'`, `'vertical'`, `'square'`.
  - `images`: array for galleries (the code looks for this).

**Important**: `projects.js` expects to fetch `data/projects.json` via HTTP. Use a local dev server; file:// won't work.

---

## CSS files — purpose & what to edit where

Below is a direct, practical explanation of what *each* CSS file contains and what you should edit there. This replaces the vague "split into files" advice — this is exact.

### `variables.css`
**Contains:** CSS custom properties (`:root`) — all color tokens, spacing tokens, sizes like `--sidebar-width`, overlay sizes.  
**Edit when:** You want to change theme colors, global sizes (sidebar width, overlay height), or add color variants. This file should be first so every other stylesheet can use the variables.

### `reset.css`
**Contains:** Browser reset rules and very small accessibility defaults (focus outlines, tap highlight).  
**Edit when:** You want to change focus outlines or add additional global reset rules.

### `layout.css`
**Contains:** Desktop layout (fixed sidebar), `.main-content` scroll container, mobile bar base, and mobile menu positioning.  
**Edit when:** You want to change overall page structure: sidebar width, fixed vs. overlay sidebar, mobile bar height, where `.main-content` scrolls from. Also adjust z-indexes for global stacking changes.

### `components.css`
**Contains:** Section/panel styles: `.panel`, `.panel-inner`, `.panel-content` (title areas), and the main grid container definitions (card grids and grid-template defaults).  
**Edit when:** You want to change spacing of sections, typography for headings inside sections, or the grid defaults for content flow.

### `cards.css`
**Contains:** Card UI: `.featured-project`, `.project`, `.highlight-project`, built-with area, thumbnail sizing, hover states, small card layout.  
**Edit when:** You change card visuals (rounded corners, shadows, thumbnail heights), decide to add badges or overlays on cards, or change how built-with logos look.

### `overlay.css`
**Contains:** The fullscreen overlay dialog, media containers (`.embed-container`, aspect helpers), `.fs-split` vertical layout, thumbs, play button, and responsive tweaks specific to the overlay.  
**Edit when:** You alter overlay layout (e.g., different split widths), change aspect ratio helpers, or change how the thumbnails/play button behave. This is the most specialized file.

---

## How to include the CSS (order matters)

Link files in this order (variables first so other files can use them):

```html
<link rel="stylesheet" href="css/variables.css">
<link rel="stylesheet" href="css/reset.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/cards.css">
<link rel="stylesheet" href="css/overlay.css">
```

**Why order matters:** later files override earlier rules. You want `variables` available globally. `overlay.css` overrides some component defaults (e.g., hides legacy `.fs-media` when vertical), so it must be last.

If you prefer a single file, concatenate them in the same order into `css/style.css` and include that.

---

## Lifecycle / initialization order (JS)

1. `main.js` runs on DOM ready and calls:
   - `initNav()` — wires up nav highlight,
   - `initMobileMenu()` — wires mobile interactions,
   - `initOverlay()` — creates overlay and UI actions,
   - `loadProjects()` — fetches JSON and renders cards.

2. `loadProjects()` attaches click handlers to cards which call `openOverlay(project)` provided by the overlay module.

**If you add GSAP / three.js:** initialize animation modules *after* `loadProjects()` or listen for an event like `projects:loaded`. Heavy libraries should be lazy-loaded.

---

## Troubleshooting checklist

- Projects area is empty → open DevTools Network: check `data/projects.json` 200. If 404, check path & start a local server.  
- Thumbnails missing → check paths & file names (case-sensitive).  
- YouTube not embedding → media.link malformed; must include `watch?v=` or `youtu.be/`.  
- Drive preview fails → prefer `/file/d/<id>/preview` or include `id=` in URL.  
- Logos not showing → file names must match `slugifyForLogo(name)` and be placed in `assets/logos/`.  
- Overlay behavior off → check `overlay.css` and `overlay.js` for `.vertical` and `.fs-split` logic.

---

## Quick edit guide: where to make common changes

- Want the sidebar narrower/wider? → `variables.css` (`--sidebar-width`) and `layout.css` for layout specifics.  
- Change card thumbnail height? → `cards.css`, `.project img` rule.  
- Change title sizes in sections? → `components.css`, `.panel-content h1/h2/h3`.  
- Add Vimeo support? → `utils.js` (parser) + `overlay.js` (embed logic). No CSS change needed unless you want special controls.

---

## Notes

- **No build step required.** The six CSS files can be used directly — just include in the order above. SCSS / bundling is optional and only needed if you prefer a build step for convenience.  
- Keep CSS edits in the appropriate file to avoid accidental global overrides. If something looks wrong, check the CSS inclusion order and DevTools to see which rule wins.
