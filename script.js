/* script.js — production-ready overlay with fullscreen + vertical-split fixes */

function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(fn, 0);
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

onReady(() => {
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

    /* Mobile menu */
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

    /* YouTube / Drive helpers */
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

    /* Overlay singleton */
    function ensureOverlayExists() {
        let overlay = document.getElementById('fullscreen-overlay');
        if (overlay) return overlay;

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

        const closeBtn = overlay.querySelector('.fs-close');
        if (closeBtn) closeBtn.setAttribute('tabindex', '-1');

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

        return overlay;
    }

    const overlay = ensureOverlayExists();
    const fsInner = overlay.querySelector('.fs-inner');
    const fsContent = overlay.querySelector('.fs-content');
    const fsTitle = overlay.querySelector('.fs-title');
    const fsDesc = overlay.querySelector('.fs-desc');
    const fsMedia = overlay.querySelector('.fs-media');
    const fsThumbs = overlay.querySelector('.fs-thumbs');
    const fsClose = overlay.querySelector('.fs-close');
    const fsBuiltWith = overlay.querySelector('.fs-builtwith');
    const fsActions = overlay.querySelector('.fs-actions');

    if (fsClose) fsClose.addEventListener('click', () => closeOverlay());

    /* fullscreen button */
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

    createFullscreenButton();

    let currentSlides = [];
    let currentIndex = 0;
    let currentProject = null;

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

    function openOverlay(project) {
        if (!project) return;
        currentProject = project;

        // clean any previous split
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
            // mark overlay to apply vertical-only CSS
            overlay.classList.add('vertical');

            // ensure fsMedia doesn't reserve visual space (CSS will hide it; clear content)
            fsMedia.innerHTML = '';

            // create split and ensure it occupies the middle grid row
            const split = document.createElement('div');
            split.className = 'fs-split';
            split.style.gridRow = '2'; // ensure split is in the content middle row
            split.style.width = '100%';

            // move header into split
            const header = overlay.querySelector('.fs-header');
            if (header) {
                header.parentElement && header.parentElement.removeChild(header);
                split.appendChild(header);
            }

            // append media node into split
            split.appendChild(res.node);

            // append split as a child; the grid-row above ensures it fills middle row
            fsContent.appendChild(split);

        } else {
            // normal (horizontal etc.)
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

        // show overlay
        overlay.removeAttribute('aria-hidden');
        overlay.classList.add('open');

        if (fsClose) fsClose.setAttribute('tabindex', '0');

        setBackgroundInert(true);
        window.requestAnimationFrame(() => { try { fsInner.focus(); } catch (e) { } });

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', overlayKeyHandler);
    }

    function closeOverlay() {
        if (!overlay.classList.contains('open')) return;

        const safe = document.getElementById('menu-toggle') || document.querySelector('.nav-link') || document.body;
        try { safe.focus(); } catch (e) { }

        if (fsClose) fsClose.setAttribute('tabindex', '-1');

        setBackgroundInert(false);

        // remove any split and restore header to original spot
        const split = overlay.querySelector('.fs-split');
        if (split) {
            const header = split.querySelector('.fs-header');
            if (header) {
                // restore header to top of fsContent
                fsContent.insertBefore(header, fsContent.firstChild);
            }
            split.remove();
        }

        overlay.classList.remove('open');
        overlay.classList.remove('vertical'); // important: remove vertical state
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
    }

    function overlayKeyHandler(e) {
        if (e.key === 'Escape') closeOverlay();
    }

    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) closeOverlay(); });

    /* Rendering projects from data */
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
