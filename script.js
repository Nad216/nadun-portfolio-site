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

// Load JSON and render projects
fetch('data/projects.json')
    .then(response => response.json())
    .then(data => {
        // Reusable card appender
        function renderProjects(sectionId, projects) {
            if (!projects || !Array.isArray(projects)) return;

            const section = document.querySelector(`#${sectionId} .panel-content`);
            if (!section) return;

            projects.forEach(project => {
                const div = document.createElement('div');
                div.classList.add('project');

                if (project.highlight) {
                    div.classList.add('highlight-project');
                }

                div.innerHTML = `
                    <a href="${project.link}" target="_blank">
                        <img src="${project.image}" alt="${project.title}">
                        <p><strong>${project.title}</strong><br>${project.description}</p>
                    </a>
                `;
                section.appendChild(div);
            });
        }

        // 🌟 Get all featured items from across categories
        const featuredProjects = [];

        Object.keys(data).forEach(category => {
            data[category].forEach(item => {
                if (item.featured) {
                    featuredProjects.push(item);
                }
            });
        });

        renderProjects('featured', featuredProjects); // ✅ Now correct
        renderProjects('brand', data.brand);
        renderProjects('animation', data.animation);
        renderProjects('cgi', data.cgi);
    })
    .catch(error => {
        console.error('Error loading projects:', error);
    });
