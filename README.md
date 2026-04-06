# WVU Mario Kart Klub

A single-page website for WVU Mario Kart Klub featuring a canvas-based Banana Dodge mini-game.

**Live site:** https://willwayneharmon-hub.github.io/mario-kart-klub/

## Development

### Prerequisites

Any static file server works. Python 3 is the easiest option (ships with macOS and most Linux distros).

### Running locally

```sh
cd site
python3 -m http.server 8787
```

Open http://localhost:8787 in your browser.

### Project structure

```
site/               # Everything deployed to GitHub Pages
├── index.html       # Single-page entry point
├── css/style.css    # Styles
├── js/game.js       # Banana Dodge mini-game (canvas)
└── js/main.js       # Sound toggle
docs/                # Design documents
├── INTENT.md        # Requirements and goals
└── DESIGN.md        # Technical design spec
```

There is no build step. Edit the files in `site/` and refresh your browser.

### Deploying

Push to `main`. A GitHub Action (`.github/workflows/deploy.yml`) automatically deploys the `site/` directory to GitHub Pages.
