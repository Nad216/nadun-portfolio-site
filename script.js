fetch("data.json")
    .then(response => response.json())
    .then(data => {
        displaySections(data);
        displayFeatured(data);
    });

function displaySections(data) {
    const sectionContainer = document.getElementById("sections");

    Object.keys(data).forEach(category => {
        const section = document.createElement("section");
        section.classList.add("category-section");
        section.innerHTML = `<h2>${category.toUpperCase()}</h2><div class="card-grid" id="${category}-grid"></div>`;
        sectionContainer.appendChild(section);

        const grid = section.querySelector(".card-grid");

        data[category].forEach(item => {
            if (!item.featured || item.keep) {
                const card = createCard(item, item.highlight);
                grid.appendChild(card);
            }
        });
    });
}

function displayFeatured(data) {
    const featuredContainer = document.getElementById("featured");
    Object.keys(data).forEach(category => {
        data[category].forEach(item => {
            if (item.featured) {
                const card = createCard(item, false);
                featuredContainer.appendChild(card);
            }
        });
    });
}

function createCard(item, highlight = false) {
    const card = document.createElement("div");
    card.classList.add("card");
    if (highlight) {
        card.classList.add("highlight");
    }
    card.innerHTML = `
    <img src="${item.image}" alt="${item.title}" />
    <h3>${item.title}</h3>
    <p>${item.description}</p>
    <a href="${item.link}" target="_blank">View</a>
  `;
    return card;
}
