// utils.js
export function slugifyForLogo(name) {
    return String(name || '').trim().replace(/\s+/g, '').replace(/[^\w\-\.]/g, '');
}

export function generateLogosHTML(softwareList) {
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

export function parseYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{7,})/);
    return m ? m[1] : null;
}

export function youtubeWatchUrlFromLink(link) {
    const id = parseYouTubeId(link);
    return id ? `https://www.youtube.com/watch?v=${id}` : link;
}

export function youtubeThumbnailUrl(link) {
    const id = parseYouTubeId(link);
    if (!id) return '';
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function drivePreviewUrl(link) {
    if (!link) return link;
    const m = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    const q = link.match(/id=([a-zA-Z0-9_-]+)/);
    if (q) return `https://drive.google.com/file/d/${q[1]}/preview`;
    return link;
}

/**
 * normalizeDriveImage(link)
 * - Converts common Google Drive share/preview URLs into a direct image URL:
 *   https://drive.google.com/uc?export=view&id=FILEID
 * - If the URL doesn't look like Drive or already is fine, returns it unchanged.
 */
export function normalizeDriveImage(link) {
    if (!link || typeof link !== 'string') return link;
    // if already a uc?export=view we can return
    if (/\/uc\?export=view/i.test(link)) return link;
    // match /file/d/FILEID/...
    const m = link.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    // match ?id=FILEID
    const q = link.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (q && q[1]) return `https://drive.google.com/uc?export=view&id=${q[1]}`;
    return link;
}
