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
