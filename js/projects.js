// projects.js
import { generateLogosHTML } from './utils.js';
import { openOverlay } from './overlay.js';

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

export function loadProjects() {
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
}
