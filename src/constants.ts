export const RARITIES = {
  COMMON: { name: 'Common', color: '#c0c0c0', chance: 60 },
  RARE: { name: 'Rare', color: '#33bbff', chance: 25 },
  EPIC: { name: 'Epic', color: '#ff33ff', chance: 12 },
  LEGENDARY: { name: 'Legendary', color: '#ffaa00', chance: 3 },
  ABOMINATION: { name: 'Abomination', color: '#ff0000', chance: 0 } // Cannot pull
};

export const PACKS = [
  { id: 'flesh', name: 'FLESH PACK', price: 100, color: 'var(--accent-primary)', pulls: [RARITIES.COMMON, RARITIES.RARE] },
  { id: 'bone', name: 'BONE PACK', price: 500, color: 'var(--hylics-border-white)', pulls: [RARITIES.COMMON, RARITIES.RARE, RARITIES.EPIC] },
  { id: 'brain', name: 'BRAIN PACK', price: 2500, color: '#aa44cc', pulls: [RARITIES.RARE, RARITIES.EPIC] },
  { id: 'cosmos', name: 'GLOOM PACK', price: 10000, color: 'var(--hylics-blue)', pulls: [RARITIES.EPIC, RARITIES.LEGENDARY] },
];

export const EVOLUTIONS = [
  { level: 0, name: 'Normal Pointer', value: 1, cost: 0, color: 'var(--hylics-blue)' },
  { level: 1, name: 'Stitch Finger', value: 5, cost: 500, color: '#772222' },
  { level: 2, name: 'Mind Scraper', value: 25, cost: 5000, color: '#aa33cc' },
  { level: 3, name: 'Gloom Hand', value: 100, cost: 50000, color: 'var(--accent-primary)' },
];

export const CARDS_DB = [
  { id: 1, name: 'Gloom-Moon', rarity: 'Common', image: '/cards/h1.png', attack: 5, hp: 20,
    lore: 'It smiles upon the melting earth. Its dripping visage causes intense migraines for those who stare too long.' },
  { id: 2, name: 'Fleshtotem', rarity: 'Rare', image: '/cards/h2.png', attack: 25, hp: 150,
    lore: 'A monument constructed from raw biomatter. The eyes track movement, but never blink.' },
  { id: 3, name: 'Stitch-Torso', rarity: 'Epic', image: '/cards/h3.png', attack: 150, hp: 400,
    lore: 'Assembled from the waste of the old world. It seeks a head it never possessed.' },
  { id: 4, name: 'Perma-Caff', rarity: 'Common', image: '/cards/h4.png', attack: 12, hp: 10,
    lore: 'Sentience born of spilled morning rituals. It requires boiling sludge to maintain form.' },
  { id: 5, name: 'Horned-Blue', rarity: 'Epic', image: '/cards/h5.png', attack: 200, hp: 800,
    lore: 'Alien geometry manifesting as clay in our dimension. Standing near it induces vertigo.' },
  { id: 6, name: 'Brain-Bath', rarity: 'Legendary', image: '/cards/h6.png', attack: 1000, hp: 5000,
    lore: 'The ultimate throne. A mind so engorged with psychic mass it rests forever upon cold porcelain.' },
  { id: 7, name: 'Hand-Goblet', rarity: 'Rare', image: '/cards/h7.png', attack: 45, hp: 90,
    lore: 'A severed limb offering infinite sustenance. No one dares drink the swirling crimson liquid.' },
];

// MELDING RECIPES: Require 3 of the source base card
export const ABOMINATIONS_DB = [
  { id: 101, sourceId: 1, name: 'Blood-Moon', rarity: 'Abomination', image: '/cards/h1.png', attack: 85, hp: 200, filter: 'invert(1) hue-rotate(90deg)',
    lore: 'An eclipsing terror. It has consumed three Gloom-Moons to attain forbidden red mass.' },
  { id: 102, sourceId: 2, name: 'Null-Totem', rarity: 'Abomination', image: '/cards/h2.png', attack: 250, hp: 1000, filter: 'grayscale(1) contrast(200%)',
    lore: 'Three fleshy shrines converged. Its eye has closed entirely, peering only into the void.' },
  { id: 104, sourceId: 4, name: 'Hyper-Caff', rarity: 'Abomination', image: '/cards/h4.png', attack: 180, hp: 50, filter: 'hue-rotate(180deg) saturate(300%)',
    lore: 'An overdose of pure energy. It vibrating so violently it phases through matter.' },
  { id: 107, sourceId: 7, name: 'God-Goblet', rarity: 'Abomination', image: '/cards/h7.png', attack: 500, hp: 600, filter: 'contrast(150%) hue-rotate(45deg) drop-shadow(0 0 10px gold)',
    lore: 'It overflows endlessly. The liquid has solidified into psychic crystal.' }
];

export const ALL_CARDS = [...CARDS_DB, ...ABOMINATIONS_DB];
