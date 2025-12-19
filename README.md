<img width="1426" height="895" alt="image" src="https://github.com/user-attachments/assets/665fdaae-78ae-4b1c-b4ed-bf86fdb51ddd" />


# Edge Runner

A neon, side-scrolling runner built with plain HTML, CSS, and JavaScript (no
canvas). Originally started as a replacement for a course project (PP1), but the real
goal was getting sharp with DOM updates, input handling, timing loops, and
keeping game state sane.

## Table of Contents

- [Features](#features)
- [Controls](#controls)
- [Getting Started](#getting-started)
- [Gameplay Notes](#gameplay-notes)
- [Tech Notes](#tech-notes)
- [Project Structure](#project-structure)
- [Development Notes](#development-notes)
- [Legal](#legal)
- [License](#license)

## Features

- Side-scrolling runner with a neon UI
- HTML/CSS visuals (SVG only for spike outlines)
- SAT-style collision checks (runner is a rotating quad)
- Score system with multiplier tiers and speed ramping over time

## Controls

- **Move:** A / D or ← / →
- **Jump:** Space
  - Tap = small jump
  - Hold = charge higher jump
  - Release = jump

Start a run by clicking **Start Run** (or clicking/tapping inside the play
area).

## Getting Started

This project uses ES modules (`<script type="module">`), so it must be served
from a local web server.  
Opening `index.html` directly from the file system may break module imports.

Choose one:

- **VS Code:** Run **Live Server** and open `index.html`
- **Node:** `npx serve .`
- **Python:** `python -m http.server` then open `http://localhost:8000`

## Gameplay Notes

- The track and obstacles are aligned to a single grid (tile size matches the
  runner size).
- Obstacles always spawn with exactly **5 empty tiles** between them.
- Ceiling hazards keep the spike tip within **70px** of the track
  (tile-quantized).
- Score increases when passing obstacles.
- Every **20 seconds** the multiplier tier increases and world speed ramps up.
- Track hue blends smoothly near tier boundaries.

## Tech Notes

- Rendering is driven by a single scroll coordinate: `worldScrollPx`
- All visuals are DOM + CSS (no Canvas or WebGL)
- Collision detection uses polygon overlap checks (SAT-style)

## Project Structure

- `index.html` — Layout and overlays; loads the module entrypoint
- `style.css` — Central stylesheet that `@import`s files from `css/`
- `css/` — Split styles  
  (tokens / reset / layout / game / ui / obstacles / animations / responsive)
- `js/main.js` — Entrypoint; wires events and runs the main loop
- `js/modules/` — Focused modules  
  (`context`, `runner`, `track`, `obstacles`, `particles`, `hud`, `utils`,
  `input`)

## Development Notes

- `script.js` is a legacy file and is **not** used by `index.html`
- No build step required
- If a build tool is added later (Vite, Parcel, etc.), `.gitignore` already
  covers common output folders

## Legal

- Privacy Policy: `privacy.html` (collects 0 data)
- Terms of Service: `terms.html`

## License

No license file is included yet.  
If you want this project to be open-source friendly, add a `LICENSE` file (MIT
is a common choice for portfolio projects).
