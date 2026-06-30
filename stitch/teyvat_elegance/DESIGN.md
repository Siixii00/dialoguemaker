---
name: Teyvat Elegance
colors:
  surface: '#151310'
  surface-dim: '#151310'
  surface-bright: '#3b3935'
  surface-container-lowest: '#100e0b'
  surface-container-low: '#1d1b18'
  surface-container: '#211f1c'
  surface-container-high: '#2c2a26'
  surface-container-highest: '#373431'
  on-surface: '#e8e1dc'
  on-surface-variant: '#cfc5b7'
  inverse-surface: '#e8e1dc'
  inverse-on-surface: '#33302c'
  outline: '#989083'
  outline-variant: '#4c463b'
  surface-tint: '#dbc495'
  primary: '#f0d8a8'
  on-primary: '#3c2e0c'
  primary-container: '#d3bc8e'
  on-primary-container: '#5b4b27'
  inverse-primary: '#6e5c36'
  secondary: '#bcc7d8'
  on-secondary: '#27313e'
  secondary-container: '#3d4856'
  on-secondary-container: '#abb6c7'
  tertiary: '#d5d9f9'
  on-tertiary: '#2a2f47'
  tertiary-container: '#b9bddc'
  on-tertiary-container: '#474c66'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f8e0af'
  primary-fixed-dim: '#dbc495'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#554521'
  secondary-fixed: '#d8e3f5'
  secondary-fixed-dim: '#bcc7d8'
  on-secondary-fixed: '#111c29'
  on-secondary-fixed-variant: '#3d4856'
  tertiary-fixed: '#dde1ff'
  tertiary-fixed-dim: '#c1c5e4'
  on-tertiary-fixed: '#151a31'
  on-tertiary-fixed-variant: '#41455f'
  background: '#151310'
  on-background: '#e8e1dc'
  surface-variant: '#373431'
  surface-overlay: rgba(31, 37, 47, 0.85)
  text-light: '#ECE5D8'
  text-dark: '#2B333E'
  primary-hover: '#C29A5B'
  accent-gold: '#D3BC8E'
typography:
  display-name:
    fontFamily: Cinzel
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: 0.05em
  dialogue-body:
    fontFamily: Lora
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.6'
  dialogue-body-mobile:
    fontFamily: Lora
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  button-label:
    fontFamily: Cinzel
    fontSize: 14px
    fontWeight: '600'
    letterSpacing: 0.1em
  caption:
    fontFamily: Lora
    fontSize: 14px
    fontWeight: '500'
spacing:
  safe-area: 2rem
  dialogue-padding: 2.5rem
  gutter: 1rem
  nameplate-offset: -3rem
---

## Brand & Style
The brand personality is high-fantasy, immersive, and premium, drawing heavy inspiration from AAA gacha games and visual novels. It evokes a sense of wonder, mystery, and refined elegance. 

The design style is **Glassmorphism mixed with High-Fantasy Accents**. It utilizes semi-transparent surfaces and backdrop blurs to create a sense of depth against rich, environmental backgrounds. This is contrasted by sharp, decorative "diamond" accents and gold-toned borders that suggest luxury and ancient craftsmanship. The user experience is cinematic, focusing on storytelling and character presence over utility.

## Colors
The color palette is anchored by **Celestial Gold** (#D3BC8E), used for primary interactive elements, nameplates, and decorative accents. This color signifies importance and high value.

The background is a deep **Obsidian** (#000000), allowing environmental art to shine. Surfaces utilize a translucent **Deep Sea Blue** (rgba(31, 37, 47, 0.85)) with a heavy backdrop blur to maintain readability without obscuring the background. Text uses an off-white **Parchment** (#ECE5D8) to reduce harsh contrast while maintaining a vintage, literary feel.

## Typography
The typography system relies on a pairing of a cinematic serif and a literary serif. 

**Cinzel** is used for headlines, nameplates, and UI labels. Its sharp, classical proportions evoke ancient inscriptions and regal authority. 

**Lora** is used for all body text and dialogue. Its organic curves and moderate contrast provide excellent legibility for long-form reading, reinforcing the "visual novel" aesthetic. Dialogue text should utilize a typewriter or reveal animation to pace the player's intake of information.

## Layout & Spacing
The layout follows a **Fixed Narrative Grid**. Content is centered within a maximum width of 1200px to ensure a cinematic aspect ratio regardless of screen width.

1. **Dialogue Zone:** Anchored to the bottom of the viewport with a fixed height to allow character portraits to remain visible.
2. **Character Layer:** Positioned behind the UI but in front of the background, usually offset to the left or right.
3. **Control Layer:** Global navigation and utility buttons are pinned to the top corners with generous safe-area margins (32px).

On mobile, the dialogue box spans the full width, and character portraits are scaled down or cropped to focus on the upper torso and head.

## Elevation & Depth
Depth is created through transparency and selective blurring rather than traditional shadows.

- **Level 0 (Background):** High-detail environmental art with a dark gradient overlay at the bottom.
- **Level 1 (Character):** Sharp portraits with a `drop-shadow-2xl` to separate them from the environment.
- **Level 2 (Dialogue Surface):** Semi-transparent glass with `backdrop-blur-md` and a 2px top border in the primary gold color.
- **Level 3 (Interactive Elements):** Nameplates and buttons use solid fills or higher-opacity backgrounds to appear "closest" to the user.
- **Accents:** Diamond-shaped SVGs are placed at corners of surfaces, featuring a soft gold outer glow (`drop-shadow`) to simulate bioluminescence.

## Shapes
The shape language is primarily **Sharp and Geometric**. Square corners are used for the main dialogue container and nameplates to evoke a sense of structural permanence and tradition. 

The only exceptions are **Pill-shaped (Rounded-full)** utility buttons in the top navigation bar, which differentiate "system" controls from "narrative" elements. Decorative diamond motifs (rotated squares) are used as indicators and corner accents, reinforcing the geometric theme.

## Components

### Nameplate
A solid primary-colored rectangle with sharp corners. It features a 2px semi-transparent white top inner-border. It is always positioned to overlap the top-left edge of the dialogue box.

### Dialogue Box
A wide, semi-transparent container with `backdrop-blur`. It must have a `border-t-2` in the primary color. Four diamond-shaped accents should sit at each corner, slightly offset to overlap the boundary.

### Utility Buttons
Pill-shaped containers with a `black/40` background and a subtle `white/10` border. On hover, the border and icon transition to the primary gold color. Use `Material Symbols Outlined` for icons.

### Interaction Indicator
A diamond-shaped icon positioned at the bottom right of text areas. It should have a horizontal "bounce" animation to prompt the user to click or tap.

### Scrollbars
Hidden or extremely minimalist. Use a thin, primary-colored track with low opacity to avoid distracting from the narrative text.