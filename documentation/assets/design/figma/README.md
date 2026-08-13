Figma Import & Handoff Guide

Contents:
- colors.json — design tokens (color palette)
- typography.json — type scale and tokens
- logo-concepts.svg — three logo mark concepts (monochrome + color)
- screens/landing.desktop.svg — landing page artboard (desktop)
- screens/admin.dashboard.svg — admin dashboard artboard
- screens/users.page.svg — users page artboard

How to import into Figma

1. Open Figma and create a new file.
2. Drag the SVG files (`logo-concepts.svg` and files in `screens/`) directly onto the canvas — Figma will import them as editable vectors.
3. Use `colors.json` and `typography.json` to create color styles and text styles in Figma:
   - In Figma: `Right-click -> Create style` for Fill to add color tokens.
   - For typography, create Text styles matching the tokens.
4. Use the logo SVGs as components; convert imported groups into components via `Create component`.

Notes
- The SVG screens are intentionally structured with rectangles and text placeholders to allow rapid iteration in Figma.
- For production-ready assets, export icons as separate SVGs and place them into Figma as components.

Next steps I can take:
- Export more detailed SVGs for each component (buttons, cards, role matrix).
- Generate React/TS component stubs matching the design tokens.
- Produce high-fidelity PNG exports for documentation.
