const characters = [
    {
        id: 'disciple-of-varashta',
        name: 'ChoombaWoomba',
        class: 'Disciple of Varashta',
        portrait: 'assets/disciple-of-varashta.png',
        game: 'Path of Exile 2',
        build: 'Sand Djinn',
        lore: 'A Sorceress who proves herself worthy before the Maraketh leader Varashta and is granted command over the bound djinn she still rules within the Trial of the Sekhemas.',
        stats: ['Intelligence', 'Minion', 'Command']
    },
    {
        id: 'shaman',
        name: 'ElonMuskProGamer',
        class: 'Shaman',
        portrait: 'assets/shaman.png',
        game: 'Path of Exile 2',
        build: 'Walking Cataclysm Bear',
        lore: 'A Druid who becomes nature’s vengeance made flesh, channeling primal fury and elemental catastrophe until he walks like a living apocalypse across Wraeclast.',
        stats: ['Strength', 'Shapeshift', 'Fire', 'Slam']
    },
    {
        id: 'stormweaver',
        name: 'FrigidBih',
        class: 'Stormweaver',
        portrait: 'assets/stormweaver.png',
        game: 'Path of Exile 2',
        build: 'Cold Lightning',
        lore: 'A Sorceress who bends thunder, frost, and raw elemental force into a personal tempest, announcing her coming with ruin in her wake.',
        stats: ['Intelligence', 'Lightning', 'Cold', 'Freeze']
    }
];

function createCardHTML(character) {
    return `
        <article class="card" data-character-id="${character.id}" tabindex="0" role="button" aria-label="View ${character.name} details" aria-expanded="false">
            <div class="card-inner">
                <div class="card-front">
                    <img src="${character.portrait}" alt="${character.name}" class="card-portrait" loading="lazy">
                    <div class="card-glass-overlay"></div>
                    <div class="card-glare"></div>
                    <div class="card-content">
                        <h2 class="card-name">${character.name}</h2>
                        <p class="card-class">${character.class}</p>
                    </div>
                </div>
                <div class="card-back">
                    <button class="card-close" aria-label="Close ${character.name} details">&times;</button>
                    <div class="card-back-content">
                        <h2 class="card-back-name">${character.name}</h2>
                        <p class="card-back-class">${character.game} • ${character.build}</p>
                        <p class="card-back-lore">${character.lore}</p>
                        <div class="card-stats">
                            ${character.stats.map(stat => `<span class="stat-chip">${stat}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </article>
    `;
}

function renderCards() {
    const grid = document.getElementById('cardGrid');
    grid.innerHTML = characters.map(createCardHTML).join('');
    attachCardEvents();
}

function attachCardEvents() {
    const grid = document.getElementById('cardGrid');
    const cards = grid.querySelectorAll('.card');
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-close')) {
                closeCard(card, grid);
                return;
            }
            if (card.classList.contains('is-flipped')) {
                return;
            }
            openCard(card, grid);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (card.classList.contains('is-flipped')) {
                    closeCard(card, grid);
                } else {
                    openCard(card, grid);
                }
            }
        });

        if (!isTouchDevice) {
            card.addEventListener('mousemove', handleCardMouseMove);
            card.addEventListener('mouseleave', handleCardMouseLeave);
        }
    });

    grid.addEventListener('click', (e) => {
        if (!e.target.closest('.card')) {
            const expanded = grid.querySelector('.card.is-flipped');
            if (expanded) {
                closeCard(expanded, grid);
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const expanded = grid.querySelector('.card.is-flipped');
            if (expanded) {
                closeCard(expanded, grid);
                expanded.focus();
            }
        }
    });
}

function handleCardMouseMove(e) {
    const card = e.currentTarget;
    if (card.classList.contains('is-flipped')) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const percentX = (x - centerX) / centerX;
    const percentY = (y - centerY) / centerY;

    const tiltX = percentY * -6;
    const tiltY = percentX * 6;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    card.style.setProperty('--tilt-x', `${tiltX}deg`);
    card.style.setProperty('--tilt-y', `${tiltY}deg`);
    card.style.setProperty('--glare-x', `${glareX}%`);
    card.style.setProperty('--glare-y', `${glareY}%`);
}

function handleCardMouseLeave(e) {
    const card = e.currentTarget;
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
}

function openCard(card, grid) {
    grid.querySelectorAll('.card.is-flipped').forEach(c => closeCard(c, grid));
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
    card.classList.add('is-flipped');
    card.setAttribute('aria-expanded', 'true');
    grid.classList.add('has-expanded');
}

function closeCard(card, grid) {
    card.classList.remove('is-flipped');
    card.setAttribute('aria-expanded', 'false');
    grid.classList.remove('has-expanded');
}

document.addEventListener('DOMContentLoaded', renderCards);
