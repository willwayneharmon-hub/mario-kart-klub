# WVU Mario Kart Klub — Intent & Requirements

## Overview

A single-page website for **WVU Mario Kart Klub**, a student-run Mario Kart club at West Virginia University. The site serves as the club's public face — equal parts advertisement, vibe check, and proof that these people know how to have a good time. It should feel like the love child of a retro game menu and a modern landing page.

The centerpiece is a playable mini-game embedded directly in the page, giving visitors an immediate taste of the club's energy before they even join.

---

## Audience

- WVU students browsing on their phones between classes
- People who see a flyer, scan a QR code, and land here
- Anyone sent the link in a group chat

They'll spend 10–60 seconds here. The site needs to hook them instantly and funnel them to the Facebook group.

---

## Core Content

### 1. Club Identity
- **Title:** "WVU Mario Kart Klub" — displayed prominently, unmissable
- **Tagline/subtitle:** Something short and punchy that communicates the vibe (e.g., "Race night. Every week. No items banned.")
- **WVU tie-in:** Incorporate WVU's gold and blue palette alongside Mario Kart's signature colors — the mashup should feel intentional, not clashing

### 2. Call to Action — Facebook Group
- **Link:** https://facebook.com/groups/1466129588551632/
- This is the single most important action a visitor can take
- The button/link should be visually dominant — large, styled, impossible to miss
- Consider a "Join the Klub" button that pulses or animates subtly to draw the eye
- Should be visible without scrolling on both desktop and mobile

### 3. Mini-Game
The site's signature feature. A simple, browser-based game that captures the feel of Mario Kart without being a full kart racer. This is the "wow factor" — the thing that makes people send the link to their friends.

#### Game Concept Options (pick one or blend):

**Option A — Top-Down Kart Sprint**
A simplified top-down kart that drives along a short looping track. No opponents, no laps — just the satisfying feel of steering a kart around corners. Think the SNES Mario Kart overworld map crossed with a screensaver.

**Option B — Banana Dodge**
An endless runner / dodge game. Your kart moves along a straight road and you dodge banana peels, green shells, and oil slicks. Tap/click or use arrow keys. Score counter. Gets faster over time. Dead simple, immediately fun.

**Option C — Item Roulette**
A slot-machine-style item box spinner. Click to "hit" the item box, watch it cycle through items (mushroom, star, blue shell, banana, etc.) and land on one. Purely cosmetic / luck-based but satisfying with the right animation and sound. Could display a fun message per item ("You got a Blue Shell — you're THAT person").

#### Game UX Flow
1. **Start screen** — overlays or replaces the main content area
   - Shows game title / mini logo
   - Displays controls clearly (arrow keys / WASD / tap)
   - "Press SPACE to Start" or "Tap to Start" prompt — retro arcade style
   - Maybe a blinking cursor or animation to signal interactivity
2. **Gameplay** — smooth, responsive, runs at 60fps on a 2020 phone
3. **Game over / idle state** — game fades or the CTA to join the Facebook group appears naturally ("Nice run! Now join the real race →")

#### Game Technical Constraints
- Pure HTML5 Canvas or DOM-based — no heavy frameworks, no WebGL required
- Must load fast — no large asset downloads; pixel art or vector sprites keep it lightweight
- Touch-friendly for mobile players
- Sound effects optional but impactful if included (coin sounds, engine hum, shell hit) — muted by default, with a visible toggle
- Should not block or delay the rest of the page from loading

---

## Visual Design

### Aesthetic: "Retro Arcade Meets Modern Web"
The site should feel like you walked into a dimly lit arcade and found a glowing cabinet — but the cabinet was designed by someone who also knows what Tailwind is.

### Key Visual Elements

- **Typography:** A chunky, rounded display font for headings (think bubble letters or pixel fonts). Clean sans-serif for body text. The "K" in "Klub" could get special treatment — maybe styled differently or replaced with a Mario Kart-inspired icon/glyph.
- **Color palette:**
  - Mario reds, greens, yellows, and blues
  - WVU old gold (#EAAA00) and blue (#002855)
  - Dark background (charcoal or deep navy) to make colors pop — gives that "arcade in the dark" feel
- **Pixel art / sprites:** Small pixel-art decorations — item boxes, banana peels, shells, mushrooms scattered as accents. Not overwhelming, just enough to set the mood.
- **Animations:**
  - Subtle floating/bobbing on decorative elements (like item boxes)
  - Rainbow Road-inspired gradient borders or dividers
  - Star power shimmer effect on hover states
  - Smooth scroll transitions if the page has sections
- **Background:** Could feature a very subtle, slow-scrolling parallax of a simplified Rainbow Road or checkered flag pattern. Low opacity so it doesn't compete with content.

### Layout
- **Single page, minimal scroll** — everything important is above the fold
- **Mobile-first** — most visitors will be on phones
- **Sections (top to bottom):**
  1. Hero: Club name + tagline + CTA button
  2. Mini-game area (or the game IS the hero)
  3. Footer: Secondary links, maybe a "Built with 🍄 at WVU" tagline

---

## Technical Architecture

### Stack
- **Static HTML/CSS/JS** — no framework, no build step, no server
- Vanilla JavaScript for the mini-game and any interactivity
- CSS animations over JS animations where possible (performance, simplicity)
- A single `index.html` with inlined or co-located CSS/JS, or a small set of files (`style.css`, `game.js`)

### Hosting & Deployment
- **GitHub Pages** from the `main` branch (or a `docs/` folder, or `gh-pages` branch)
- **GitHub Action** for deployment — triggers on push to `main`
  - Action should build (if needed) and deploy to GitHub Pages
  - Use the official `actions/deploy-pages` workflow
  - Keep it simple: no staging environments, no preview deploys

### Performance Goals
- **< 1 second** to first meaningful paint on a 4G connection
- **< 500 KB** total page weight (ideally under 200 KB)
- No external dependencies that block rendering (no jQuery, no Bootstrap, no CDN fonts that delay paint)
- Lighthouse score: aim for 95+ across all categories

### Browser Support
- Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest 2 versions)
- Mobile Safari and Chrome on iOS/Android
- No IE11. It's 2026.

### Accessibility
- Keyboard navigable
- Sufficient color contrast on all text
- Game should be skippable — visitors who can't or don't want to play should still reach the CTA easily
- Semantic HTML (`<main>`, `<nav>`, `<footer>`, `<button>`)
- `prefers-reduced-motion` should disable non-essential animations

---

## Personality & Tone

The site should feel like it was made by people who:
- Take Mario Kart seriously but don't take themselves seriously
- Know their way around a website but chose to make it fun instead of corporate
- Would absolutely trash-talk you over a blue shell but also bring snacks to game night

**Voice examples:**
- "WVU Mario Kart Klub — Where friendships go to die (on Rainbow Road)"
- "Join us. We have controllers."
- "No blue shell is safe."

---

## What Success Looks Like

A WVU student clicks the link. They see the club name, think "oh this is sick," play the mini-game for 15 seconds, laugh, hit "Join the Klub," and end up in the Facebook group. Total time on site: under a minute. They send the link to two friends.

---

## Out of Scope (for now)

- Event calendar or schedule
- Member profiles or roster
- Blog or news section
- Backend / database / auth
- Custom domain (GitHub Pages default is fine to start)
- Multiple pages or routing
