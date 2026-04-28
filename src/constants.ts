export const RARITIES = {
  COMMON: { name: 'Common', color: '#c0c0c0', chance: 60 },
  RARE: { name: 'Rare', color: '#33bbff', chance: 25 },
  EPIC: { name: 'Epic', color: '#ff33ff', chance: 12 },
  LEGENDARY: { name: 'Legendary', color: '#ffaa00', chance: 3 },
  ABOMINATION: { name: 'Abomination', color: '#ff0000', chance: 0 }, // Cannot pull
  CHIMERA: { name: 'Chimera', color: '#ff00ff', chance: 0 } // Cannot pull, unique fusion
};

export const PACKS = [
  { 
    id: 'flesh', 
    name: 'FLESH PACK', 
    price: 150, 
    image: '/packs/flesh.png', 
    color: 'var(--accent-primary)', 
    chances: { Common: 80, Rare: 18, Epic: 2, Legendary: 0 } 
  },
  { 
    id: 'bone', 
    name: 'BONE PACK', 
    price: 1500, 
    image: '/packs/bone.png', 
    color: 'var(--hylics-border-white)', 
    chances: { Common: 55, Rare: 30, Epic: 14, Legendary: 1 } 
  },
  { 
    id: 'brain', 
    name: 'BRAIN PACK', 
    price: 8000, 
    image: '/packs/brain.png', 
    color: '#aa44cc', 
    chances: { Common: 30, Rare: 35, Epic: 25, Legendary: 10 } 
  },
  { 
    id: 'cosmos', 
    name: 'GLOOM PACK', 
    price: 25000, 
    image: '/packs/gloom.png', 
    color: 'var(--hylics-blue)', 
    chances: { Common: 15, Rare: 25, Epic: 35, Legendary: 25 } 
  },
];

export const EVOLUTIONS = [
  { level: 0, name: 'Normal Pointer', value: 1, cost: 0, color: 'var(--hylics-blue)' },
  { level: 1, name: 'Stitch Finger', value: 5, cost: 5000, color: '#772222' },
  { level: 2, name: 'Mind Scraper', value: 25, cost: 40000, color: '#aa33cc' },
  { level: 3, name: 'Gloom Hand', value: 100, cost: 250000, color: 'var(--accent-primary)' },
];

export const CARDS_DB = [
  {
    id: 1, name: 'Gloom-Moon', rarity: 'Common', image: '/cards/h1.jpg', attack: 1,
    lore: 'It smiles upon the melting earth. Its dripping visage causes intense migraines for those who stare too long.'
  },
  {
    id: 2, name: 'Fleshtotem', rarity: 'Rare', image: '/cards/h2.png', attack: 4,
    lore: 'A monument constructed from raw biomatter. The eyes track movement, but never blink.'
  },
  {
    id: 3, name: 'Stitch-Torso', rarity: 'Epic', image: '/cards/h3.png', attack: 15,
    lore: 'Assembled from the waste of the old world. It seeks a head it never possessed.'
  },
  {
    id: 4, name: 'Perma-Caff', rarity: 'Common', image: '/cards/hyper_caff.jpg', attack: 1,
    lore: 'Sentience born of spilled morning rituals. It requires boiling sludge to maintain form.'
  },
  {
    id: 5, name: 'Horned-Blue', rarity: 'Epic', image: '/cards/h5.png', attack: 15,
    lore: 'Alien geometry manifesting as clay in our dimension. Standing near it induces vertigo.'
  },
  {
    id: 6, name: 'Brain-Bath', rarity: 'Legendary', image: '/cards/h6.png', attack: 80,
    lore: 'The ultimate throne. A mind so engorged with psychic mass it rests forever upon cold porcelain.'
  },
  {
    id: 7, name: 'Hand-Goblet', rarity: 'Rare', image: '/cards/h7.png', attack: 4,
    lore: 'A severed limb offering infinite sustenance. No one dares drink the swirling crimson liquid.'
  },
  {
    id: 8, name: 'Needle-Grin', rarity: 'Rare', image: '/cards/h8.png', attack: 5,
    lore: 'It feeds on the silence between heartbeats. The needles vibrate when it senses fear.'
  },
  {
    id: 9, name: 'Door-Watcher', rarity: 'Epic', image: '/cards/h9.png', attack: 20,
    lore: 'It waits at the threshold of perception. It does not enter; it only observes.'
  },
  {
    id: 10, name: 'Pale-Mask', rarity: 'Common', image: '/cards/pale_mask_card_1777374477986.png', attack: 1,
    lore: 'A weeping facade of purity. It seeks a body to host its sorrow.'
  },
  {
    id: 11, name: 'Void-Angler', rarity: 'Rare', image: '/cards/void_angler_card_1777374493163.png', attack: 6,
    lore: 'It lures the curious into the deep dark. The glowing brain is not its own.'
  },
];

// MELDING RECIPES: Require 3 of the source base card
export const ABOMINATIONS_DB = [
  {
    id: 101, sourceId: 1, name: 'Blood-Moon', rarity: 'Abomination', image: '/cards/h1.jpg', attack: 5, filter: 'hue-rotate(90deg) saturate(300%) brightness(0.85) contrast(140%)',
    lore: 'An eclipsing terror. It has consumed three Gloom-Moons to attain forbidden red mass.'
  },
  {
    id: 102, sourceId: 2, name: 'Null-Totem', rarity: 'Abomination', image: '/cards/h2.png', attack: 15, filter: 'grayscale(1) contrast(200%)',
    lore: 'Three fleshy shrines converged. Its eye has closed entirely, peering only into the void.'
  },
  {
    id: 104, sourceId: 4, name: 'Hyper-Caff', rarity: 'Abomination', image: '/cards/hyper_caff.jpg', attack: 8, filter: 'hue-rotate(180deg) saturate(400%) contrast(130%)',
    lore: 'An overdose of pure energy. It vibrating so violently it phases through matter.'
  },
  {
    id: 107, sourceId: 7, name: 'God-Goblet', rarity: 'Abomination', image: '/cards/h7.png', attack: 20, filter: 'contrast(150%) hue-rotate(45deg)',
    lore: 'It overflows endlessly. The liquid has solidified into psychic crystal.'
  },
  {
    id: 109, sourceId: 9, name: 'Threshold Guardian', rarity: 'Abomination', image: '/cards/threshold_guardian.png', attack: 80, filter: 'hue-rotate(-120deg) saturate(500%) contrast(180%) brightness(0.9)',
    lore: 'It has consumed its alternates to become the doorway itself. It no longer just watches; it decides.'
  },
  {
    id: 110, sourceId: 10, name: 'Pale-Torso', rarity: 'Abomination', image: '/cards/pale_mask_card_1777374477986.png', attack: 8, filter: 'grayscale(1) brightness(1.3) contrast(110%)',
    lore: 'Three masks melded into one. It has found a host in the collective sorrow of its past selves.'
  }
];

// CHIMERA RECIPES: Require 1 of each of 2 different specific base cards
export const CHIMERAS_DB = [
  {
    id: 202, sourceIds: [2, 3], name: 'Stitch-Totem', rarity: 'Chimera', image: '/cards/c2.png', attack: 35, filter: 'brightness(90%) contrast(150%)',
    lore: 'A towering pillar of stitched biomass and unblinking stares. It judges the unworthy.'
  },
  {
    id: 204, sourceIds: [4, 3], name: 'Stitch-Caff', rarity: 'Chimera', image: '/cards/stitch_caff.jpg', attack: 25,
    lore: 'The ultimate synthesis of flesh and energy. A stitched monstrosity fueled by infinite green sludge.'
  },
  {
    id: 205, sourceIds: [1, 3], name: 'Moon-Torso', rarity: 'Chimera', image: '/cards/moon_torso.png', attack: 20,
    lore: 'A lunar eclipse of stitched flesh. It watches from the center of the world with a single, unblinking eye.'
  },
  {
    id: 206, sourceIds: [5, 6], name: 'Cerebral Bull', rarity: 'Chimera', image: '/cards/bull_brain.png', attack: 180,
    lore: 'A massive indigo beast with an exposed, thinking mind. Its low bellows sound like thousands of whispering voices.'
  },
  {
    id: 207, sourceIds: [2, 7], name: 'Ascendant Totem', rarity: 'Chimera', image: '/cards/totem_goblet.png', attack: 12,
    lore: 'The unblinking gaze ascends from the sacrificial goblet. It has attained a higher state of biomass.'
  },
  {
    id: 208, sourceIds: [1, 8], name: 'Lunatic Splicer', rarity: 'Chimera', image: '/cards/lunatic_splicer.png', attack: 10,
    lore: 'A lunar distortion of flesh and steel. The needles sing when the moon is full.'
  },
  {
    id: 209, sourceIds: [3, 9], name: 'Stitched Observer', rarity: 'Chimera', image: '/cards/stitched_observer.png', attack: 65,
    lore: 'The tattered remains of a torso, now granted the eternal vigil of the black hood. Its gaze is as hollow as its chest.'
  }
];

export const ALL_CARDS = [...CARDS_DB, ...ABOMINATIONS_DB, ...CHIMERAS_DB];

export const COLOSSEUM_CONFIG = {
  unlockCost: 500,
  maxSlots: 5,
  slotCosts: [0, 5000, 20000, 80000, 250000], 
  speeds: [10000, 8000, 6500, 5000, 4000, 3000, 2000, 1500],
  speedCosts: [1000, 3000, 8000, 20000, 50000, 120000, 350000]
};

export const CLICK_POWER_UPGRADES = {
  baseValue: 1,
  powerPerLevel: 1,
  baseCost: 50,
  costMultiplier: 1.8
};
