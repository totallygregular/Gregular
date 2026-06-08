# Character Vault

A dark fantasy character card archive built with vanilla HTML, CSS, and JavaScript. Designed for GitHub Pages deployment.

## File Structure

```
├── index.html          # Main page with semantic HTML structure
├── styles.css          # All styling: theme, layout, card effects, animations
├── script.js           # Card data, rendering, and interaction logic
├── assets/             # Character portrait images
│   ├── blood-mage.png
│   ├── shadow-rogue.png
│   ├── storm-warden.png
│   ├── bone-sentinel.png
│   ├── flame-dancer.png
│   └── void-walker.png
├── Instructions.txt    # Original project scope
└── STEPS.md            # Build phases and progress tracker
```

## How to Replace Images

1. Add your portrait images to the `assets/` folder
2. Use the same filenames (e.g., `blood-mage.png`) or update the `portrait` path in `script.js`
3. Recommended dimensions: **400x600px** or similar portrait aspect ratio
4. Format: PNG or JPG

## How to Add New Cards

Edit the `characters` array in `script.js`. Each card is an object:

```js
{
    id: 'unique-id',              // Unique identifier (used for data attribute)
    name: 'Character Name',       // Display name (front and back)
    class: 'Class Name',          // Shown on front face
    portrait: 'assets/file.png',  // Path to portrait image
    game: 'Game Title',           // Shown on back face
    build: 'Build Name',          // Shown on back face
    lore: 'Character backstory or notes...',  // Lore text on back
    stats: ['Stat1', 'Stat2', 'Stat3']        // Stat chips on back
}
```

Add a new object to the array and the card will appear automatically.

## How to Deploy to GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings** > **Pages**
3. Under **Source**, select the branch (usually `main`) and folder (`/root`)
4. Click **Save**
5. Your site will be live at `https://<username>.github.io/<repository-name>/`

## Features

- **3D card flip** with smooth animation
- **Hover tilt** that follows cursor position
- **Reflective glare** that moves with the cursor
- **Keyboard accessible** (Tab, Enter/Space, Escape)
- **Touch device support** (tilt disabled, tap to flip)
- **Reduced motion** support via `prefers-reduced-motion`
- **No-JS fallback** (static cards visible without JavaScript)

## Browser Support

Modern browsers with support for:
- CSS `backdrop-filter`
- CSS `transform-style: preserve-3d`
- CSS Grid
- ES6 JavaScript
