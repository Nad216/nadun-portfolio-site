# README — JavaScript modules & `data/projects.json`

This README documents **only** the JavaScript modules and the `projects.json` format used by your portfolio. It explains what each JS file does, how they connect, the expected JSON shape, running notes, and troubleshooting. Drop this `README.md` next to your project for quick reference.

---

# Table of contents
- [Project structure (where files live)](#project-structure-where-files-live)  
- [What each JS file does (summary + exports)](#what-each-js-file-does-summary--exports)  
- [Lifecycle / initialization order](#lifecycle--initialization-order)  
- [`projects.json` — schema & semantics](#projectsjson---schema--semantics)  
- [Examples (JSON)](#examples-json)  
- [How links are used (`project.link` vs `media.link`)](#how-links-are-used-projectlink-vs-medialink)  
- [How to run locally / dev server](#how-to-run-locally--dev-server)  
- [Common adjustments & where to change them](#common-adjustments--where-to-change-them)  
- [Troubleshooting checklist](#troubleshooting-checklist)  
- [Developer tips / next steps](#developer-tips--next-steps)

---

# Project structure (where files live)

```
/index.html
/style.css
/js/
  ├─ main.js         // entrypoint (type="module")
  ├─ utils.js        // helper functions
  ├─ nav.js          // nav highlight logic
  ├─ mobileMenu.js   // mobile hamburger logic
  ├─ overlay.js      // overlay singleton & media handling
  └─ projects.js     // fetch + render projects.json
/data/
  └─ projects.json   // your projects data (consumed by projects.js)
assets/
  └─ logos/          // small logo images referenced by createdUsing
  └─ ...             // thumbs, images, videos, etc.
```

---

# What each JS file does (summary + exports)

## `utils.js`
**Purpose:** Pure helpers used by multiple modules.  
**Exports / responsibilities:**
- `slugifyForLogo(name)` — hostname/filename-safe string for logo file names.
- `generateLogosHTML(softwareList)` — returns the “Built with” HTML for project cards and overlay.
- YouTube helpers: `parseYouTubeId`, `youtubeWatchUrlFromLink`, `youtubeThumbnailUrl`.
- `drivePreviewUrl(link)` — normalizes/returns Drive preview links where possible.

Edit this file to add new provider parsing or change logo naming.

---

## `nav.js`
**Purpose:** Keep sidebar/mobile nav `.nav-link` in sync with `.panel` as the user scrolls.  
**Export:**
- `initNav()` — wires `scroll` (on `.main-content`), `load`, and `resize` handlers.  
**Key logic:** it marks the nav link whose section top is `<= window.innerHeight / 2`. Change that fraction to shift activation timing.

---

## `mobileMenu.js`
**Purpose:** Toggle mobile menu and close it when a link is clicked.  
**Export:**
- `initMobileMenu()` — toggles `#mobile-menu.open` and updates `aria-expanded` on `#menu-toggle`.  
Add focus trapping or animations here if needed.

---

## `overlay.js`
**Purpose:** The overlay singleton — builds and controls project detail previews (images, local videos, YouTube, Drive), thumbnails, fullscreen, vertical-split layout, accessibility, and open/close lifecycle.  
**Exports:**
- `initOverlay()` — create overlay singleton and fullscreen button (call once).
- `openOverlay(project)` — open the overlay for the given project object.
- `closeOverlay()` — close and cleanup.

**Notable behavior:**
- Creates `#fullscreen-overlay` only once.
- `createMediaNodeWithoutIframe(project)` supports:
  - `media.type === 'images'` (gallery images array),
  - local video files (`.mp4`/`.webm`/`.ogg`),
  - YouTube (lazy iframe insertion on click),
  - Google Drive preview (inserts iframe on click),
  - fallback to `thumb`/`image`.
- If `media.format === 'vertical'`, overlay uses a `.fs-split` vertical layout and adds `vertical` class.
- Accessibility: toggles `aria-hidden`, attempts `inert`, focuses inner dialog, closes on Escape and backdrop click.

---

## `projects.js`
**Purpose:** Load `data/projects.json` and render project cards (featured and normal).  
**Export:**
- `loadProjects()` — fetches JSON, finds/creates category containers, builds DOM for each project, and attaches click handler to call `openOverlay(project)` (unless modifier keys used).

**Important:** `fetch('data/projects.json')` requires an HTTP server (not `file://`).

---

## `main.js`
**Purpose:** Entrypoint that wires everything in the correct order.  
**Behavior:** on `DOMContentLoaded` it calls:
1. `initNav()`
2. `initMobileMenu()`
3. `initOverlay()`
4. `loadProjects()`

Order matters so `openOverlay()` is available before project cards attach click handlers.

---

# Lifecycle / initialization order

1. Browser loads `index.html` which includes `<script type="module" src="js/main.js"></script>`.  
2. `main.js` imports modules and on `DOMContentLoaded` runs the initializers (nav, mobile menu, overlay, projects).  
3. `initOverlay()` creates overlay DOM and fullscreen button so `openOverlay()` is ready.  
4. `loadProjects()` fetches `projects.json` and renders cards. Each card’s click handler calls `openOverlay(project)`.

---

# `projects.json` — schema & semantics

Top-level: an object where each key is a **category name** (e.g. `"brand"`, `"animation"`, `"cgi"`) and the value is an **array** of project objects.

### Project object fields
- `title` *(string)* — shown on card and overlay header.  
- `description` *(string)* — short description for card & overlay.  
- `image` *(string, optional)* — hero image path (fallback).  
- `thumb` *(string)* — thumbnail used in cards and as video poster.  
- `createdUsing` *(array of strings)* — used by `generateLogosHTML()`; the helper will look for `assets/logos/<slug>.png` where slug = `slugifyForLogo(name)`.  
- `featured` *(boolean)* — if true, project is rendered in `#featured-cards`.  
- `keep` *(boolean)* — if true a featured project may also be placed into its category as a small card.  
- `highlight` *(boolean)* — adds `.highlight-project` class for emphasis.  
- `media` *(object)* — describes playable/preview content.

### `media` object fields
- `type` *(string)* — `'video'`, `'images'`, or `'gallery'`. For image galleries, code expects `images` array.  
- `source` *(string)* — `'local'`, `'youtube'`, `'drive'`, etc. Used to decide embedding behavior.  
- `link` *(string)* — URL or local path used for embedding or opening in overlay.  
- `format` *(string)* — `'horizontal'`, `'vertical'`, `'square'`. `'vertical'` triggers the overlay vertical/split layout.  
- `images` *(array)* — gallery images (if `type` is `'images'` or `'gallery'`).

---

# Examples (your JSON)

Your updated JSON (valid structure used by the code):

```json
{
  "brand": [
    {
      "title": "Brand Logo Design",
      "description": "Visual identity design for top brand.",
      "image": "assets/logo1.jpg",
      "thumb": "assets/logo1.jpg",
      "media": {
        "type": "images",
        "source": "local",
        "link": "assets/logo1.jpg",
        "format": "horizontal",
        "images": [
          "assets/logo1.jpg"
        ]
      }
    }
  ],
  "animation": [
    {
      "title": "Company Promo Video",
      "description": "Promotional video for international launch.",
      "image": "assets/company-video.jpg",
      "thumb": "assets/company-video.jpg",
      "media": {
        "type": "video",
        "source": "drive",
        "link": "https://drive.google.com/file/d/YourFileID/preview",
        "format": "horizontal",
        "images": []
      }
    }
  ],
  "cgi": [
    {
      "title": "Viral YouTube Song - Thoppi Welenda",
      "description": "A stylized 3D animation...",
      "image": "assets/thumbs/Toppi Welenda Thumb.jpg",
      "thumb": "assets/thumbs/Toppi Welenda Thumb.jpg",
      "featured": true,
      "keep": true,
      "highlight": true,
      "createdUsing": ["3ds Max", "After Effects"],
      "media": {
        "type": "video",
        "source": "youtube",
        "link": "https://www.youtube.com/watch?v=K7nV9zwF0nk",
        "format": "horizontal",
        "images": [
          "assets/thumbs/Toppi Welenda Thumb.jpg",
          "assets/thumbs/Toppi Welenda Thumb.jpg",
          "assets/thumbs/Toppi Welenda Thumb.jpg"
        ]
      }
    }
    // ... other projects
  ]
}
```

---

# How links are used (`project.link` vs `media.link`)

- `projects.js` passes the whole `project` object into `openOverlay(project)`.  
- `overlay.js` prefers `project.media.link` (when `media` exists) for embedding.  
- If `project.media` is **missing**, `openOverlay()` will attempt to synthesize `project.media` from `project.link` as a fallback.  
- **Conclusion:** You can keep either `project.link` or `project.media.link`. As long as **one** exists (or `thumb`/`image` exists), the overlay will display something. If both are missing, the overlay falls back to the thumbnail image (no embedded video).

---

# How to run locally / dev server

`fetch('data/projects.json')` will not work from `file://`. Use a lightweight local server:

- Node (serve):  
  ```bash
  npx serve .
  ```
- Python 3:  
  ```bash
  python -m http.server 8000
  ```
- VSCode: use Live Server extension.

Then open `http://localhost:8000` (or the port your server shows) in your browser.

---

# Common adjustments & where to change them

- **Change logo filenames or slug rules:** `utils.js` → `slugifyForLogo`.
- **Add new video provider (Vimeo, etc.):** `utils.js` (add parser) + `overlay.js` (`createMediaNodeWithoutIframe`) to handle embed insertion.
- **Change featured card markup or styling:** `projects.js` where `.featured-project` is built.
- **Change nav activation timing:** `nav.js` — adjust `window.innerHeight / 2`.
- **Add focus trapping to overlay:** `overlay.js` — currently focuses `.fs-inner`. Add a focus trap if you want complete keyboard isolation.

---

# Troubleshooting checklist

1. **Blank projects area / fetch fails**  
   - Open DevTools → Network → confirm `data/projects.json` 200. If 404 or blocked, run a local server (see above).

2. **No thumbnails / gallery not showing**  
   - Confirm `media.images` exists and is a non-empty array. Confirm file paths are correct (case-sensitive on many servers).

3. **YouTube doesn't embed**  
   - Ensure `media.link` is a valid YouTube URL (e.g. `https://www.youtube.com/watch?v=K7nV9zwF0nk` or `https://youtu.be/ID`).

4. **Drive preview not working**  
   - Prefer a preview URL like `/file/d/<id>/preview`, or ensure the link includes `id=`. Check the console for blocked mixed-content or CORS issues.

5. **Logos not loading**  
   - Put images into `assets/logos/` named with `slugifyForLogo(name)`. Example: `"After Effects"` → `assets/logos/AfterEffects.png`.

6. **Overlay styles broken**  
   - Ensure your CSS includes styles for `.fullscreen-overlay`, `.open`, `.vertical`, `.fs-split`, `.embed-container`, `.fs-thumbs`, etc.

---

# Developer tips / next steps

- Keep `main.js` small — it’s just the wiring. All behavior changes belong in their respective modules.
- Maintain consistent JSON field names (`media.images` used across all entries keeps code simple).
- When adding new features (e.g. comments, ratings), prefer a new module (e.g. `comments.js`) and import it from `main.js`.
- Use the browser console for the first error; it always points to the file/line to fix.

---

If you want, I can:
- produce this README as a downloadable file, or
- validate your current `data/projects.json` and return a cleaned/canonical copy ready to drop into `/data/`.

Which would you like?
