/* =========================
   script.js - Single-file drop-in
   - Whole card opens modal (no duplicate anchors)
   - Modal created dynamically (no HTML required)
   - Preserves nav highlighting + mobile menu toggle
   ========================= */

/* ---------- NAV / SECTION HIGHLIGHT (preserved) ---------- */
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

/* ---------- GENERATE "BUILT WITH" HTML (preserved) ---------- */
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

/* ---------- MOBILE MENU TOGGLE (preserved) ---------- */
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

/* ========== MEDIA MODAL / LIGHTBOX (NEW) ========== */

/* Create modal dynamically if missing */
function ensureMediaModalExists() {
    let modal = document.getElementById('media-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'media-modal';
    modal.className = 'media-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Project media');

    modal.innerHTML = `
      <button class="modal-close" aria-label="Close">✕</button>
      <div class="modal-body"></div>
      <button class="modal-prev" aria-label="Previous">‹</button>
      <button class="modal-next" aria-label="Next">›</button>
    `;
    document.body.appendChild(modal);

    // Minimal styles added so modal works immediately (optional to remove if you added CSS)
    const style = document.createElement('style');
    style.textContent = `
      .media-modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.85); z-index: 9999; }
      .media-modal.open { display:flex; }
      .media-modal .modal-body { max-width: 1100px; width: 92%; max-height: 90vh; overflow: hidden; position:relative; background: transparent; }
      .modal-close, .modal-prev, .modal-next { position: absolute; border: none; background: transparent; color: #fff; font-size: 28px; cursor: pointer; padding: 6px; }
      .modal-close { top: 18px; right: 20px; }
      .modal-prev { left: 8px; top: 50%; transform: translateY(-50%); }
      .modal-next { right: 8px; top: 50%; transform: translateY(-50%); }
      .embed-container { position: relative; width: 100%; height: 0; overflow: hidden; }
      .embed-16-9 { padding-bottom: 56.25%; }
      .embed-9-16  { padding-bottom: 177.7777%; }
      .embed-1-1   { padding-bottom: 100%; }
      .embed-container iframe, .embed-container img, .embed-container video { position: absolute; top:0; left:0; width:100%; height:100%; border:0; background:#000; }
      .gallery-slide { display: none; }
      .gallery-slide.active { display:block; }
      .project-button { cursor: pointer; border: none; background: transparent; width: 100%; text-align: left; padding: 0; }
      .project-button img { display:block; width:100%; height:140px; object-fit:cover; border-radius:8px; }
    `;
    document.head.appendChild(style);

    return modal;
}

/* Helpers: parse/construct embed URLs */
function parseYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{7,})/);
    return m ? m[1] : null;
}
function drivePreviewUrl(url) {
    if (!url) return url;
    const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    const q = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (q) return `https://drive.google.com/file/d/${q[1]}/preview`;
    return url;
}
function instagramEmbedUrl(url) {
    if (!url) return url;
    const m = url.match(/instagram\.com\/p\/([^\/\?\s]+)/);
    return m ? `https://www.instagram.com/p/${m[1]}/embed` : url;
}

/* Build the embed markup. We will request autoplay for YouTube (may be blocked by browser). */
function getEmbedMarkup(media) {
    if (!media) return '<div><p>No media provided</p></div>';
    const format = (media.format || 'horizontal');
    const cls = (format === 'vertical') ? 'embed-9-16' : (format === 'square' ? 'embed-1-1' : 'embed-16-9');

    if (media.type === 'images' && Array.isArray(media.images) && media.images.length) {
        return media.images.map((src, i) => `<div class="gallery-slide ${i === 0 ? 'active' : ''}"><img src="${src}" alt="" loading="lazy" /></div>`).join('');
    }

    if ((media.source === 'youtube' || /youtube/.test(media.link || ''))) {
        const id = parseYouTubeId(media.link);
        if (!id) return `<div class="embed-container ${cls}"><p>Invalid YouTube URL</p></div>`;
        // autoplay attempt; note: browsers may block autoplay
        return `<div class="embed-container ${cls}"><iframe loading="lazy" src="https://www.youtube.com/embed/${id}?rel=0&autoplay=1&mute=1&modestbranding=1" title="YouTube video" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allow="autoplay; fullscreen"></iframe></div>`;
    }

    if ((media.source === 'drive' || /drive\.google/.test(media.link || ''))) {
        const preview = drivePreviewUrl(media.link);
        return `<div class="embed-container ${cls}"><iframe loading="lazy" src="${preview}" title="Google Drive preview" allowfullscreen></iframe></div>`;
    }

    if ((media.source === 'instagram' || /instagram\.com/.test(media.link || ''))) {
        const embed = instagramEmbedUrl(media.link);
        return `<div class="embed-container ${cls}"><iframe loading="lazy" src="${embed}" title="Instagram post" allowfullscreen></iframe></div>`;
    }

    if (media.source === 'local' && media.link) {
        return `<div class="embed-container ${cls}"><video controls preload="metadata" src="${media.link}"></video></div>`;
    }

    if (media.link && /\.(jpe?g|png|webp|gif)$/i.test(media.link)) {
        return `<div class="embed-container ${cls}"><img src="${media.link}" alt="" /></div>`;
    }

    return `<div><p>Unsupported media</p></div>`;
}

/* Modal control */
const modal = ensureMediaModalExists();
const modalBody = modal.querySelector('.modal-body');
const closeBtn = modal.querySelector('.modal-close');
const nextBtn = modal.querySelector('.modal-next');
const prevBtn = modal.querySelector('.modal-prev');

let currentGalleryIndex = 0;
let currentGalleryCount = 0;
let currentProjectList = []; // optional: to support prev/next between cards in current category

function openModalForProject(project, projectList = []) {
    if (!project) return;
    currentProjectList = projectList;
    // Ensure project has a media object; if not, try to infer from legacy fields
    if (!project.media) {
        const link = project.link || '';
        let source = 'local';
        if (/youtube/.test(link) || /youtu\.be/.test(link)) source = 'youtube';
        else if (/drive\.google/.test(link)) source = 'drive';
        else if (/instagram\.com/.test(link)) source = 'instagram';
        project.media = { type: 'video', source, link, format: project.format || 'horizontal' };
    }

    modalBody.innerHTML = getEmbedMarkup(project.media || {});
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // setup gallery navigation if images
    const slides = modalBody.querySelectorAll('.gallery-slide');
    currentGalleryIndex = 0;
    currentGalleryCount = slides.length;
    if (currentGalleryCount <= 1) {
        prevBtn.style.display = nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = nextBtn.style.display = 'block';
    }

    // If there's a local video tag, try to play it (may be blocked if not muted)
    const video = modalBody.querySelector('video');
    if (video) {
        video.play().catch(() => {/* autoplay blocked */ });
    }

    document.addEventListener('keydown', modalKeyHandler);
}

function closeModal() {
    modal.classList.remove('open');
    modalBody.innerHTML = '';
    modal.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', modalKeyHandler);
    currentProjectList = [];
}

function modalKeyHandler(e) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowRight') nextModal();
    if (e.key === 'ArrowLeft') prevModal();
}

function nextModal() {
    // if image gallery
    if (currentGalleryCount > 1) {
        const slides = modalBody.querySelectorAll('.gallery-slide');
        slides[currentGalleryIndex].classList.remove('active');
        currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryCount;
        slides[currentGalleryIndex].classList.add('active');
        return;
    }
    // else step to next project in currentProjectList if provided
    if (currentProjectList && currentProjectList.length) {
        const idx = currentProjectList.indexOf(modalBody.__currentProjectRef);
        const nextIdx = (idx + 1) % currentProjectList.length;
        openModalForProject(currentProjectList[nextIdx], currentProjectList);
    }
}
function prevModal() {
    if (currentGalleryCount > 1) {
        const slides = modalBody.querySelectorAll('.gallery-slide');
        slides[currentGalleryIndex].classList.remove('active');
        currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryCount) % currentGalleryCount;
        slides[currentGalleryIndex].classList.add('active');
        return;
    }
    if (currentProjectList && currentProjectList.length) {
        const idx = currentProjectList.indexOf(modalBody.__currentProjectRef);
        const prevIdx = (idx - 1 + currentProjectList.length) % currentProjectList.length;
        openModalForProject(currentProjectList[prevIdx], currentProjectList);
    }
}

if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (nextBtn) nextBtn.addEventListener('click', nextModal);
if (prevBtn) prevBtn.addEventListener('click', prevModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

/* ========== PROJECT LOADER - NO ANCHORS, WHOLE CARD OPENS MODAL ========== */

fetch('data/projects.json')
    .then(res => res.json())
    .then(data => {
        const featuredContainer = document.querySelector('#featured-cards');

        Object.entries(data).forEach(([categoryName, projects]) => {
            const categorySection = document.querySelector(`#${categoryName}-cards`);

            // make a shallow copy list for modal navigation if desired
            const listForNav = Array.isArray(projects) ? projects.slice() : [];

            projects.forEach(project => {
                // FEATURED (use a large card)
                if (project.featured && featuredContainer) {
                    const bigCard = document.createElement('div');
                    bigCard.classList.add('featured-project', 'highlight-project');

                    const builtWithText = generateLogosHTML(project.createdUsing);

                    // Use button as the whole clickable area (accessible)
                    bigCard.innerHTML = `
                        <button class="project-button featured-button" type="button" aria-label="Open ${project.title || 'project'}">
                            <img src="${project.thumb || project.image || 'assets/placeholder.jpg'}" alt="${project.title || ''}" />
                        </button>
                        <div class="details">
                            <p><strong>${project.title || ''}</strong><br>${project.description || ''}</p>
                            ${builtWithText}
                        </div>
                    `;

                    // click opens modal and plays media
                    const btn = bigCard.querySelector('.project-button');
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        openModalForProject(project, listForNav);
                    });

                    featuredContainer.appendChild(bigCard);

                    // If keep = true, add smaller card to category as well (non-destructive)
                    if (project.keep && categorySection) {
                        const smallCard = document.createElement('div');
                        smallCard.classList.add('project', 'small-cards');
                        if (project.highlight) smallCard.classList.add('highlight-project');

                        smallCard.innerHTML = `
                          <button class="project-button small-button" type="button" aria-label="Open ${project.title || 'project'}">
                            <img src="${project.thumb || project.image || 'assets/placeholder.jpg'}" alt="${project.title || ''}">
                            <p><strong>${project.title || ''}</strong><br>${project.description || ''}</p>
                          </button>
                        `;
                        const sBtn = smallCard.querySelector('.project-button');
                        sBtn.addEventListener('click', (ev) => { ev.preventDefault(); openModalForProject(project, listForNav); });
                        categorySection.appendChild(smallCard);
                    }
                }

                // NON-FEATURED TO CATEGORY
                if (!project.featured && categorySection) {
                    const normalCard = document.createElement('div');
                    normalCard.classList.add('project', 'small-cards');
                    if (project.highlight) normalCard.classList.add('highlight-project');

                    normalCard.innerHTML = `
                      <button class="project-button small-button" type="button" aria-label="Open ${project.title || 'project'}">
                        <img src="${project.thumb || project.image || 'assets/placeholder.jpg'}" alt="${project.title || ''}">
                        <p><strong>${project.title || ''}</strong><br>${project.description || ''}</p>
                      </button>
                    `;
                    const btn = normalCard.querySelector('.project-button');
                    btn.addEventListener('click', (e) => { e.preventDefault(); openModalForProject(project, listForNav); });
                    categorySection.appendChild(normalCard);
                }
            });
        });
    })
    .catch(error => {
        console.error('Error loading projects:', error);
    });

/* ---------- small compatibility touch ---------- */
window.addEventListener('resize', () => { try { updateActiveLink(); } catch (err) { } });

/* End of script.js */
