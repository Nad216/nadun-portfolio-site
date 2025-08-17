// main.js
import { initNav } from './nav.js';
import { initMobileMenu } from './mobileMenu.js';
import { initOverlay } from './overlay.js';
import { loadProjects } from './projects.js';

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initMobileMenu();
    initOverlay();   // creates overlay singleton and fullscreen button
    loadProjects();  // needs overlay to exist so openOverlay is ready
});
