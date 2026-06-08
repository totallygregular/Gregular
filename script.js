const characters = [
    {
        id: 'blood-mage',
        name: 'Valdris the Crimson',
        class: 'Blood Mage',
        portrait: 'assets/blood-mage.png',
        game: 'Eternal Crucible',
        build: 'Sanguine Sorcerer',
        lore: 'Once a healer of the Silver Order, Valdris discovered that life force could be weaponized. He now walks the line between salvation and destruction, paying for power with his own vitality.',
        stats: ['Intelligence', 'Life Drain', 'Chaos Damage', 'Fragile']
    },
    {
        id: 'shadow-rogue',
        name: 'Kira Nightwhisper',
        class: 'Shadow Rogue',
        portrait: 'assets/shadow-rogue.png',
        game: 'Eternal Crucible',
        build: 'Assassin of the Veil',
        lore: 'Trained in the lightless halls beneath Ashenmoor, Kira strikes from the spaces between shadows. Her blade carries a poison that unravels the soul before the body falls.',
        stats: ['Dexterity', 'Critical Strike', 'Stealth', 'Poison']
    },
    {
        id: 'storm-warden',
        name: 'Thorn Ironsky',
        class: 'Storm Warden',
        portrait: 'assets/storm-warden.png',
        game: 'Eternal Crucible',
        build: 'Tempest Guardian',
        lore: 'A former skyship captain, Thorn was struck by lightning that should have killed him. Now he channels the storm itself, calling down thunder to protect those who cannot protect themselves.',
        stats: ['Strength', 'Lightning', 'Shield Bash', 'Aura']
    },
    {
        id: 'bone-sentinel',
        name: 'Morgran the Undying',
        class: 'Bone Sentinel',
        portrait: 'assets/bone-sentinel.png',
        game: 'Eternal Crucible',
        build: 'Death Knight',
        lore: 'Morgran died defending his keep three centuries ago. The necromancers who raised him expected a servant. They got a master. Now he commands the very bones of the fallen.',
        stats: ['Constitution', 'Summoning', 'Bone Armor', 'Undead']
    },
    {
        id: 'flame-dancer',
        name: 'Seraphina Ashborne',
        class: 'Flame Dancer',
        portrait: 'assets/flame-dancer.png',
        game: 'Eternal Crucible',
        build: 'Pyroblade Dancer',
        lore: 'Born in the volcanic reaches of Pyreth, Seraphina learned to dance before she learned to fight. Her movements weave fire into art, and her art leaves nothing but embers.',
        stats: ['Agility', 'Fire Damage', 'Evasion', 'Burning']
    },
    {
        id: 'void-walker',
        name: 'Elyndra the Unbound',
        class: 'Void Walker',
        portrait: 'assets/void-walker.png',
        game: 'Eternal Crucible',
        build: 'Reality Shaper',
        lore: 'Elyndra gazed too long into the spaces between worlds. Now she exists in multiple realities at once, bending the fabric of existence to her will. Some say she is already gone, and only her echo remains.',
        stats: ['Willpower', 'Teleportation', 'Reality Warp', 'Unstable']
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

        card.addEventListener('mouseenter', handleCardMouseEnter);
        card.addEventListener('mousemove', handleCardMouseMove);
        card.addEventListener('mouseleave', handleCardMouseLeave);
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

function handleCardMouseEnter(e) {
    const card = e.currentTarget;
    if (card.classList.contains('is-flipped')) return;
    card.style.setProperty('--glare-opacity', '0.15');
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
    card.style.setProperty('--glare-opacity', '0');
}

function openCard(card, grid) {
    grid.querySelectorAll('.card.is-flipped').forEach(c => closeCard(c, grid));
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
    card.style.setProperty('--glare-opacity', '0');
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
