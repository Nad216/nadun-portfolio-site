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
// Load JSON and render projects
fetch('data/projects.json')
    .then(response => response.json())
    .then(data => {
        // Collect featured projects from all categories
        const featuredProjects = [];
        Object.values(data).forEach(category => {
            if (Array.isArray(category)) {
                category.forEach(project => {
                    if (project.featured) {
                        featuredProjects.push(project);
                    }
                });
            }
        });

        function renderProjects(sectionId, projects) {
            if (!projects || !Array.isArray(projects)) return;

            const container = document.querySelector(`#${sectionId}-cards`);
            if (!container) return;

            projects.forEach(project => {
                if (sectionId === 'featured') {
                    // Featured projects get special layout
                    const div = document.createElement('div');
                    div.classList.add('featured-project', 'highlight-project');

                    // Built with (Created using) text if exists
                    const builtWithText = generateLogosHTML(project.createdUsing);

                    div.innerHTML = `
                        <a href="${project.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${project.image}" alt="${project.title}">
                        </a>
                        <div class="details">
                            <p><strong>${project.title}</strong><br>${project.description}</p>
                            ${builtWithText}
                        </div>
                    `;
                    container.appendChild(div);

                    if (project.keep) {
                        const smallCard = document.createElement('div');
                        smallCard.classList.add('project');
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
                        container.appendChild(smallCard);
                    }

                } else {
                    // Normal project card
                    const div = document.createElement('div');
                    div.classList.add('project');
                    if (project.highlight) div.classList.add('highlight-project');

                    const builtWithText = project.createdUsing ?
                        `<p class="built-with">Built with: ${project.createdUsing.join(', ')}</p>` : '';

                    div.innerHTML = `
                        <a href="${project.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${project.image}" alt="${project.title}">
                            <p><strong>${project.title}</strong><br>${project.description}</p>
                            ${builtWithText}
                        </a>
                    `;
                    container.appendChild(div);
                }
            });
        }

        renderProjects('featured', featuredProjects);
        renderProjects('brand', data.brand);
        renderProjects('animation', data.animation);
        renderProjects('cgi', data.cgi);
    })
    .catch(error => {
        console.error('Error loading projects:', error);
    });
