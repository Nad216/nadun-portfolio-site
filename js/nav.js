// nav.js
export function initNav() {
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
    window.addEventListener('resize', updateActiveLink);
}
