// Navigation highlighting based on scroll position
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
        // Render cards into each panel
        function renderProjects(sectionId, projects) {
            const section = document.querySelector(`#${sectionId} .panel-content`); // ✅ Fixed with backticks
            if (!section) return;

            projects.forEach(project => {
                const div = document.createElement('div');
                div.classList.add('project');
                div.innerHTML = `
                    <a href="${project.link}" target="_blank">
                        <img src="${project.image}" alt="${project.title}">
                        <p><strong>${project.title}</strong><br>${project.description}</p>
                    </a>
                `;
                section.appendChild(div);
            });
        }

        renderProjects('featured', data.featured);
        renderProjects('brand', data.brand);
        renderProjects('animation', data.animation);
        renderProjects('cgi', data.cgi);
    })
    .catch(error => {
        console.error('Error loading projects:', error);
    });
