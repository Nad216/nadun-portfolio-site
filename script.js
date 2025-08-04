// Load JSON and populate featured and section cards
fetch("data.json")
    .then(response => response.json())
    .then(data => {
        displayFeatured(data);
        displaySections(data);
    })
    .catch(error => {
        console.error("Error loading JSON data:", error);
    });

// Add featured cards to #featured-cards (inside the "Featured" section)
function displayFeatured(data) {
    const featuredContainer = document.getElementById("featured-cards");
    if (!featuredContainer) return;

    Object.keys(data).forEach(category => {
        data[category].forEach(item => {
            if (item.featured) {
                const card = createCard(item, item.highlight);
                featuredContainer.appendChild(card);
            }
        });
    });
}

// Add normal (non-featured) cards to their respective panels (e.g., #brand-grid)
function displaySections(data) {
    Object.keys(data).forEach(category => {
        const grid = document.getElementById(`${category}-grid`);
        if (!grid) return;

        data[category].forEach(item => {
            if (!item.featured || item.keep) {
                const card = createCard(item, item.highlight);
                grid.appendChild(card);
            }
        });
    });
}

// Create a visual card from item data
function createCard(item, highlight = false) {
    const card = document.createElement("div");
    card.classList.add("card");
    if (highlight) card.classList.add("highlight");

    card.innerHTML = `
        <img src="${item.image}" alt="${item.title}" />
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <a href="${item.link}" target="_blank" style="color: var(--clr-primary); font-weight: bold;">View</a>
    `;
    return card;
}
