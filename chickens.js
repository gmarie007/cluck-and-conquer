// ============================================================
//  CHICKEN CATALOG DATA — chickens.js
//  15 collectible chickens: 5 basic, 5 fancy, 5 rare
// ============================================================

const CHICKEN_DATA = [
  // ─── BASIC ───────────────────────────────────────────────
  {
    id: "basic_1",
    tier: "basic",
    name: "Clementine",
    emoji: "🐔",
    color: "#e8a84a",
    description: "A dependable, sunny hen who rises early and never misses a morning. She's the backbone of any barnyard, cheerful and steady.",
    trait: "Early Riser",
    talent: "Reliably lays eggs right after sunrise, no alarm required.",
  },
  {
    id: "basic_2",
    tier: "basic",
    name: "Biscuit",
    emoji: "🐓",
    color: "#c49a6c",
    description: "Round and warm like fresh cornbread, Biscuit is the barnyard's gentle greeter. Nobody has a bad morning when Biscuit's around.",
    trait: "Warm-Natured",
    talent: "Calms skittish animals with a soft cluck.",
  },
  {
    id: "basic_3",
    tier: "basic",
    name: "Patches",
    emoji: "🐔",
    color: "#a0522d",
    description: "A patchwork hen of brown and cream, Patches has an excellent memory for hiding spots and always finds the best seeds.",
    trait: "Sharp Memory",
    talent: "Memorizes every feeder location within 100 paces.",
  },
  {
    id: "basic_4",
    tier: "basic",
    name: "Nugget",
    emoji: "🐤",
    color: "#f5c842",
    description: "Still a bit fluffy around the edges, Nugget is eternally optimistic. Every day is the best day to be a chicken.",
    trait: "Eternal Optimist",
    talent: "Lifts barnyard morale just by showing up.",
  },
  {
    id: "basic_5",
    tier: "basic",
    name: "Henny Penny",
    emoji: "🐔",
    color: "#b5651d",
    description: "An old soul with folksy wisdom. Henny Penny has seen three harvests and knows when rain is coming before the clouds do.",
    trait: "Weather Sense",
    talent: "Predicts rain two hours in advance with 94% accuracy.",
  },

  // ─── FANCY ───────────────────────────────────────────────
  {
    id: "fancy_1",
    tier: "fancy",
    name: "Countess Fluffington",
    emoji: "🦚",
    color: "#9b59b6",
    description: "Draped in iridescent plumage and perpetually composed, the Countess believes every meal is a dinner party and every puddle is a mirror.",
    trait: "Aristocratic Poise",
    talent: "Makes any space feel fancier simply by standing in it.",
  },
  {
    id: "fancy_2",
    tier: "fancy",
    name: "Marigold",
    emoji: "🌼",
    color: "#f39c12",
    description: "A Buff Orpington with a magnificent golden ruff. Marigold hums softly while she forages and has been known to inspire poetry.",
    trait: "Golden Touch",
    talent: "Her eggs are rumored to taste faintly of butter.",
  },
  {
    id: "fancy_3",
    tier: "fancy",
    name: "Sir Reginald Feathers",
    emoji: "🎩",
    color: "#2c3e50",
    description: "A distinguished Barred Plymouth Rock with a dignified comb and a stare that conveys deep, unspoken wisdom. Very debonair.",
    trait: "Distinguished Air",
    talent: "Other roosters defer to his judgment on all matters.",
  },
  {
    id: "fancy_4",
    tier: "fancy",
    name: "Rosalind",
    emoji: "🌹",
    color: "#e74c3c",
    description: "A striking Rhode Island Red who strides through the yard like she owns the deed to it. Bold, decisive, and unapologetically loud.",
    trait: "Natural Authority",
    talent: "Convinces hawks to find a different barnyard.",
  },
  {
    id: "fancy_5",
    tier: "fancy",
    name: "Persimmon",
    emoji: "🍂",
    color: "#d35400",
    description: "A Welsummer hen with earth-toned speckled feathers that look like a watercolor painting. She naps in sunbeams and dreams vividly.",
    trait: "Artistic Soul",
    talent: "Her footprints in the mud look like abstract art.",
  },

  // ─── RARE ────────────────────────────────────────────────
  {
    id: "rare_1",
    tier: "rare",
    name: "Duchess Opaline",
    emoji: "💎",
    color: "#1abc9c",
    description: "An opal-feathered Silkie of near-mythical reputation. She shimmers blue-green at dusk and has never once been ruffled by anything.",
    trait: "Unshakeable Calm",
    talent: "Can stop a thunderstorm argument with a single look.",
  },
  {
    id: "rare_2",
    tier: "rare",
    name: "Emperor Goldcrest",
    emoji: "👑",
    color: "#f1c40f",
    description: "A golden-combed Yokohama whose tail feathers trail nearly three feet. He is slow to appear and impossible to forget.",
    trait: "Legendary Plumage",
    talent: "His tail feathers are believed to bring good fortune.",
  },
  {
    id: "rare_3",
    tier: "rare",
    name: "La Noire",
    emoji: "🖤",
    color: "#2c2c54",
    description: "An Ayam Cemani: pure black from beak to bone. La Noire is silent, graceful, and seems to absorb light itself.",
    trait: "Void Walker",
    talent: "Moves without making a single sound. Ever.",
  },
  {
    id: "rare_4",
    tier: "rare",
    name: "Celestia",
    emoji: "✨",
    color: "#8e44ad",
    description: "A lavender Araucana who lays pale blue-green eggs. Celestia is rumored to have been hatched under a meteor shower.",
    trait: "Cosmic Origin",
    talent: "Lays eggs that shimmer faintly in moonlight.",
  },
  {
    id: "rare_5",
    tier: "rare",
    name: "The Gilded Hen",
    emoji: "🌟",
    color: "#ff6b6b",
    description: "No one knows her true breed. She appeared one harvest morning, iridescent and proud. Every barnyard has a story about her.",
    trait: "Mysterious Provenance",
    talent: "Her presence alone doubles the joy of a completed task.",
  },
];

// Quick lookup map
const CHICKEN_MAP = {};
CHICKEN_DATA.forEach(c => { CHICKEN_MAP[c.id] = c; });

// Tier arrays
const CHICKENS_BY_TIER = {
  basic:  CHICKEN_DATA.filter(c => c.tier === "basic"),
  fancy:  CHICKEN_DATA.filter(c => c.tier === "fancy"),
  rare:   CHICKEN_DATA.filter(c => c.tier === "rare"),
};
