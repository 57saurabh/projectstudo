# UI/UX Design System - "Gen-Z Dark"

## Design Philosophy
- **Vibe**: Edgy, slick, minimal, "cyber-noir".
- **Personality**: "Catty", direct, informal microcopy.
- **Theme**: Dark mode ONLY. No light mode.

## Color Palette

### Backgrounds
- **Void Black**: `#050505` (Main Background)
- **Deep Charcoal**: `#121212` (Cards/Modals)
- **Glass**: `rgba(20, 20, 20, 0.6)` (Overlays with backdrop-blur)

### Accents (Neon/Muted)
- **Cyber Cyan**: `#00f0ff` (Primary Actions - Glows)
- **Toxic Green**: `#39ff14` (Online/Success)
- **Hot Pink**: `#ff0099` (Alerts/Live)
- **Electric Violet**: `#8a2be2` (Secondary/Gradient)

### Text
- **Primary**: `#ffffff`
- **Secondary**: `#a1a1aa` (Muted gray)
- **Tertiary**: `#52525b` (Darker gray)

## Typography
- **Font**: `Inter` or `Outfit` (Google Fonts).
- **Headings**: Bold, tight tracking.
- **Body**: Regular, readable.

## Components

### Buttons
- **Primary**:
  - Background: `linear-gradient(135deg, #00f0ff 0%, #8a2be2 100%)`
  - Border: None
  - Text: Black (Bold)
  - Hover: Glow effect `box-shadow: 0 0 15px rgba(0, 240, 255, 0.5)`
- **Ghost**:
  - Background: Transparent
  - Border: `1px solid #333`
  - Text: White

### Cards
- **Style**: Glassmorphism.
- **CSS**:
  ```css
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  ```

### Video Tiles
- **Shape**: Rounded corners (24px).
- **Border**:
  - Speaking: `2px solid #39ff14` (Green glow).
  - Silent: None.
- **Overlay**: Name tag in bottom-left, glass style.

## Layouts
- **Grid**: Responsive CSS Grid for video tiles.
  - 1 user: Full screen.
  - 2 users: Split vertical/horizontal.
  - 3-4 users: 2x2 grid.
  - 5-9 users: 3x3 grid.
  - 10 users: 4x3 grid (optimized).
