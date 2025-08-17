// overlay.js
import {
  parseYouTubeId,
  youtubeWatchUrlFromLink,
  youtubeThumbnailUrl,
  drivePreviewUrl,
  generateLogosHTML
} from './utils.js';

let overlay, fsInner, fsContent, fsTitle, fsDesc, fsMedia, fsThumbs, fsClose, fsBuiltWith, fsActions;
let currentSlides = [];
let currentIndex = 0;
let currentProject = null;

function ensureOverlayExists() {
  if (overlay) return overlay;
  overlay = document.getElementById('fullscreen-overlay');
  if (overlay) {
    // populate references if already in DOM
    setupRefs();
    return overlay;
  }

  overlay = document.createElement('div');
  overlay.id = 'fullscreen-overlay';
  overlay.className = 'fullscreen-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  overlay.innerHTML = `
    <div class="fs-inner" role="dialog" aria-label="Project detail" tabindex="-1">
      <button class="fs-close" aria-label="Close">✕</button>
      <div class="fs-content">
        <header class="fs-header">
          <div class="fs-left">
            <h2 class="fs-title"></h2>
            <p class="fs-desc"></p>
            <div class="fs-builtwith"></div>
          </div>
          <div class="fs-actions"></div>
        </header>
        <main class="fs-media" aria-live="polite"></main>
        <footer class="fs-footer"><div class="fs-thumbs"></div></footer>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  setupRefs();

  overlay.addEventListener('focusin', (ev) => {
    if (overlay.getAttribute('aria-hidden') === 'true') {
      try { ev.target.blur(); } catch (e) { }
    }
  });

  const mo = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.attributeName === 'aria-hidden') {
        const val = overlay.getAttribute('aria-hidden');
        if (overlay.classList.contains('open') && val === 'true') {
          overlay.removeAttribute('aria-hidden');
        }
      }
    });
  });
  mo.observe(overlay, { attributes: true });

  try { if (overlay.contains(document.activeElement)) document.activeElement.blur(); } catch (e) { }

  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeOverlay(); });

  return overlay;
}

function setupRefs() {
  fsInner = overlay.querySelector('.fs-inner');
  fsContent = overlay.querySelector('.fs-content');
  fsTitle = overlay.querySelector('.fs-title');
  fsDesc = overlay.querySelector('.fs-desc');
  fsMedia = overlay.querySelector('.fs-media');
  fsThumbs = overlay.querySelector('.fs-thumbs');
  fsClose = overlay.querySelector('.fs-close');
  fsBuiltWith = overlay.querySelector('.fs-builtwith');
  fsActions = overlay.querySelector('.fs-actions');

  if (fsClose) fsClose.addEventListener('click', () => closeOverlay());
}

function createFullscreenButton() {
  if (!fsActions) return null;
  let btn = fsActions.querySelector('.fs-fullscreen');
  if (btn) return btn;

  btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fs-fullscreen';
  btn.setAttribute('aria-label', 'Toggle fullscreen');
  btn.title = 'Toggle fullscreen';
  btn.textContent = '⤢';
  fsActions.appendChild(btn);

  btn.addEventListener('click', () => {
    const embed = fsContent.querySelector('.fs-split .embed-container') || fsMedia.querySelector('.embed-container') || fsInner;
    if (!embed) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    } else if (embed.requestFullscreen) {
      embed.requestFullscreen().catch(() => { });
    } else if (embed.webkitRequestFullscreen) {
      embed.webkitRequestFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const isFull = !!document.fullscreenElement;
    btn.setAttribute('aria-pressed', String(isFull));
  });

  return btn;
}

function createMediaNodeWithoutIframe(project) {
  try {
    const media = project.media || {};
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.maxWidth = '1100px';
    wrapper.style.boxSizing = 'border-box';

    const format = (media.format || project.format || 'horizontal');
    const cls = (format === 'vertical') ? 'embed-9-16' : (format === 'square' ? 'embed-1-1' : 'embed-16-9');

    if ((media.type === 'images' || media.type === 'gallery') && Array.isArray(media.images) && media.images.length) {
      const container = document.createElement('div');
      container.className = `embed-container ${cls}`;
      container.style.minHeight = '140px';
      const img = document.createElement('img');
      img.src = media.images[0];
      img.alt = project.title || '';
      img.loading = 'lazy';
      container.appendChild(img);
      wrapper.appendChild(container);
      return { node: wrapper, slides: media.images.slice() };
    }

    if ((media.source === 'local' || /\.mp4|\.webm|\.ogg$/i.test(media.link || project.link || '')) && (media.link || project.link)) {
      const src = media.link || project.link;
      const container = document.createElement('div');
      container.className = `embed-container ${cls}`;
      container.style.minHeight = '180px';
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = src;
      video.poster = project.thumb || project.image || 'assets/placeholder.jpg';
      video.setAttribute('playsinline', '');
      video.autoplay = false;
      video.style.background = '#000';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.maxHeight = 'calc(92vh - 260px)';
      container.appendChild(video);
      wrapper.appendChild(container);
      return { node: wrapper, slides: [] };
    }

    if (media.source === 'youtube' || /youtube/.test(media.link || project.link || '')) {
      const link = (media.link || project.link || '');
      const id = parseYouTubeId(link);
      const thumbUrl = project.thumb || youtubeThumbnailUrl(link) || project.image || 'assets/placeholder.jpg';

      const container = document.createElement('div');
      container.className = `embed-container ${cls}`;
      container.style.minHeight = '180px';
      container.style.position = 'relative';
      container.style.background = '#000';
      container.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.alt = project.title || '';
      img.loading = 'lazy';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.src = thumbUrl;
      container.appendChild(img);

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'fs-play-button';
      play.setAttribute('aria-label', 'Play video');
      play.textContent = '▶';
      container.appendChild(play);

      const insertYouTubeIframe = () => {
        if (!id) {
          const w = youtubeWatchUrlFromLink(link) || link;
          if (w) window.open(w, '_blank', 'noopener');
          return;
        }
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
        iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
        iframe.setAttribute('allowfullscreen', '');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        container.innerHTML = '';
        container.appendChild(iframe);
      };

      play.addEventListener('click', (e) => { e.stopPropagation(); insertYouTubeIframe(); });
      container.addEventListener('click', (e) => { e.stopPropagation(); insertYouTubeIframe(); });

      wrapper.appendChild(container);
      return { node: wrapper, slides: [] };
    }

    if (media.source === 'drive' || /drive\.google/.test(media.link || project.link || '')) {
      const link = media.link || project.link || '';
      const preview = drivePreviewUrl(link) || link;
      const thumbUrl = project.thumb || project.image || 'assets/placeholder.jpg';

      const container = document.createElement('div');
      container.className = `embed-container ${cls}`;
      container.style.minHeight = '180px';
      container.style.position = 'relative';
      container.style.background = '#000';
      container.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.alt = project.title || '';
      img.loading = 'lazy';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.src = thumbUrl;
      container.appendChild(img);

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'fs-play-button';
      play.setAttribute('aria-label', 'Open preview');
      play.textContent = '⤓';
      container.appendChild(play);

      const insertDriveIframe = () => {
        if (/\/file\/d\/[a-zA-Z0-9_-]+\/preview/.test(preview)) {
          const iframe = document.createElement('iframe');
          iframe.src = preview;
          iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
          iframe.setAttribute('allowfullscreen', '');
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = '0';
          container.innerHTML = '';
          container.appendChild(iframe);
        } else {
          if (link) window.open(link, '_blank', 'noopener');
        }
      };

      play.addEventListener('click', (e) => { e.stopPropagation(); insertDriveIframe(); });
      container.addEventListener('click', (e) => { e.stopPropagation(); insertDriveIframe(); });

      wrapper.appendChild(container);
      return { node: wrapper, slides: [] };
    }

    const container = document.createElement('div');
    container.className = `embed-container ${cls}`;
    container.style.minHeight = '120px';
    const img = document.createElement('img');
    img.alt = project.title || '';
    img.loading = 'lazy';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.src = project.thumb || project.image || 'assets/placeholder.jpg';
    container.appendChild(img);
    wrapper.appendChild(container);
    return { node: wrapper, slides: [] };

  } catch (err) {
    const fallback = document.createElement('div');
    fallback.textContent = 'Preview unavailable';
    return { node: fallback, slides: [] };
  }
}

function setBackgroundInert(state) {
  const main = document.querySelector('.main-content');
  if (!main) return;
  if (state) {
    try { main.setAttribute('inert', ''); } catch (e) { }
    main.setAttribute('aria-hidden', 'true');
  } else {
    try { main.removeAttribute('inert'); } catch (e) { }
    main.removeAttribute('aria-hidden');
  }
}

export function initOverlay() {
  ensureOverlayExists();
  createFullscreenButton();
}

export function openOverlay(project) {
  ensureOverlayExists();
  if (!project) return;
  currentProject = project;

  const existingSplit = overlay.querySelector('.fs-split');
  if (existingSplit) existingSplit.remove();

  fsMedia.innerHTML = '';
  fsThumbs.innerHTML = '';
  fsBuiltWith.innerHTML = '';

  fsTitle.textContent = project.title || '';
  fsDesc.textContent = project.description || '';
  if (project.createdUsing && project.createdUsing.length) {
    fsBuiltWith.innerHTML = generateLogosHTML(project.createdUsing);
  }

  if (!project.media) {
    const link = project.link || '';
    let source = 'local';
    if (/youtube/.test(link) || /youtu\.be/.test(link)) source = 'youtube';
    else if (/drive\.google/.test(link)) source = 'drive';
    else if (/instagram\.com/.test(link)) source = 'instagram';
    project.media = { type: 'video', source, link, format: project.format || 'horizontal' };
  }

  const res = createMediaNodeWithoutIframe(project);
  currentSlides = res.slides || [];
  currentIndex = 0;

  const fmt = (project.media && project.media.format) || project.format || 'horizontal';
  const isVertical = fmt === 'vertical';

  if (isVertical) {
    overlay.classList.add('vertical');
    fsMedia.innerHTML = '';

    const split = document.createElement('div');
    split.className = 'fs-split';
    split.style.gridRow = '2';
    split.style.width = '100%';

    const header = overlay.querySelector('.fs-header');
    if (header) {
      header.parentElement && header.parentElement.removeChild(header);
      split.appendChild(header);
    }

    split.appendChild(res.node);
    fsContent.appendChild(split);

  } else {
    overlay.classList.remove('vertical');
    fsMedia.appendChild(res.node);
  }

  if (currentSlides.length) {
    currentSlides.forEach((src, i) => {
      const t = document.createElement('img');
      t.src = src;
      t.loading = 'lazy';
      t.alt = `${project.title || ''} ${i + 1}`;
      if (i === 0) t.classList.add('active');
      t.addEventListener('click', () => {
        const container = fsContent.querySelector('.embed-container');
        if (container) {
          const img = container.querySelector('img');
          if (img) img.src = src;
        }
        fsThumbs.querySelectorAll('img').forEach(im => im.classList.remove('active'));
        t.classList.add('active');
        currentIndex = i;
      });
      fsThumbs.appendChild(t);
    });
  }

  overlay.removeAttribute('aria-hidden');
  overlay.classList.add('open');

  if (fsClose) fsClose.setAttribute('tabindex', '0');

  setBackgroundInert(true);
  window.requestAnimationFrame(() => { try { fsInner.focus(); } catch (e) { } });

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', overlayKeyHandler);
}

function overlayKeyHandler(e) {
  if (e.key === 'Escape') closeOverlay();
}

export function closeOverlay() {
  if (!overlay || !overlay.classList.contains('open')) return;

  const safe = document.getElementById('menu-toggle') || document.querySelector('.nav-link') || document.body;
  try { safe.focus(); } catch (e) { }

  if (fsClose) fsClose.setAttribute('tabindex', '-1');

  setBackgroundInert(false);

  const split = overlay.querySelector('.fs-split');
  if (split) {
    const header = split.querySelector('.fs-header');
    if (header) {
      fsContent.insertBefore(header, fsContent.firstChild);
    }
    split.remove();
  }

  overlay.classList.remove('open');
  overlay.classList.remove('vertical');
  overlay.setAttribute('aria-hidden', 'true');

  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';

  if (fsMedia) fsMedia.innerHTML = '';
  if (fsThumbs) fsThumbs.innerHTML = '';
  if (fsBuiltWith) fsBuiltWith.innerHTML = '';
  if (fsTitle) fsTitle.textContent = '';
  if (fsDesc) fsDesc.textContent = '';

  currentSlides = [];
  currentIndex = 0;
  currentProject = null;

  document.removeEventListener('keydown', overlayKeyHandler);
}
