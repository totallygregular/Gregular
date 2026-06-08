# Character Vault — Build Steps

## Phase 1: Project Scaffolding & HTML Structure
- [x] Create file structure: `index.html`, `styles.css`, `script.js`, `assets/`
- [x] Build semantic HTML skeleton: header, card grid container, footer
- [x] Define card HTML template: front face (portrait, name, class label) + back face (name, game/class/build, lore, stat chips)
- [x] Populate 6 sample character cards with placeholder fantasy ARPG data (including a Blood Mage archetype)
- [x] Add placeholder image references in `assets/` with clear filenames
- [x] Set up a JS data array for card content so cards are easy to add/replace later

## Phase 2: Base CSS — Theme, Layout & Typography
- [x] Dark atmospheric background (subtle texture or gradient, not noisy)
- [x] Import/select premium game-adjacent fonts (readable, not cheesy)
- [x] CSS variables for theme colours, spacing, card dimensions
- [x] Responsive card grid (desktop-first, collapses to mobile)
- [x] Basic card sizing, spacing, and container styling

## Phase 3: Card Visual Design — Glass Effect
- [x] Front face: portrait image with dark overlay for text readability
- [x] Frosted/smoked glass overlay using `backdrop-filter`, semi-transparent bg, soft borders, inner highlights
- [x] Centered character name with readable contrast over portrait
- [x] Optional class/subclass label styling
- [x] Back face: layout for name, game/class/build, lore text, stat chips/tags
- [x] Stat chip styling (small pill/tag look, restrained colours)

## Phase 4: 3D Flip Mechanics
- [x] CSS `perspective` on card container
- [x] `transform-style: preserve-3d` on inner flipping element
- [x] `backface-visibility: hidden` on front and back faces
- [x] Back face pre-rotated 180deg
- [x] Click handler: add/remove flipped class with smooth 3D flip animation
- [x] Card scales slightly + translates forward in Z on flip
- [x] Non-selected cards dim when one is expanded
- [x] Close on second click or close button

## Phase 5: Hover Tilt & Reflective Glare
- [x] Track mouse position relative to card on `mousemove`
- [x] Set CSS custom properties (`--tilt-x`, `--tilt-y`, `--glare-x`, `--glare-y`)
- [x] Apply subtle X/Y rotation based on cursor position (few degrees max)
- [x] Reflective glare: pseudo-element or overlay that moves with cursor
- [x] Smooth easing on mouse leave back to neutral
- [x] Use `requestAnimationFrame` or throttled handling for performance

## Phase 6: Expanded/Open State & Keyboard Accessibility
- [ ] Expanded card: larger scale, forward Z translate, flipped to back
- [ ] Dimming/non-interactive state for other cards when one is open
- [ ] Close button on back face
- [ ] Click outside card to close
- [ ] Cards are focusable (`tabindex`)
- [ ] Enter/Space triggers flip/open
- [ ] Escape closes expanded card
- [ ] Visible focus ring styles

## Phase 7: Touch Devices, Accessibility & Performance
- [ ] Detect touch devices — disable live tilt tracking
- [ ] Replace hover tilt with lighter tap interaction on touch
- [ ] `prefers-reduced-motion` — disable or simplify animations
- [ ] Verify text contrast over portrait images
- [ ] Lazy-load card images (`loading="lazy"`)
- [ ] Audit: GPU-friendly transforms only (no layout-triggering props)
- [ ] Ensure layout works without JS (reduced but functional)

## Phase 8: Polish, README & GitHub Pages Deployment
- [ ] Final visual pass: easing curves, glare softness, tilt subtlety
- [ ] Ensure cards feel "premium trading card / codex UI"
- [ ] Write README: file structure, how to replace images, add cards, deploy to GitHub Pages
- [ ] Configure GitHub Pages (settings or `gh-pages` branch)
- [ ] Test deployed site end-to-end
