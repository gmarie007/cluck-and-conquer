# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step, package manager, or dependencies required. Open `index.html` directly in a browser, or serve it locally:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

There are no lint, test, or build commands.

## Architecture

Cluck & Conquer is a cozy productivity app that gamifies task completion as an egg-hatching chicken collection game. It is entirely client-side vanilla JS/HTML/CSS with no framework or bundler.

**Files:**
- `index.html` — single-page HTML with all modals inline
- `styles.css` — all styling; uses CSS variables for the barnyard color palette and handles all animations
- `app.js` — all game logic (~870 lines), organized into clearly commented sections
- `chickens.js` — static chicken catalog data (15 chickens across 3 tiers)

**State management:** A single `state` object is the source of truth, persisted to `localStorage` via `saveState()` / `loadState()`. UI is re-rendered from scratch on each state change (no virtual DOM — cheap at this scale).

**Game loop:**
1. Player clicks the barnyard to place a task egg (name → egg object with `placedTs` timestamp)
2. Eggs progress through 4 phases (5 min each) based on elapsed real time; `tick()` runs every 5s
3. After 20 min, egg is mature; after 12h, it rots
4. Player clicks the mature egg and confirms task completion → `completeEgg()` assigns a random chicken based on egg tier probabilities
5. Chicken displays on board for 60s, then is added to `state.catalog`
6. After 5 eggs resolve in a cycle, a new bank is generated

**Tier system:** Three egg tiers (basic, fancy, rare) defined in `TIER_PROBS` and `BANK_GEN` constants at the top of `app.js`. First bank is always 5 basic eggs; subsequent banks use weighted generation (60% basic, 30% fancy, 10% rare).

**Key constants** (top of `app.js`):
- `PHASE_DURATION_MS` — 5 min per growth phase
- `TOTAL_MATURE_MS` — 20 min to maturity
- `ROTTEN_MS` — 12h until rotten
- `CHICKEN_DISPLAY_MS` — 60s chicken display on board
- `EGG_RADIUS` — 36px collision radius for placement

**Sound:** Procedurally synthesized via Web Audio API in `playHatchSound()` — no audio files.

**Collision detection:** Pythagorean distance check in `canPlace()` prevents egg overlap.

**app.js section order:** Constants → State management → Egg helpers → Egg creation → Rendering → Modals → Game logic → Chicken display → Particles & sound → UI/event listeners → Game tick → Utilities → Initialization
