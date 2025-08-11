const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.panel');

function updateActiveLink() {
    let index = sections.length;
    while (--index >= 0) {
        const sectionTop = sections[index].getBoundingClientRect().top;
        if (sectionTop <= window.innerHeight / 2) {
            navLinks.forEach(link => link.classList.remove('active'));
            navLinks[index].classList.add('active');
            break;
        }
    }
}

document.querySelector('.main-content').addEventListener('scroll', updateActiveLink);
window.addEventListener('load', updateActiveLink);

function generateLogosHTML(softwareList) {
    if (!softwareList || !softwareList.length) return '';
    return `
      <div class="built-with-logos">
        <span class="built-with-label">Built with:</span>
        ${softwareList.map(software =>
        `<img src="assets/logos/${software.replace(/\s+/g, '')}.png" alt="${software}" title="${software}" loading="lazy" />`
    ).join('')}
      </div>
    `;
}


// Load JSON and render projects
fetch('data/projects.json')
    .then(res => res.json())
    .then(data => {

        const featuredContainer = document.querySelector('#featured-cards');

        Object.entries(data).forEach(([categoryName, projects]) => {
            // Target the section itself
            const categorySection = document.querySelector(`#${categoryName}-cards`);

            projects.forEach(project => {

                // RULE 1 & 3 — Featured always goes to Featured
                if (project.featured) {
                    const bigCard = document.createElement('div');
                    bigCard.classList.add('featured-project', 'highlight-project');

                    const builtWithText = project.createdUsing ?
                        `<p class="built-with">Built with: ${project.createdUsing.join(', ')}</p>` : '';

                    bigCard.innerHTML = `
                        <a href="${project.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${project.image}" alt="${project.title}">
                        </a>
                        <div class="details">
                            <p><strong>${project.title}</strong><br>${project.description}</p>
                            ${builtWithText}
                        </div>
                    `;
                    featuredContainer.appendChild(bigCard);

                    // RULE 3 — If keep = true, ALSO add small card to original category
                    if (project.keep && categorySection) {
                        const smallCard = document.createElement('div');
                        smallCard.classList.add('project', 'small-cards');
                        if (project.highlight) smallCard.classList.add('highlight-project');

                        const smallBuiltWithText = project.createdUsing ?
                            `<p class="built-with">Built with: ${project.createdUsing.join(', ')}</p>` : '';

                        smallCard.innerHTML = `
                            <a href="${project.link}" target="_blank" rel="noopener noreferrer">
                                <img src="${project.image}" alt="${project.title}">
                                <p><strong>${project.title}</strong><br>${project.description}</p>
                                ${smallBuiltWithText}
                            </a>
                        `;
                        categorySection.appendChild(smallCard);
                    }
                }

                // RULE 2 — Non-featured always go to category
                if (!project.featured && categorySection) {
                    const normalCard = document.createElement('div');
                    normalCard.classList.add('project', 'small-cards');
                    if (project.highlight) normalCard.classList.add('highlight-project');

                    const builtWithText = project.createdUsing ?
                        `<p class="built-with">Built with: ${project.createdUsing.join(', ')}</p>` : '';

                    normalCard.innerHTML = `
                        <a href="${project.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${project.image}" alt="${project.title}">
                            <p><strong>${project.title}</strong><br>${project.description}</p>
                            ${builtWithText}
                        </a>
                    `;
                    categorySection.appendChild(normalCard);
                }
            });
        });

    })
    .catch(error => {
        console.error('Error loading projects:', error);
    });

