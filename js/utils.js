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

export function normalizeDriveImage(link) {
    if (!link || typeof link !== 'string') return link;
    if (/\/uc\?export=view/i.test(link)) return link;
    const m = link.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
    const q = link.match(/[?&]id=([A-Za-z0-9_-]+)/);
    if (q && q[1]) return `https://drive.google.com/uc?export=view&id=${q[1]}`;
    return link;
}

// NEW IMGUR FUNCTIONS - ADD THESE:
export function looksLikeImgurUrl(url) {
    return /imgur\.com/.test(String(url || ''));
}

export function parseImgurId(url) {
    if (!url) return null;
    // Match gallery URLs like: https://imgur.com/gallery/lorem-ipsum-9ycACCn
    const galleryMatch = url.match(/imgur\.com\/gallery\/([a-zA-Z0-9_-]+)/);
    if (galleryMatch) return galleryMatch[1];

    // Match direct image URLs like: https://imgur.com/1MLcYii
    const directMatch = url.match(/imgur\.com\/([a-zA-Z0-9_-]+)/);
    if (directMatch) return directMatch[1];

    return null;
}

export function imgurDirectImageUrl(url) {
    if (!url || !looksLikeImgurUrl(url)) return url;

    const id = parseImgurId(url);
    if (!id) return url;

    // Return direct image URL - Imgur serves images directly via i.imgur.com
    return `https://i.imgur.com/${id}.jpg`;
}

export function imgurThumbnailUrl(url) {
    if (!url || !looksLikeImgurUrl(url)) return url;

    const id = parseImgurId(url);
    if (!id) return url;

    // Return thumbnail URL - 'b' suffix gives you a large thumbnail
    return `https://i.imgur.com/${id}b.jpg`;
}