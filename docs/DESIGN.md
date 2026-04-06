# WVU Mario Kart Klub — Design Document

## 1. Project Structure

```
mario-kart-klub/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages deployment
├── site/
│   ├── index.html              # Single-page entry point
│   ├── css/
│   │   └── style.css           # All styles
│   ├── js/
│   │   ├── game.js             # Mini-game engine + rendering
│   │   └── main.js             # Page interactions (sound toggle, CTA animations)
│   ├── audio/
│   │   ├── engine.mp3          # Kart engine loop (~5 KB, low bitrate)
│   │   ├── coin.mp3            # Coin pickup (~2 KB)
│   │   ├── hit.mp3             # Obstacle hit (~3 KB)
│   │   └── start.mp3           # Race start beep (~2 KB)
│   └── favicon.ico             # Checkered flag or mushroom icon
├── docs/
│   ├── INTENT.md
│   └── DESIGN.md               # This file
├── SEED.md
└── README.md
```

All game sprites are drawn programmatically on canvas — no image assets. Audio files are the only binary assets and are loaded lazily after page paint.

---

## 2. GitHub Action — `deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: site

      - id: deployment
        uses: actions/deploy-pages@v4
```

No build step. The `site/` directory is uploaded directly as a static artifact. Push to `main` → live in under 60 seconds.

---

## 3. Page Layout — `index.html`

The page is a single vertical stack with three zones. On most screens, zones 1 and 2 fill the viewport — no scroll needed to reach the CTA.

```
┌─────────────────────────────────────┐
│            HEADER BAR               │  Fixed top bar: sound toggle, skip game
│                                     │
├─────────────────────────────────────┤
│                                     │
│         GAME CANVAS AREA            │  Full-width, aspect-ratio constrained
│                                     │  Start screen → Gameplay → Game Over
│      ┌───────────────────────┐      │
│      │                       │      │
│      │   <canvas> element    │      │
│      │   480 x 320 logical   │      │
│      │   scales to fit       │      │
│      │                       │      │
│      └───────────────────────┘      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│           HERO SECTION              │  Club name, tagline, CTA
│                                     │
│      WVU MARIO KART KLUB            │
│      "Where friendships go          │
│       to die (on Rainbow Road)"     │
│                                     │
│      ┌─────────────────────┐        │
│      │   JOIN THE KLUB →   │        │  Links to Facebook group
│      └─────────────────────┘        │
│                                     │
├─────────────────────────────────────┤
│  FOOTER                             │  "Built with 🍄 at WVU"
└─────────────────────────────────────┘
```

### HTML Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="WVU Mario Kart Klub — Join the race at West Virginia University">
  <title>WVU Mario Kart Klub</title>
  <link rel="stylesheet" href="css/style.css">
  <link rel="icon" href="favicon.ico">
</head>
<body>
  <header class="top-bar">
    <button id="sound-toggle" aria-label="Toggle sound">🔇</button>
    <button id="skip-game" class="skip-link">Skip to content</button>
  </header>

  <main>
    <section id="game-area" aria-label="Mini-game">
      <canvas id="game-canvas" width="480" height="320"></canvas>
    </section>

    <section id="hero">
      <h1 class="club-title">WVU Mario Kart <span class="klub-k">K</span>lub</h1>
      <p class="tagline">Where friendships go to die (on Rainbow Road)</p>
      <a href="https://facebook.com/groups/1466129588551632/"
         class="cta-button"
         target="_blank"
         rel="noopener noreferrer">
        Join the Klub
      </a>
    </section>
  </main>

  <footer>
    <p>Built with 🍄 at WVU</p>
  </footer>

  <script src="js/game.js" defer></script>
  <script src="js/main.js" defer></script>
</body>
</html>
```

---

## 4. Mini-Game: "Banana Dodge"

Of the three concepts in INTENT.md, **Banana Dodge** is the best fit. It's immediately understandable, requires no tutorial, has natural difficulty progression, produces a score to brag about, and maps cleanly to a canvas implementation.

### 4.1 Game Concept

A kart drives forward on a three-lane road. Obstacles scroll toward the player. Dodge them by switching lanes. Score increases with distance. Speed increases over time. One hit = game over.

### 4.2 Game States

```
┌──────────┐     SPACE/Tap      ┌──────────┐    Collision     ┌───────────┐
│  START   │ ─────────────────→ │ PLAYING  │ ──────────────→  │ GAME OVER │
│  SCREEN  │                    │          │                   │           │
└──────────┘                    └──────────┘                   └───────────┘
      ↑                                                             │
      └─────────────────── SPACE/Tap ───────────────────────────────┘
```

**Start Screen**
- Road scrolls slowly in the background (attract mode)
- Title: "BANANA DODGE" in pixel font
- Controls display:
  - Desktop: "← → Arrow Keys to Move | SPACE to Start"
  - Mobile: "Swipe Left/Right to Move | Tap to Start"
- Blinking "PRESS START" prompt at bottom

**Playing**
- Road scrolls downward, speed increases every 5 seconds
- Player kart fixed near bottom, moves between 3 lanes
- Obstacles spawn at top, scroll down
- Score counter in top-right corner (distance-based, +1 per frame)
- Coin pickups appear occasionally for bonus points (+50)

**Game Over**
- Kart spin-out animation (rotation + bounce)
- "GAME OVER" text with final score
- "Your Score: 1,247" with a simple message based on score tier
- "PRESS START to retry" prompt
- CTA appears: "Or join the real race →" linking to the Facebook group

### 4.3 Game Objects

All drawn with canvas primitives — no sprite sheets.

#### Player Kart
```
Top-down view, ~24x32 pixels logical size

   ┌──────┐
   │ ████ │   ← Windshield (dark blue)
   │██████│   ← Body (WVU gold #EAAA00)
   │█ ██ █│   ← Wheels (dark gray) + body
   │██████│
   │█    █│   ← Rear wheels
   └──────┘

Drawn as a series of fillRect calls:
- Body: rounded rectangle, WVU gold
- Wheels: 4 small dark rectangles at corners
- Windshield: darker rectangle on top third
- Number: small "K" on the body center
```

#### Obstacles

| Object       | Shape                          | Color          | Behavior            |
|--------------|--------------------------------|----------------|---------------------|
| Banana Peel  | Crescent / curved triangle     | Yellow (#FFD700)| Static, scrolls down |
| Green Shell  | Circle with inner spiral       | Green (#00AA00) | Static, scrolls down |
| Oil Slick    | Ellipse                        | Dark gray, semi-transparent | Wider hitbox, scrolls down |
| Bob-omb      | Circle with fuse line          | Black + red fuse | Appears at higher speeds only |

#### Pickups

| Object       | Shape                          | Color          | Effect              |
|--------------|--------------------------------|----------------|---------------------|
| Coin         | Small circle with inner shine  | Gold (#FFD700)  | +50 points          |
| Item Box     | Rotating square with "?"       | Rainbow outline | +100 points, screen flash |

### 4.4 Road & Environment

```
Canvas (480 x 320 logical pixels, scaled to fit container)

┌───────────────────────────────────────────────┐
│ ▒▒▒▒│    Lane 1   │   Lane 2   │   Lane 3  │▒▒▒▒│
│ ▒▒▒▒│             │            │           │▒▒▒▒│
│ ▒▒▒▒│      🍌     │            │    ●      │▒▒▒▒│  ← obstacles
│ ▒▒▒▒│             │            │           │▒▒▒▒│
│ ▒▒▒▒│             │     ◆      │           │▒▒▒▒│  ← coin
│ ▒▒▒▒│             │            │           │▒▒▒▒│
│ ▒▒▒▒│             │   [KART]   │           │▒▒▒▒│  ← player
│ ▒▒▒▒│─────────────│────────────│───────────│▒▒▒▒│
└───────────────────────────────────────────────┘
  grass    dashed lane markers (scroll)         grass
```

- **Road surface:** Dark gray (`#333`)
- **Lane dividers:** White dashed lines, scroll downward to create speed illusion
- **Grass/shoulder:** Green strips (`#2D5016`) on left and right edges, with subtle checkerboard pattern to reinforce scrolling
- **Road edges:** Solid white lines

The dashed lane markers are the primary visual cue for speed. Their scroll rate = current game speed. As the game gets harder, they blur past faster.

### 4.5 Difficulty Curve

```
Time (seconds)    Scroll Speed (px/frame)    Obstacle Density     New Obstacles
0–5               2                          Low (1 per 90 frames)  Bananas only
5–15              3                          Medium (1 per 60)      + Green Shells
15–30             4                          High (1 per 40)        + Oil Slicks
30–45             5                          High (1 per 30)        + Bob-ombs
45+               5.5 (cap)                  Very High (1 per 25)   All types, multi-lane
```

Obstacles never fully block all three lanes at once — there is always a gap. At high density, gaps narrow to a single lane, requiring quick reactions.

### 4.6 Controls

| Platform | Move Left  | Move Right | Start / Restart |
|----------|-----------|------------|-----------------|
| Desktop  | `←` or `A` | `→` or `D` | `Space`         |
| Mobile   | Swipe left | Swipe right| Tap             |

Lane switching is instant (no tween). The kart snaps to the target lane. This feels more arcade-like and avoids frustrating "I pressed it but it didn't register" moments.

Swipe detection: a horizontal touch delta > 30px within 300ms triggers a lane change. Tap (< 10px movement) triggers start/restart.

### 4.7 Scoring

```
Base score:     +1 per frame survived (at 60fps, ~60 points/second)
Coin pickup:    +50
Item box:       +100
```

Score tiers displayed on game over:

| Score Range  | Message                                      |
|-------------|----------------------------------------------|
| 0–499       | "Did you even try?"                          |
| 500–1999    | "Not bad, but Toad would've done better."    |
| 2000–4999   | "Solid run! You might survive race night."   |
| 5000–9999   | "Impressive! You're Klub material."          |
| 10000+      | "Legendary. See you on Rainbow Road."        |

### 4.8 Audio

All audio is **muted by default**. A speaker icon in the header bar toggles sound on/off. State is saved in `localStorage`.

| Sound      | Trigger                | Description                    | Format      |
|-----------|------------------------|--------------------------------|-------------|
| `engine`  | Game start → game over | Low hum loop, pitch increases with speed | MP3, ~5 KB |
| `coin`    | Coin/item pickup       | Classic coin "ding"            | MP3, ~2 KB  |
| `hit`     | Collision              | Thud + skid                    | MP3, ~3 KB  |
| `start`   | Game start             | 3-2-1-GO beep sequence         | MP3, ~2 KB  |

Audio files are loaded via `new Audio()` after the first user interaction (to comply with autoplay policies). Total audio budget: ~12 KB.

If audio assets aren't available at build time, the game works perfectly without them — all audio code is wrapped in null checks.

### 4.9 Canvas Rendering

- **Logical resolution:** 480 x 320 (3:2 aspect ratio)
- **Physical scaling:** Canvas CSS width is `100%` of its container (max 600px). The `width`/`height` attributes stay at 480/320. This gives crisp pixel-art rendering at any screen size.
- **Render loop:** `requestAnimationFrame` with delta-time accumulator for consistent speed regardless of frame rate
- **No image assets:** Every sprite is drawn with `fillRect`, `arc`, `beginPath`/`lineTo`. This keeps the game at 0 KB of image downloads and gives it a deliberately retro, programmer-art aesthetic that fits the vibe.

```javascript
// Simplified render loop structure
let lastTime = 0;
const TICK = 1000 / 60; // 60 fps target
let accumulator = 0;

function loop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += delta;

  while (accumulator >= TICK) {
    update();        // physics, collision, spawning
    accumulator -= TICK;
  }

  render();          // draw everything
  requestAnimationFrame(loop);
}
```

---

## 5. Visual Design — CSS

### 5.1 Color Tokens

```css
:root {
  /* WVU */
  --wvu-gold: #EAAA00;
  --wvu-blue: #002855;

  /* Mario Kart */
  --mk-red: #E52521;
  --mk-green: #00A651;
  --mk-yellow: #FFD700;
  --mk-blue: #009BDF;

  /* Surface */
  --bg-dark: #0a0e1a;
  --bg-card: #141829;
  --text-primary: #f0f0f0;
  --text-muted: #8892a4;

  /* Rainbow Road gradient */
  --rainbow: linear-gradient(
    90deg,
    #E52521, #FF6F00, #FFD700, #00A651, #009BDF, #7B2FBE
  );
}
```

### 5.2 Typography

Two font stacks, no external font files:

```css
/* Headings — system chunky fonts with pixel-font fallback */
.club-title, .game-text {
  font-family: "Trebuchet MS", "Arial Black", Impact, sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Body */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

No Google Fonts, no CDN requests. Zero render-blocking external resources.

### 5.3 CTA Button

```css
.cta-button {
  display: inline-block;
  padding: 16px 48px;
  background: var(--wvu-gold);
  color: var(--wvu-blue);
  font-size: 1.25rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-decoration: none;
  border: 3px solid transparent;
  border-image: var(--rainbow) 1;
  transition: transform 0.15s, box-shadow 0.15s;
}

.cta-button:hover,
.cta-button:focus-visible {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(234, 170, 0, 0.4);
}
```

The button uses WVU gold as its fill and a Rainbow Road gradient as its border — the two brand identities merged into one element.

### 5.4 Background

The `<body>` background is `--bg-dark` with a subtle CSS checkered pattern:

```css
body {
  background-color: var(--bg-dark);
  background-image:
    linear-gradient(45deg, #0f1325 25%, transparent 25%),
    linear-gradient(-45deg, #0f1325 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #0f1325 75%),
    linear-gradient(-45deg, transparent 75%, #0f1325 75%);
  background-size: 40px 40px;
  background-position: 0 0, 0 20px, 20px -20px, -20px 0;
}
```

Low contrast so it reads as texture, not pattern.

### 5.5 Animations

```css
/* Blinking "PRESS START" — classic arcade feel */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.press-start { animation: blink 1s step-end infinite; }

/* CTA pulse — draws the eye without being obnoxious */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(234, 170, 0, 0.3); }
  50% { box-shadow: 0 0 24px rgba(234, 170, 0, 0.6); }
}
.cta-button { animation: pulse-glow 2s ease-in-out infinite; }

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.6 Responsive Breakpoints

```css
/* Mobile-first base styles, then: */
@media (min-width: 640px) {
  /* Tablet: game canvas gets more breathing room */
}
@media (min-width: 1024px) {
  /* Desktop: max-width container, centered layout */
}
```

The canvas scales fluidly via `width: 100%; height: auto;` on the element, so no media queries are needed for the game itself.

---

## 6. Accessibility

| Requirement                    | Implementation                                                    |
|-------------------------------|-------------------------------------------------------------------|
| Skip game                     | "Skip to content" button in header, visible on focus, jumps to `#hero` |
| Keyboard navigation           | All interactive elements are `<button>` or `<a>`, natural tab order |
| Screen reader game state      | `aria-live="polite"` region announces score milestones and game over |
| Color contrast                | Gold on dark navy = 8.2:1 ratio (AAA). White on dark = 14.7:1.    |
| Reduced motion                | `prefers-reduced-motion` disables all CSS animations; game runs but road doesn't scroll decoratively on start screen |
| Touch targets                 | CTA button minimum 48x48px tap target. Sound toggle same.         |

---

## 7. Performance Budget

| Asset              | Target Size | Notes                              |
|-------------------|-------------|-------------------------------------|
| `index.html`      | < 3 KB      | Semantic markup, no inline styles   |
| `style.css`       | < 5 KB      | No framework, hand-written          |
| `game.js`         | < 15 KB     | Canvas game, all sprites procedural |
| `main.js`         | < 2 KB      | Sound toggle, minor DOM interaction |
| Audio (total)     | < 15 KB     | 4 short MP3 clips, low bitrate      |
| `favicon.ico`     | < 2 KB      | Simple 16x16 + 32x32               |
| **Total**         | **< 42 KB** |                                     |

First paint requires only `index.html` + `style.css` = ~8 KB. JavaScript and audio load deferred and don't block rendering.

---

## 8. Implementation Order

Build in four phases, each independently deployable:

### Phase 1 — Static Shell
- `index.html` with hero section, CTA button, footer
- `style.css` with full visual design (colors, typography, layout, animations)
- GitHub Action deploys to Pages
- **Milestone:** Site is live with club name and Facebook link. Functional if nothing else ships.

### Phase 2 — Game Foundation
- `game.js` with canvas setup, render loop, road drawing, player kart
- Start screen with "PRESS START" prompt
- Player movement (3 lanes, keyboard + touch)
- **Milestone:** Kart drives on a scrolling road. No obstacles yet.

### Phase 3 — Gameplay
- Obstacle spawning, scrolling, collision detection
- Coin/item pickups
- Score counter
- Difficulty curve (speed + density ramp)
- Game over screen with score tier message and CTA
- **Milestone:** Complete playable game.

### Phase 4 — Polish
- Audio integration (engine loop, coin ding, hit sound, start beep)
- Sound toggle with localStorage persistence
- Particle effects on collision (optional, canvas-based)
- Final pass on mobile touch feel
- Lighthouse audit and fixes
- **Milestone:** Ship it.
