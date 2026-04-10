# 🐣 Cluck & Conquer

A cozy barnyard-themed productivity app where tasks are eggs that hatch into collectible chickens.

## File Tree

```
cluck-and-conquer/
├── index.html      — Main HTML structure
├── styles.css      — All styling (CSS variables, animations, layout)
├── chickens.js     — Chicken data: 15 collectibles across 3 tiers
├── app.js          — All game logic, state, localStorage persistence
└── README.md       — This file
```

## How to Run

1. Open `index.html` in any modern browser.
2. No build step, no server, no dependencies beyond Google Fonts (loaded via CDN).

For fully offline use, download the two Google Fonts locally and update the `<link>` tags in `index.html`.

## Gameplay Quick Reference

- **Click the barnyard** to place an egg (costs one from your bank of 5)
- **Name your task** when prompted
- Eggs go through **4 phases** over 20 minutes
- When the egg is glowing and ready, **click it → check "Task Complete! Hatch!"**
- Watch your chicken appear on the board for 1 minute!
- **Rotten eggs** (12h+) must be acknowledged and cleared — no chicken reward
- After **all 5 eggs are resolved**, claim a new bank
- Browse the **📖 Catalog** to track your collection

## Tiers & Probabilities

| Egg Tier | Rewards |
|----------|---------|
| Basic    | 50% basic, 50% fancy |
| Fancy    | 50% fancy, 50% rare |
| Rare     | 25% basic, 50% fancy, 25% rare |

New banks (after first) generate eggs randomly: 60% basic, 30% fancy, 10% rare.

## Chicken Roster

### Basic
- Clementine, Biscuit, Patches, Nugget, Henny Penny

### Fancy
- Countess Fluffington, Marigold, Sir Reginald Feathers, Rosalind, Persimmon

### Rare
- Duchess Opaline, Emperor Goldcrest, La Noire, Celestia, The Gilded Hen
