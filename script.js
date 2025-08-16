/* =========================
   script.js — robust overlay fix (MutationObserver + focus guard)
   Drop-in replacement — overwrite your existing script.js
   ========================= */

const DEBUG = true; // set to false later

function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(fn, 0);
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

onReady(() => {
    /* ---------- NAV / SECTION HIGHLIGHT ---------- */
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.panel');

    function updateActiveLink() {
        let index = sections.length;
        while (--index >= 0) {
            const sectionTop = sections[index].getBoundingClientRect().top;
            if (sectionTop <= window.innerHeight / 2) {
                navLinks.forEach(link => link.classList.remove('active'));
                if (navLinks[index]) navLinks[index].classList.add('active');
                break;
            }
        }
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.addEventListener('scroll', updateActiveLink);
    window.addEventListener('load', updateActiveLink);

    /* ---------- Built-with helper ---------- */
    function slugifyForLogo(name) {
        return String(name || '').trim().replace(/\s+/g, '').replace(/[^\w\-\.]/g, '');
    }
    function generateLogosHTML(softwareList) {
        if (!softwareList || !softwareList.length) return '';
        return `
      <div class="built-with-logos">
        <span class="built-with-label">Built with:</span>
        ${softwareList.map(software =>
            `<img src="assets/logos/${slugifyForLogo(software)}.png" alt="${software}" title="${software}" loading="lazy" />`
        ).join('')}
      </div>
    `;
    }

    /* ---------- Mobile menu ---------- */
    const menuBtn = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            const isOpen = mobileMenu.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', String(isOpen));
        });
        document.querySelectorAll('#mobile-menu .nav-link').forEach(a => {
            a.addEventListener('click', () => {
                mobileMenu.classList.remove('open');
                menuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ---------- Helpers for YouTube / Drive / Instagram ---------- */
    function parseYouTubeId(url) {
        if (!url) return null;
        const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{7,})/);
        return m ? m[1] : null;
    }
    function youtubeWatchUrlFromLink(link) {
        const id = parseYouTubeId(link);
        return id ? `https://www.youtube.com/watch?v=${id}` : link;
    }
    function youtubeThumbnailUrl(link) {
        const id = parseYouTubeId(link);
        if (!id) return '';
        return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    function drivePreviewUrl(link) {
        if (!link) return link;
        const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
        const q = link.match(/id=([a-zA-Z0-9_-]+)/);
        if (q) return `https://drive.google.com/file/d/${q[1]}/preview`;
        return link;
    }
    function instagramEmbedUrl(link) {
        if (!link) return link;
        const m = link.match(/instagram\.com\/p\/([^\/\?\s]+)/);
        return m ? `https://www.instagram.com/p/${m[1]}/` : link;
    }

    /* ---------- Overlay singleton + focus guard + mutation observer ---------- */
    function ensureOverlayExists() {
        let overlay = document.getElementById('fullscreen-overlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'fullscreen-overlay';
        overlay.className = 'fullscreen-overlay';
        // start hidden via aria-hidden (your CSS already hides [aria-hidden="true"])
        overlay.setAttribute('aria-hidden', 'true');

        overlay.innerHTML = `
      <div class="fs-inner" role="dialog" aria-label="Project detail" tabindex="-1">
        <button class="fs-close" aria-label="Close">✕</button>
        <div class="fs-content">
          <header class="fs-header">
            <h2 class="fs-title"></h2>
            <p class="fs-desc"></p>
            <div class="fs-builtwith"></div>
            <div class="fs-actions">
              <button class="fs-open-original" type="button">Open original</button>
            </div>
          </header>
          <main class="fs-media" aria-live="polite"></main>
          <footer class="fs-footer"><div class="fs-thumbs"></div></footer>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);

        // close button non-focusable while hidden
        const closeBtn = overlay.querySelector('.fs-close');
        if (closeBtn) closeBtn.setAttribute('tabindex', '-1');

        // Focus guard: blur anything trying to focus inside while overlay is aria-hidden
        overlay.addEventListener('focusin', (ev) => {
            if (overlay.getAttribute('aria-hidden') === 'true') {
                try { ev.target.blur(); } catch (e) { }
                console.warn('[projects] prevented focus inside hidden overlay for', ev.target);
            }
        });

        // MutationObserver: if some other code incorrectly toggles aria-hidden while overlay is open,
        // fix it immediately (robust against other scripts).
        const mo = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.attributeName === 'aria-hidden') {
                    const val = overlay.getAttribute('aria-hidden');
                    console.warn('[projects] MutationObserver noticed aria-hidden change ->', val);
                    // if overlay is open but aria-hidden has been set to "true" -> remove the attribute
                    if (overlay.classList.contains('open') && val === 'true') {
                        console.warn('[projects] overlay is open but aria-hidden="true" — forcing removal to avoid hiding focused descendants.');
                        overlay.removeAttribute('aria-hidden');
                    }
                }
            });
        });
        mo.observe(overlay, { attributes: true });

        // defensive: if an element inside overlay somehow already had focus, blur it
        try {
            if (overlay.contains(document.activeElement)) document.activeElement.blur();
        } catch (e) { }

        return overlay;
    }

    const overlay = ensureOverlayExists();
    const fsInner = overlay.querySelector('.fs-inner');
    const fsTitle = overlay.querySelector('.fs-title');
    const fsDesc = overlay.querySelector('.fs-desc');
    const fsMedia = overlay.querySelector('.fs-media');
    const fsThumbs = overlay.querySelector('.fs-thumbs');
    const fsClose = overlay.querySelector('.fs-close');
    const fsBuiltWith = overlay.querySelector('.fs-builtwith');
    const fsOpenOriginal = overlay.querySelector('.fs-open-original');

    if (fsClose) fsClose.addEventListener('click', () => closeOverlay());

    let currentSlides = [];
    let currentIndex = 0;
    let currentProject = null;

    /* ---------- Media builder (lazy insert) - unchanged logic, debug logs kept ---------- */
    function createMediaNodeWithoutIframe(project) {
        try {
            console.log('[projects] createMediaNodeWithoutIframe for', project && project.title);
            const media = project.media || {};
            const wrapper = document.createElement('div');

            const format = (media.format || project.format || 'horizontal');
            const cls = (format === 'vertical') ? 'embed-9-16' : (format === 'square' ? 'embed-1-1' : 'embed-16-9');

            // images
            if ((media.type === 'images' || media.type === 'gallery') && Array.isArray(media.images) && media.images.length) {
                const container = document.createElement('div');
                container.className = `embed-container ${cls}`;
                if (DEBUG) container.style.minHeight = '140px';
                const img = document.createElement('img');
                img.src = media.images[0];
                img.alt = project.title || '';
                img.loading = 'lazy';
                container.appendChild(img);
                wrapper.appendChild(container);
                return { node: wrapper, slides: media.images.slice() };
            }

            // local video
            if ((media.source === 'local' || /\.mp4|\.webm|\.ogg$/i.test(media.link || project.link || '')) && (media.link || project.link)) {
                const src = media.link || project.link;
                const container = document.createElement('div');
                container.className = `embed-container ${cls}`;
                if (DEBUG) container.style.minHeight = '180px';
                const video = document.createElement('video');
                video.controls = true;
                video.preload = 'metadata';
                video.src = src;
                video.style.background = '#000';
                video.setAttribute('playsinline', '');
                video.autoplay = false;
                container.appendChild(video);
                wrapper.appendChild(container);
                return { node: wrapper, slides: [] };
            }

            // YouTube (poster -> create iframe when user clicks)
            if (media.source === 'youtube' || /youtube/.test(media.link || project.link || '')) {
                const link = (media.link || project.link || '');
                const id = parseYouTubeId(link);
                const thumbUrl = project.thumb || youtubeThumbnailUrl(link) || project.image || 'assets/placeholder.jpg';

                const container = document.createElement('div');
                container.className = `embed-container ${cls}`;
                if (DEBUG) container.style.minHeight = '180px';
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
                // style omitted for brevity; same as before
                play.textContent = '▶';
                container.appendChild(play);

                const insertYouTubeIframe = () => {
                    console.log('[projects] insertYouTubeIframe called for', project.title, id);
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

                    setTimeout(() => {
                        const rect = container.getBoundingClientRect();
                        if (rect.width === 0 || rect.height === 0) {
                            console.warn('[projects] iframe inserted but zero size', project.title);
                            const note = document.createElement('div');
                            note.style.color = '#fff';
                            note.textContent = 'If the player doesn’t appear, click "Open original".';
                            wrapper.appendChild(note);
                        } else {
                            console.log('[projects] iframe appears ok', project.title, rect.width, rect.height);
                        }
                    }, 600);
                };

                play.addEventListener('click', (e) => { e.stopPropagation(); insertYouTubeIframe(); });
                container.addEventListener('click', (e) => { e.stopPropagation(); insertYouTubeIframe(); });

                wrapper.appendChild(container);
                return { node: wrapper, slides: [] };
            }

            // Drive (poster -> insert preview iframe)
            if (media.source === 'drive' || /drive\.google/.test(media.link || project.link || '')) {
                const link = media.link || project.link || '';
                const preview = drivePreviewUrl(link) || link;
                const thumbUrl = project.thumb || project.image || 'assets/placeholder.jpg';

                const container = document.createElement('div');
                container.className = `embed-container ${cls}`;
                if (DEBUG) container.style.minHeight = '180px';
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
                    console.log('[projects] insertDriveIframe called for', project.title, preview);
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
                        setTimeout(() => {
                            const rect = container.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0) {
                                console.warn('[projects] drive iframe inserted but zero size', project.title);
                                const note = document.createElement('div');
                                note.style.color = '#fff';
                                note.textContent = 'If the preview doesn’t appear, click "Open original".';
                                wrapper.appendChild(note);
                            } else {
                                console.log('[projects] drive iframe appears ok', project.title, rect.width, rect.height);
                            }
                        }, 600);
                    } else {
                        if (link) window.open(link, '_blank', 'noopener');
                    }
                };

                play.addEventListener('click', (e) => { e.stopPropagation(); insertDriveIframe(); });
                container.addEventListener('click', (e) => { e.stopPropagation(); insertDriveIframe(); });

                wrapper.appendChild(container);
                return { node: wrapper, slides: [] };
            }

            // fallback poster
            const container = document.createElement('div');
            container.className = `embed-container ${cls}`;
            if (DEBUG) container.style.minHeight = '120px';
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
            console.error('createMediaNodeWithoutIframe error', err);
            const fallback = document.createElement('div');
            fallback.textContent = 'Preview unavailable';
            return { node: fallback, slides: [] };
        }
    }

    /* ---------- Accessibility helpers ---------- */
    function setBackgroundInert(state) {
        const main = document.querySelector('.main-content');
        if (!main) return;
        if (state) {
            try { main.setAttribute('inert', ''); } catch (e) { /* ignore */ }
            main.setAttribute('aria-hidden', 'true');
        } else {
            try { main.removeAttribute('inert'); } catch (e) { /* ignore */ }
            main.removeAttribute('aria-hidden');
        }
    }

    /* ---------- Open / Close overlay (safe ordering) ---------- */
    function openOverlay(project) {
        try {
            console.log('[projects] openOverlay called for', project && project.title);
            if (!project) return;
            currentProject = project;

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
            fsMedia.appendChild(res.node);
            currentSlides = res.slides || [];
            currentIndex = 0;

            if (currentSlides.length) {
                currentSlides.forEach((src, i) => {
                    const t = document.createElement('img');
                    t.src = src;
                    t.loading = 'lazy';
                    t.alt = `${project.title || ''} ${i + 1}`;
                    if (i === 0) t.classList.add('active');
                    t.addEventListener('click', () => {
                        const container = fsMedia.querySelector('.embed-container');
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

            // blur any focused element first (prevent aria-hidden focused-descendant warning)
            try { document.activeElement && document.activeElement.blur(); } catch (e) { }

            // Remove aria-hidden (show) then add .open — that ordering avoids the WAI-ARIA warning
            overlay.removeAttribute('aria-hidden');
            overlay.classList.add('open');

            // make close button focusable now that overlay is visible
            if (fsClose) fsClose.setAttribute('tabindex', '0');

            // inert background and focus the dialog
            setBackgroundInert(true);
            window.requestAnimationFrame(() => { try { fsInner.focus(); } catch (e) { } });

            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';

            document.addEventListener('keydown', overlayKeyHandler);
        } catch (err) {
            console.error('openOverlay error', err);
        }
    }

    function closeOverlay() {
        try {
            if (!overlay.classList.contains('open')) return;

            // restore focus to a safe element
            const safe = document.getElementById('menu-toggle') || document.querySelector('.nav-link') || document.body;
            try { safe.focus(); } catch (e) { }

            // make close button non-focusable while hidden
            if (fsClose) fsClose.setAttribute('tabindex', '-1');

            setBackgroundInert(false);

            // remove open class before hiding with aria-hidden to avoid race with MutationObserver
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');

            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';

            fsMedia.innerHTML = '';
            fsThumbs.innerHTML = '';
            fsBuiltWith.innerHTML = '';
            fsTitle.textContent = '';
            fsDesc.textContent = '';
            currentSlides = [];
            currentIndex = 0;
            currentProject = null;

            document.removeEventListener('keydown', overlayKeyHandler);
        } catch (err) {
            console.error('closeOverlay error', err);
        }
    }

    function overlayKeyHandler(e) {
        if (e.key === 'Escape') closeOverlay();
    }

    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeOverlay(); });

    /* ---------- Robust project rendering (unchanged) ---------- */
    function findOrCreateCategoryContainer(categoryName) {
        const normalized = String(categoryName || '').trim().toLowerCase().replace(/\s+/g, '-');
        let container = document.querySelector(`#${normalized}-cards`);
        if (container) return container;

        container = document.querySelector(`#${categoryName}-cards`);
        if (container) return container;

        const panel = document.querySelector(`#${normalized}`) || document.querySelector(`#${categoryName}`);
        if (panel) {
            let panelInner = panel.querySelector('.panel-inner');
            if (!panelInner) panelInner = panel;
            const newDiv = document.createElement('div');
            newDiv.id = `${normalized}-cards`;
            newDiv.className = 'card-grid';
            panelInner.appendChild(newDiv);
            return newDiv;
        }

        const featured = document.querySelector('#featured-cards');
        if (featured) return featured;

        let other = document.querySelector('#other-cards');
        if (!other) {
            other = document.createElement('div');
            other.id = 'other-cards';
            other.className = 'card-grid';
            const main = document.querySelector('.main-content') || document.body;
            main.appendChild(other);
        }
        return other;
    }

    fetch('data/projects.json')
        .then(res => {
            if (!res.ok) throw new Error(`Failed to load projects.json: ${res.status}`);
            return res.json();
        })
        .then(data => {
            try {
                document.querySelectorAll('.project.expanded, .featured-project.expanded').forEach(el => el.classList.remove('expanded'));
                const featuredContainer = document.querySelector('#featured-cards');

                Object.entries(data).forEach(([categoryName, projects]) => {
                    try {
                        if (!Array.isArray(projects)) return;
                        const categorySection = findOrCreateCategoryContainer(categoryName);

                        projects.forEach(project => {
                            try {
                                const isFeatured = !!project.featured;
                                const thumb = project.thumb || project.image || 'assets/placeholder.jpg';
                                const builtWithHtml = generateLogosHTML(project.createdUsing);

                                if (isFeatured && featuredContainer) {
                                    const bigCard = document.createElement('div');
                                    bigCard.className = 'featured-project';
                                    if (project.highlight) bigCard.classList.add('highlight-project');

                                    const anchor = document.createElement('a');
                                    anchor.href = project.link || '#';
                                    anchor.target = '_blank';
                                    anchor.rel = 'noopener noreferrer';
                                    anchor.innerHTML = `<img src="${thumb}" alt="${project.title || ''}">`;

                                    anchor.addEventListener('click', (e) => {
                                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) return;
                                        e.preventDefault();
                                        openOverlay(project);
                                    });

                                    const details = document.createElement('div');
                                    details.className = 'details';
                                    details.innerHTML = `<p><strong>${project.title || ''}</strong><br>${project.description || ''}</p>${builtWithHtml}`;

                                    bigCard.appendChild(anchor);
                                    bigCard.appendChild(details);
                                    featuredContainer.appendChild(bigCard);

                                    if (project.keep && categorySection) {
                                        const smallCard = document.createElement('div');
                                        smallCard.className = 'project small-cards';
                                        if (project.highlight) smallCard.classList.add('highlight-project');

                                        const smallAnchor = document.createElement('a');
                                        smallAnchor.href = project.link || '#';
                                        smallAnchor.target = '_blank';
                                        smallAnchor.rel = 'noopener noreferrer';
                                        smallAnchor.innerHTML = `<img src="${thumb}" alt="${project.title || ''}"><p><strong>${project.title || ''}</strong><br>${project.description || ''}</p>${builtWithHtml}`;

                                        smallAnchor.addEventListener('click', (e) => {
                                            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) return;
                                            e.preventDefault();
                                            openOverlay(project);
                                        });

                                        smallCard.appendChild(smallAnchor);
                                        categorySection.appendChild(smallCard);
                                    }
                                } else if (!isFeatured && categorySection) {
                                    const normalCard = document.createElement('div');
                                    normalCard.className = 'project small-cards';
                                    if (project.highlight) normalCard.classList.add('highlight-project');

                                    const a = document.createElement('a');
                                    a.href = project.link || '#';
                                    a.target = '_blank';
                                    a.rel = 'noopener noreferrer';
                                    a.innerHTML = `<img src="${thumb}" alt="${project.title || ''}"><p><strong>${project.title || ''}</strong><br>${project.description || ''}</p>${builtWithHtml}`;

                                    a.addEventListener('click', (e) => {
                                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1) return;
                                        e.preventDefault();
                                        openOverlay(project);
                                    });

                                    normalCard.appendChild(a);
                                    categorySection.appendChild(normalCard);
                                }
                            } catch (cardErr) {
                                console.error('Error rendering single project card', cardErr, project);
                            }
                        });
                    } catch (catErr) {
                        console.error('Error rendering category', categoryName, catErr);
                    }
                });
            } catch (err) {
                console.error('Error processing projects.json', err);
            }
        })
        .catch(err => {
            console.error('Error loading projects.json:', err);
            const featured = document.querySelector('#featured-cards');
            if (featured) featured.innerHTML = `<div style="color:#fff;padding:1rem">Unable to load projects — check console.</div>`;
        });

    window.addEventListener('resize', () => { try { updateActiveLink(); } catch (err) { } });

}); // end onReady
