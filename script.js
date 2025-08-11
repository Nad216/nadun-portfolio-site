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

fetch('data/projects.json')
    .then(response => response.json())
    .then(data => {

        // Collect all featured projects from every category
        const featuredProjects = [];
        Object.keys(data).forEach(category => {
            data[category].forEach(project => {
                if (project.featured) {
                    featuredProjects.push(project);
                }
            });
        });

        function renderProjects(sectionId, projects) {
            if (!projects || !Array.isArray(projects)) return;
            const container = document.querySelector(`#${sectionId}-cards`);
            if (!container) return;

            projects.forEach(project => {
                // Skip featured ones with keep=false when rendering normal categories
                if (sectionId !== 'featured' && project.featured && !project.keep) {
                    return;
                }

                let div;
                if (sectionId === 'featured') {
                    div = document.createElement('div');
                    div.classList.add('featured-project');
                    if (project.highlight) div.classList.add('highlight-project');
                    div.innerHTML = `
                        <a href="${project.link}" target="_blank" rel="noopener noreferrer">
                            <img src="${project.image}" alt="${project.title}">
                        </a>
                        <div class="details">
                            <p><strong>${project.title}</strong><br>${project.description}</p>
                            ${generateLogosHTML(project.createdUsing)}
                        </div>
                    `;
                } else {
                    div = document.createElement('div');
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
                }
                container.appendChild(div);
            });
        }

        // Render sections
        renderProjects('featured', featuredProjects);
        renderProjects('brand', data.brand);
        renderProjects('animation', data.animation);
        renderProjects('cgi', data.cgi);
    })
    .catch(error => {
        console.error('Error loading projects:', error);
    });
