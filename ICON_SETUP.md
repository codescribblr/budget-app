# App Icon Setup

## Overview

The Budget App icon features an **envelope with ascending bars** inside, symbolizing:
- **Envelope** → Envelope budgeting methodology
- **Ascending bars** → Progress, trends, and financial growth
- **Colors** → Top 3 colors from the spending distribution pie chart

---

## Icon Files

### Source
- **`public/icon.svg`** - Master SVG icon (64×64 viewBox)
- **`src/app/icon.svg`** - Copy for Next.js file-based metadata

### Generated Sizes
- **`public/favicon.ico`** - Multi-size ICO (16×16, 32×32, 48×48) for legacy browsers
- **`public/favicon-16x16.png`** - Small favicon
- **`public/favicon-32x32.png`** - Standard favicon
- **`public/apple-icon.png`** - iOS home screen icon (180×180)
- **`public/icon-192.png`** - Android home screen icon (192×192)
- **`public/icon-512.png`** - High-res Android icon (512×512)

### Manifest
- **`public/manifest.json`** - PWA manifest for "Add to Home Screen" functionality

---

## Design Specifications

### Colors
- **Background:** `#0F172A` (slate-900, dark mode friendly)
- **Envelope stroke:** `#F9FAFB` (white/gray-50)
- **Bar 1 (left):** `#0088FE` (blue) - from pie chart color palette
- **Bar 2 (middle):** `#00C49F` (teal/green) - from pie chart color palette
- **Bar 3 (right):** `#FFBB28` (amber/yellow) - from pie chart color palette

### Dimensions
- **Rounded square:** 56×56 with 14px border radius
- **Envelope:** 32×22 with 4px border radius
- **Bars:** 6px wide, heights: 7px, 11px, 15px (ascending)

---

## Browser & Platform Support

### ✅ Desktop Browsers
- **Chrome/Edge:** Uses `favicon-32x32.png` and `icon.svg`
- **Firefox:** Uses `favicon-32x32.png` and `favicon.ico`
- **Safari:** Uses `apple-icon.png` and `favicon.ico`

### ✅ Mobile Devices
- **iOS (Safari):** Uses `apple-icon.png` (180×180)
- **Android (Chrome):** Uses `icon-192.png` and `icon-512.png` from manifest
- **PWA "Add to Home Screen":** Uses manifest.json with all icon sizes

### ✅ Desktop Shortcuts
- **Windows:** Uses `favicon.ico` or `icon-192.png`
- **macOS:** Uses `apple-icon.png` or `icon-512.png`
- **Linux:** Uses `icon-192.png` or `icon-512.png`

---

## Configuration

### Next.js Metadata (`src/app/layout.tsx`)

```typescript
export const metadata: Metadata = {
  title: "Budget App",
  description: "Envelope budgeting made simple",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Budget",
  },
  applicationName: "Budget App",
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};
```

---

## Regenerating Icons

If you need to regenerate the PNG icons from the SVG source:

```bash
# Install ImageMagick (if not already installed)
brew install imagemagick

# Generate all sizes
magick public/icon.svg -resize 192x192 public/icon-192.png
magick public/icon.svg -resize 512x512 public/icon-512.png
magick public/icon.svg -resize 180x180 public/apple-icon.png
magick public/icon.svg -resize 32x32 public/favicon-32x32.png
magick public/icon.svg -resize 16x16 public/favicon-16x16.png
magick public/icon.svg -define icon:auto-resize=16,32,48 public/favicon.ico
```

---

## Testing

### Browser Tab Icon
1. Open the app in a browser
2. Check the browser tab for the icon
3. Should see the envelope+bars icon

### Desktop Shortcut
1. **Chrome/Edge:** Click ⋮ → "Install Budget App" or "Create shortcut"
2. **Safari:** File → "Add to Dock"
3. Check desktop/dock for the icon

### Mobile Home Screen
1. **iOS Safari:** Share → "Add to Home Screen"
2. **Android Chrome:** ⋮ → "Add to Home screen"
3. Check home screen for the icon

---

## File Sizes

- `icon.svg`: ~800 bytes
- `favicon.ico`: ~15 KB
- `favicon-16x16.png`: ~1.2 KB
- `favicon-32x32.png`: ~1.9 KB
- `apple-icon.png`: ~16 KB
- `icon-192.png`: ~16 KB
- `icon-512.png`: ~96 KB
- `manifest.json`: ~500 bytes

**Total:** ~147 KB for all icon assets

---

## Notes

- SVG icon scales perfectly at any size
- PNG icons provide fallback for older browsers
- Manifest enables PWA "Add to Home Screen" on mobile
- Theme color matches app's dark slate background
- Icons use same color palette as spending distribution chart for brand consistency

