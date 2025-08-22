import {
    parseYouTubeId,
    youtubeWatchUrlFromLink,
    youtubeThumbnailUrl,
    drivePreviewUrl,
    generateLogosHTML,
    normalizeDriveImage,
    looksLikeImgurUrl,
    imgurDirectImageUrl,
    imgurThumbnailUrl
} from './utils.js';

let overlay, fsInner, fsContent, fsTitle, fsDesc, fsMedia, fsThumbs, fsClose, fsBuiltWith, fsActions, fsDate;
let currentSlides = [];
let currentIndex = 0;
let currentProject = null;

/* helper to format date input (ISO string / timestamp / Date) */
function formatDate(input) {
    if (!input && input !== 0) return '';
    const d = (input instanceof Date) ? input : new Date(input);
    if (isNaN(d.getTime())) return String(input);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

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
            <p class="fs-date built-with-label"></p>
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
    fsDate = overlay.querySelector('.fs-date');
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

function createImgEl(src, alt = '') {
    const i = document.createElement('img');
    i.alt = alt;
    i.loading = 'lazy';
    i.style.width = '100%';
    i.style.height = '100%';
    i.style.objectFit = 'contain';
    i.src = src;
    return i;
}

/**
 * playSlide(slide, container)
 * slide: {type:'video'|'image'|'drive-image', ...}
 * container: embed-container DOM element (will be cleared/filled)
 */
function playSlide(slide, container) {
    if (!slide || !container) return;

    // clear and insert appropriate player / image
    container.innerHTML = '';
    if (slide.type === 'video') {
        const src = slide.link || slide.src || '';
        const source = slide.source || slide.provider || 'local';

        // local files -> direct <video>
        if ((source === 'local' || /\.mp4|\.webm|\.ogg$/i.test(src)) && !looksLikeDriveUrl(src)) {
            const video = document.createElement('video');
            video.controls = true;
            video.preload = 'metadata';
            video.src = src;
            if (slide.poster) video.poster = slide.poster;
            video.setAttribute('playsinline', '');
            video.autoplay = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            container.appendChild(video);
            // try to play (may be blocked by autoplay policies)
            try { video.play().catch(() => { }); } catch (e) { }
            return;
        }

        // YouTube
        if (source === 'youtube' || /youtube/.test(src)) {
            const id = parseYouTubeId(src);
            if (!id) {
                const w = youtubeWatchUrlFromLink(src) || src;
                if (w) window.open(w, '_blank', 'noopener');
                return;
            }
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
            iframe.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen', '');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = '0';
            container.appendChild(iframe);
            return;
        }

        // Drive preview iframe (drive preview links / uc?export=view)
        if (looksLikeDriveUrl(src) || /\/file\/d\/[A-Za-z0-9_-]+\/preview/.test(src) || /\/uc\?export=view/.test(src)) {
            const preview = drivePreviewUrl(src) || src;
            if (/\/file\/d\/[A-Za-z0-9_-]+\/preview/.test(preview) || /\/uc\?export=view/.test(preview)) {
                const iframe = document.createElement('iframe');
                iframe.src = preview;
                iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
                iframe.setAttribute('allowfullscreen', '');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = '0';
                container.appendChild(iframe);
                return;
            } else {
                if (src) window.open(src, '_blank', 'noopener');
                return;
            }
        }

        // fallback: open link in new tab
        if (src) window.open(src, '_blank', 'noopener');
        return;
    }

    if (slide.type === 'image') {
        const newImg = createImgEl(slide.src || slide);
        container.appendChild(newImg);
        return;
    }

    if (slide.type === 'drive-image') {
        // open preview in new tab because embedding may CORB-block
        const preview = slide.link || slide.src;
        if (preview) window.open(preview, '_blank', 'noopener');
        return;
    }

    // fallback: treat as image string
    const fallbackImg = createImgEl(slide.src || slide);
    container.appendChild(fallbackImg);
}

/**
 * createMediaNodeWithoutIframe(project)
 * - returns { node, slides } where slides is array of slide objects:
 *   - { type:'video', source:'drive'|'youtube'|'local', link:'...', poster:'...' }
 *   - { type:'image', src:'...' }
 *   - { type:'drive-image', link:'...' } (will open in new tab)
 */
function createMediaNodeWithoutIframe(project) {
    try {
        const media = project.media || {};
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.maxWidth = '1100px';
        wrapper.style.boxSizing = 'border-box';

        const format = (media.format || project.format || 'horizontal');
        const cls = (format === 'vertical') ? 'embed-9-16' : (format === 'square' ? 'embed-1-1' : 'embed-16-9');

        // helper: convert a user-provided src to a "safe" image src if possible
        const normalizePotentialImageSrc = (src) => {
            if (!src) return src;
            if (looksLikeImgurUrl(src)) return imgurDirectImageUrl(src);
            if (looksLikeDriveUrl(src)) {
                // do NOT embed Drive images (CORB risk) — caller should treat drive images as drive-image
                return normalizeDriveImage(src); // may still be blocked, we'll mark as drive-image where appropriate
            }
            return src;
        };

        // ---------- MIXED (video + images) ----------
        if (media.type === 'mixed' && (Array.isArray(media.images) || media.video)) {
            const images = Array.isArray(media.images) ? media.images.slice() : [];
            const videoObj = media.video || null;
            const posterCandidate = project.thumb || project.image || images[0] || 'assets/placeholder.jpg';
            const safePoster = looksLikeDriveUrl(posterCandidate) ? 'assets/placeholder.jpg' : normalizePotentialImageSrc(posterCandidate);

            const container = document.createElement('div');
            container.className = `embed-container ${cls}`;
            container.style.minHeight = '180px';
            container.style.position = 'relative';
            container.style.background = '#000';
            container.style.cursor = 'pointer';

            // main poster img
            const mainImg = document.createElement('img');
            mainImg.alt = project.title || '';
            mainImg.loading = 'lazy';
            mainImg.style.width = '100%';
            mainImg.style.height = '100%';
            mainImg.style.objectFit = 'contain';
            mainImg.src = safePoster;
            container.appendChild(mainImg);

            // If there's a video, show a play button
            if (videoObj && (videoObj.link || videoObj.source || videoObj.src)) {
                const play = document.createElement('button');
                play.type = 'button';
                play.className = 'fs-play-button';
                play.setAttribute('aria-label', 'Play video');
                play.textContent = '▶';
                container.appendChild(play);

                // prepare slide object
                const videoSlide = {
                    type: 'video',
                    source: videoObj.source || (looksLikeDriveUrl(videoObj.link || '') ? 'drive' : (/(youtube|youtu\.be)/.test(String(videoObj.link || '')) ? 'youtube' : 'local')),
                    link: videoObj.link || videoObj.src || '',
                    poster: safePoster
                };

                // wire play
                play.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playSlide(videoSlide, container);
                });

                // clicking the poster should also play the video
                container.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playSlide(videoSlide, container);
                });

                // build slides array: video first, then images
                const slides = [videoSlide].concat(images.map(imgSrc => {
                    if (looksLikeDriveUrl(imgSrc)) return { type: 'drive-image', link: imgSrc };
                    if (looksLikeImgurUrl(imgSrc)) return { type: 'image', src: imgurDirectImageUrl(imgSrc) };
                    return { type: 'image', src: normalizePotentialImageSrc(imgSrc) };
                }));

                wrapper.appendChild(container);
                return { node: wrapper, slides };
            } else {
                // no video, treat as regular gallery fallback (first image shown)
                const slides = images.map(imgSrc => {
                    if (looksLikeDriveUrl(imgSrc)) return { type: 'drive-image', link: imgSrc };
                    if (looksLikeImgurUrl(imgSrc)) return { type: 'image', src: imgurDirectImageUrl(imgSrc) };
                    return { type: 'image', src: normalizePotentialImageSrc(imgSrc) };
                });

                if (slides.length) {
                    // if first slide is an image, set mainImg to that image
                    const first = slides[0];
                    if (first.type === 'image') mainImg.src = first.src;
                    wrapper.appendChild(container);
                    return { node: wrapper, slides };
                } else {
                    // nothing in mixed, fallback to placeholder
                    wrapper.appendChild(container);
                    return { node: wrapper, slides: [] };
                }
            }
        }

        // ---------- IMAGE / GALLERY ----------
        if ((media.type === 'images' || media.type === 'gallery') && Array.isArray(media.images) && media.images.length) {
            const images = media.images.slice();
            // if any image looks like Drive, mark as drive-image slide to avoid embedding
            const slides = images.map(imgSrc => {
                if (looksLikeDriveUrl(imgSrc)) return { type: 'drive-image', link: imgSrc };
                if (looksLikeImgurUrl(imgSrc)) return { type: 'image', src: imgurDirectImageUrl(imgSrc) };
                return { type: 'image', src: normalizePotentialImageSrc(imgSrc) };
            });

            const container = document.createElement('div');
            container.className = `embed-container ${cls}`;
            container.style.minHeight = '140px';

            // display first slide if it's an image (drive-image opens in new tab)
            const first = slides[0];
            if (first && first.type === 'image') {
                const imgEl = createImgEl(first.src, project.title || '');
                container.appendChild(imgEl);
            } else {
                // show placeholder and let thumbnails open preview/new tab
                const poster = project.thumb || project.image || 'assets/placeholder.jpg';
                const safePoster = looksLikeDriveUrl(poster) ? 'assets/placeholder.jpg' : normalizePotentialImageSrc(poster);
                container.appendChild(createImgEl(safePoster, project.title || ''));
            }

            wrapper.appendChild(container);
            return { node: wrapper, slides };
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
            const posterCandidate = projectthumb || project.image || 'assets/placeholder.jpg';
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

    // populate date under description (small text)
    if (fsDate) {
        if (project.dateCreated) {
            fsDate.textContent = `Created: ${formatDate(project.dateCreated)}`;
        } else {
            fsDate.textContent = '';
        }
    }

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

    // --- Add left/right navigation buttons if more than 1 slide ---
    let navLeftBtn = null, navRightBtn = null;
    if (currentSlides.length > 1 && fsMedia) {
        navLeftBtn = document.createElement('button');
        navLeftBtn.className = 'fs-nav-btn fs-nav-left';
        navLeftBtn.setAttribute('aria-label', 'Previous');
        navLeftBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M15.5 19l-7-7 7-7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        navRightBtn = document.createElement('button');
        navRightBtn.className = 'fs-nav-btn fs-nav-right';
        navRightBtn.setAttribute('aria-label', 'Next');
        navRightBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8.5 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        // Navigation logic
        navLeftBtn.onclick = () => {
            currentIndex = (currentIndex - 1 + currentSlides.length) % currentSlides.length;
            showSlide(currentIndex);
        };
        navRightBtn.onclick = () => {
            currentIndex = (currentIndex + 1) % currentSlides.length;
            showSlide(currentIndex);
        };

        // Insert buttons into media area
        fsMedia.style.position = 'relative';
        fsMedia.appendChild(navLeftBtn);
        fsMedia.appendChild(navRightBtn);
    }

    // Helper to show a slide by index
    function showSlide(idx) {
        const slide = currentSlides[idx];
        const container = fsContent.querySelector('.embed-container');
        if (!container) return;
        if (typeof slide === 'string') {
            container.innerHTML = '';
            container.appendChild(createImgEl(slide, project.title || ''));
        } else if (slide.type === 'video') {
            playSlide(slide, container);
        } else if (slide.type === 'image') {
            container.innerHTML = '';
            container.appendChild(createImgEl(slide.src, project.title || ''));
        } else if (slide.type === 'drive-image') {
            const preview = slide.link || slide.src;
            if (preview) window.open(preview, '_blank', 'noopener');
        }
        // Update active thumb
        fsThumbs.querySelectorAll('img').forEach((im, i) => {
            if (i === idx) im.classList.add('active'); else im.classList.remove('active');
        });
        currentIndex = idx;
    }

    const fmt = (project.media && project.media.format) || project.format || 'horizontal';
    const isVertical = fmt === 'vertical';

    let embedContainer = null;

    if (isVertical) {
        overlay.classList.add('vertical');
        if (fsMedia) fsMedia.innerHTML = '';

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

        embedContainer = split.querySelector('.embed-container');

        // --- FIX: Remove aspect-ratio class and set height to match split ---
        function setEmbedMaxHeight() {
            if (!embedContainer) return;
            const headerEl = fsContent.querySelector('.fs-header');
            const footerEl = overlay.querySelector('.fs-footer');
            const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
            const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
            const padding = 48;
            const avail = Math.max(160, window.innerHeight - headerH - footerH - padding);
            embedContainer.classList.remove('embed-9-16','embed-16-9','embed-1-1');
            embedContainer.style.paddingBottom = '0';
            embedContainer.style.height = avail + 'px';
            embedContainer.style.maxHeight = avail + 'px';
        }

        // Initial calculation after overlay is visible
        window.requestAnimationFrame(() => {
            setEmbedMaxHeight();
        });
        overlay._verticalResizeHandler = setEmbedMaxHeight;
        window.addEventListener('resize', overlay._verticalResizeHandler);
    } else {
        overlay.classList.remove('vertical');
        if (fsMedia) fsMedia.appendChild(res.node);
    }

    // Build thumbnails (support slide objects and strings)
    if (currentSlides.length) {
        currentSlides.forEach((slide, i) => {
            const t = document.createElement('img');
            let thumbSrc = 'assets/placeholder.jpg';
            // determine thumbnail src / data attributes
            if (typeof slide === 'string') {
                // old-style string — assume image
                thumbSrc = slide;
                t.src = thumbSrc;
            } else {
                if (slide.type === 'video') {
                    // for video thumbnails, use poster if available, else use project's thumb
                    thumbSrc = slide.poster || project.thumb || project.image || 'assets/placeholder.jpg';
                    // if youtube, try youtube thumbnail
                    if (slide.source === 'youtube' || /youtube/.test(slide.link || '')) {
                        thumbSrc = youtubeThumbnailUrl(slide.link || '') || thumbSrc;
                    }
                    t.src = thumbSrc;
                    t.setAttribute('data-slide-type', 'video');
                } else if (slide.type === 'image') {
                    thumbSrc = slide.src;
                    t.src = thumbSrc;
                    // preload image to make instant swap
                    try { const im = new Image(); im.src = thumbSrc; } catch (e) { }
                } else if (slide.type === 'drive-image') {
                    // show safe thumbnail (project.thumb or placeholder) and mark data-drive-link
                    const safeThumb = (project.thumb && !looksLikeDriveUrl(project.thumb)) ? project.thumb : 'assets/placeholder.jpg';
                    t.src = safeThumb;
                    t.setAttribute('data-drive-link', slide.link || slide.src || '');
                } else {
                    thumbSrc = slide.src || slide.link || 'assets/placeholder.jpg';
                    t.src = thumbSrc;
                }
            }

            t.loading = 'lazy';
            t.alt = `${project.title || ''} ${i + 1}`;
            if (i === 0) t.classList.add('active');

            t.addEventListener('click', () => {
                const container = fsContent.querySelector('.embed-container');
                if (!container) return;

                // remove active from all thumbs and set this one
                fsThumbs.querySelectorAll('img').forEach(im => im.classList.remove('active'));
                t.classList.add('active');
                currentIndex = i;

                // handle different slide shapes
                const s = slide;
                if (typeof s === 'string') {
                    // string image - set src
                    const img = container.querySelector('img');
                    if (img) {
                        img.src = s;
                    } else {
                        container.innerHTML = '';
                        container.appendChild(createImgEl(s, project.title || ''));
                    }
                    return;
                }

                if (s.type === 'drive-image') {
                    // open drive image preview in new tab
                    const preview = s.link || s.src;
                    if (preview) window.open(preview, '_blank', 'noopener');
                    return;
                }

                if (s.type === 'video') {
                    // play video inline (or via iframe)
                    playSlide(s, container);
                    // Remove aspect-ratio class for video/iframe on mobile vertical overlay
                    if (window.innerWidth < 900 && overlay.classList.contains('vertical')) {
                        container.classList.remove('embed-9-16','embed-16-9','embed-1-1');
                        container.style.paddingBottom = '0';
                        window.requestAnimationFrame(() => {
                            const headerEl = fsContent.querySelector('.fs-header');
                            const footerEl = overlay.querySelector('.fs-footer');
                            const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
                            const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
                            const padding = 48;
                            const avail = Math.max(160, window.innerHeight - headerH - footerH - padding);
                            container.style.height = avail + 'px';
                            container.style.maxHeight = avail + 'px';
                        });
                    }
                    return;
                }

                if (s.type === 'image') {
                    // display image
                    const img = container.querySelector('img');
                    if (img) {
                        img.src = s.src;
                    } else {
                        container.innerHTML = '';
                        container.appendChild(createImgEl(s.src, project.title || ''));
                    }
                    return;
                }

                // fallback: try to use link/src
                if (s.link || s.src) {
                    const img = container.querySelector('img');
                    const url = s.src || s.link;
                    if (s.type === 'image' || /\.(jpe?g|png|gif|webp|avif)$/i.test(url)) {
                        if (img) img.src = url; else { container.innerHTML = ''; container.appendChild(createImgEl(url)); }
                    } else {
                        // unknown type -> open
                        window.open(url, '_blank', 'noopener');
                    }
                }
            });

            fsThumbs.appendChild(t);
        });
    }

    overlay.removeAttribute('aria-hidden');
    overlay.classList.add('open');

    if (fsClose) fsClose.setAttribute('tabindex', '0');

    setBackgroundInert(true);
    window.requestAnimationFrame(() => {
        try { fsInner.focus(); } catch (e) { }
        // Recalculate embed height after overlay is visible
        if (isVertical && embedContainer) {
            const headerEl = fsContent.querySelector('.fs-header');
            const footerEl = overlay.querySelector('.fs-footer');
            const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
            const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
            const padding = 48;
            const avail = Math.max(160, window.innerHeight - headerH - footerH - padding);
            embedContainer.style.height = avail + 'px';
            embedContainer.style.maxHeight = avail + 'px';
        }
    });

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
    if (fsDate) fsDate.textContent = '';

    currentSlides = [];
    currentIndex = 0;
    currentProject = null;

    document.removeEventListener('keydown', overlayKeyHandler);
}
