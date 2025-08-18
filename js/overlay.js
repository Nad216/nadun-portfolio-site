import {
    parseYouTubeId,
    youtubeWatchUrlFromLink,
    youtubeThumbnailUrl,
    drivePreviewUrl,
    generateLogosHTML,
    normalizeDriveImage,
    looksLikeImgurUrl,
    parseImgurId,
    imgurDirectImageUrl,
    imgurThumbnailUrl
} from './utils.js';

let overlay, fsInner, fsContent, fsTitle, fsDesc, fsMedia, fsThumbs, fsClose, fsBuiltWith, fsActions;
let currentSlides = [];
let currentIndex = 0;
let currentProject = null;

function ensureOverlayExists() {
    if (overlay) return overlay;
    overlay = document.getElementById('fullscreen-overlay');
    if (overlay) {
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

function looksLikeDriveUrl(url) {
    return /drive\.google\.com|\/file\/d\/|[?&]id=/.test(String(url || ''));
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

        // ---------- IMAGE / GALLERY ----------
        if ((media.type === 'images' || media.type === 'gallery') && Array.isArray(media.images) && media.images.length) {
            // Check for Drive or Imgur images
            const anyDrive = media.images.some(i => looksLikeDriveUrl(i) || media.source === 'drive');
            const anyImgur = media.images.some(i => looksLikeImgurUrl(i) || media.source === 'imgur');

            if (anyDrive) {
                // Keep existing Drive handling exactly the same
                const posterCandidate = project.thumb || project.image || 'assets/placeholder.jpg';
                const safePoster = looksLikeDriveUrl(posterCandidate) ? 'assets/placeholder.jpg' : normalizeDriveImage(posterCandidate);

                const container = document.createElement('div');
                container.className = `embed-container ${cls}`;
                container.style.minHeight = '140px';

                const posterImg = document.createElement('img');
                posterImg.alt = project.title || '';
                posterImg.loading = 'lazy';
                posterImg.src = safePoster;
                container.appendChild(posterImg);

                // Add an explicit "Open gallery" button — opens the project's media.link (Drive preview)
                const openBtn = document.createElement('button');
                openBtn.type = 'button';
                openBtn.className = 'fs-play-button';
                openBtn.setAttribute('aria-label', 'Open gallery preview');
                openBtn.textContent = '▶';
                container.appendChild(openBtn);

                openBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const preview = media.link || project.link || '';
                    if (preview) {
                        // open preview in new tab — avoids embedding Drive HTML in <img>
                        window.open(preview, '_blank', 'noopener');
                    }
                });

                wrapper.appendChild(container);
                // return slides unchanged (we will make thumbnail clicks open preview)
                return { node: wrapper, slides: media.images.slice() };

            } else if (anyImgur) {
                // NEW: Handle Imgur galleries - convert URLs to direct image URLs
                const convertedImages = media.images.map(url => {
                    if (looksLikeImgurUrl(url)) {
                        return imgurDirectImageUrl(url);
                    }
                    return url;
                });

                const container = document.createElement('div');
                container.className = `embed-container ${cls}`;
                container.style.minHeight = '140px';

                const img = document.createElement('img');
                img.src = convertedImages[0];
                img.alt = project.title || '';
                img.loading = 'lazy';
                container.appendChild(img);

                wrapper.appendChild(container);
                return { node: wrapper, slides: convertedImages };

            } else {
                // not drive-hosted or imgur — safe to embed
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
        }

        // ---------- LOCAL VIDEO FILE ----------
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
            video.style.objectFit = 'contain';
            container.appendChild(video);
            wrapper.appendChild(container);
            return { node: wrapper, slides: [] };
        }

        // ---------- YOUTUBE ----------
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
            img.style.objectFit = 'contain';
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

        // ---------- DRIVE preview (video / preview) ----------
        if (media.source === 'drive' || /drive\.google/.test(media.link || project.link || '')) {
            const link = media.link || project.link || '';
            const preview = drivePreviewUrl(link) || link;
            // try to normalize poster, but avoid embedding drive images directly if they are not safe
            const posterCandidate = project.thumb || project.image || 'assets/placeholder.jpg';
            const safePoster = looksLikeDriveUrl(posterCandidate) ? 'assets/placeholder.jpg' : normalizeDriveImage(posterCandidate);

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
            img.style.objectFit = 'contain';
            img.src = safePoster;
            container.appendChild(img);

            const play = document.createElement('button');
            play.type = 'button';
            play.className = 'fs-play-button';
            play.setAttribute('aria-label', 'Open preview');
            play.textContent = '⤓';
            container.appendChild(play);

            const insertDriveIframe = () => {
                if (/\/file\/d\/[a-zA-Z0-9_-]+\/preview/.test(preview) || /\/uc\?export=view/.test(preview)) {
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

        // ---------- FALLBACK IMAGE ----------
        const container = document.createElement('div');
        container.className = `embed-container ${cls}`;
        container.style.minHeight = '120px';
        const img = document.createElement('img');
        img.alt = project.title || '';
        img.loading = 'lazy';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
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

    // remove any previous split
    const existingSplit = overlay.querySelector('.fs-split');
    if (existingSplit) existingSplit.remove();

    if (fsMedia) fsMedia.innerHTML = '';
    if (fsThumbs) fsThumbs.innerHTML = '';
    if (fsBuiltWith) fsBuiltWith.innerHTML = '';

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
        else if (/imgur\.com/.test(link)) source = 'imgur';
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
        const isDesktop = window.innerWidth >= 900;
        if (header && isDesktop) {
            header.parentElement && header.parentElement.removeChild(header);
            split.appendChild(header);
        }

        split.appendChild(res.node);
        fsContent.appendChild(split);

        if (!isDesktop) {
            const embedContainer = split.querySelector('.embed-container') || split.querySelector('div');
            function setEmbedMaxHeight() {
                const headerEl = fsContent.querySelector('.fs-header');
                const footerEl = overlay.querySelector('.fs-footer');
                const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
                const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
                const padding = 48;
                const avail = Math.max(160, window.innerHeight - headerH - footerH - padding);
                if (embedContainer) {
                    embedContainer.style.maxHeight = avail + 'px';
                    embedContainer.style.height = 'auto';
                }
            }
            setEmbedMaxHeight();
            overlay._verticalResizeHandler = setEmbedMaxHeight;
            window.addEventListener('resize', overlay._verticalResizeHandler);
        }

    } else {
        overlay.classList.remove('vertical');
        if (fsMedia) fsMedia.appendChild(res.node);
    }

    // Build thumbnails: handle Drive and Imgur links
    if (currentSlides.length) {
        currentSlides.forEach((src, i) => {
            const t = document.createElement('img');
            const isDriveSlide = looksLikeDriveUrl(src) || (project.media && project.media.source === 'drive');
            const isImgurSlide = looksLikeImgurUrl(src) || (project.media && project.media.source === 'imgur');

            if (isDriveSlide) {
                // use placeholder or a normalized safe thumb if available
                const safeThumb = (project.thumb && !looksLikeDriveUrl(project.thumb)) ? project.thumb : 'assets/placeholder.jpg';
                t.src = safeThumb;
                t.setAttribute('data-drive-link', src);
            } else if (isImgurSlide) {
                // NEW: Handle Imgur thumbnails
                t.src = imgurThumbnailUrl(src);
                t.setAttribute('data-imgur-link', src);
            } else {
                t.src = src;
            }

            t.loading = 'lazy';
            t.alt = `${project.title || ''} ${i + 1}`;
            if (i === 0) t.classList.add('active');

            t.addEventListener('click', () => {
                const container = fsContent.querySelector('.embed-container');
                if (!container) return;
                const img = container.querySelector('img');

                const driveLink = t.getAttribute('data-drive-link');
                const imgurLink = t.getAttribute('data-imgur-link');

                if (driveLink) {
                    // open drive preview in a new tab instead of trying to set the <img src>
                    const preview = driveLink;
                    window.open(preview, '_blank', 'noopener');
                    return;
                } else if (imgurLink) {
                    // NEW: Handle Imgur - show the direct image
                    const directUrl = imgurDirectImageUrl(imgurLink);
                    if (img) {
                        img.src = directUrl;
                    } else {
                        container.innerHTML = '';
                        const newImg = document.createElement('img');
                        newImg.src = directUrl;
                        newImg.alt = project.title || '';
                        newImg.style.width = '100%';
                        newImg.style.height = '100%';
                        newImg.style.objectFit = 'contain';
                        container.appendChild(newImg);
                    }
                } else {
                    if (img) {
                        img.src = src;
                    } else {
                        // fallback: replace embed-container contents with a simple image
                        container.innerHTML = '';
                        const newImg = document.createElement('img');
                        newImg.src = src;
                        newImg.alt = project.title || '';
                        container.appendChild(newImg);
                    }
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

    // remove split and restore header to original spot
    const split = overlay.querySelector('.fs-split');
    if (split) {
        const header = split.querySelector('.fs-header');
        if (header) {
            fsContent.insertBefore(header, fsContent.firstChild);
        }
        split.remove();
    }

    // remove resize handler if set
    if (overlay && overlay._verticalResizeHandler) {
        try { window.removeEventListener('resize', overlay._verticalResizeHandler); } catch (e) { }
        overlay._verticalResizeHandler = null;
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