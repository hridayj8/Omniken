# Implementation Plan — Retro-Terminal 3D Desk Overhaul

## Goals
Convert the Omniken landing page and dashboard into a stunning, interactive 3D virtual environment. The design fuses the **Claude Code CLI terminal aesthetic** (orange/amber accents, pixelated invader mascots, dashed borders) with a **3D desk scene** featuring a warm lamp light source, floating glassmorphic panels, and detailed technical visuals.

---

## User Review Required

> [!IMPORTANT]
> - **3D Perspective & Usability**: We will construct a virtual 3D perspective wooden/metallic desk surface (`.desk-top`) tilted slightly in 3D space (`transform: rotateX(15deg) rotateY(0deg)`). This keeps the text inputs and controls fully readable and interactive while achieving a deep 3D desk console feel.
> - **Animation Performance**: We will use CSS variables and GPU-accelerated transforms (`translate3d`, opacity) for scan lines, floating cards, and mascot animations to ensure smooth rendering on modern devices.
> - **Mascot Interaction**: The pixelated invader mascot will animate dynamically on the console background and within the physics canvas.

---

## Open Questions

> [!WARNING]
> None. All specifications (wood table texture, lamp glow, pixel mascot, flow diagram, and calculator additions) are fully detailed below.

---

## Proposed Changes

### Frontend Design & Styling

#### [MODIFY] [app.css](file:///c:/Users/hrida/OneDrive/Desktop/Omni%20token/omniken/app.css)
- **Retro-Terminal Foundation**: Overhaul variables with a retro orange/amber color palette:
  - Base canvas: `#0d0d0f` (deep terminal black)
  - Accent/text color: `#E06C53` (Claude Code orange) and `#FFB347` (warm lamp gold)
  - Card surfaces: `rgba(18, 18, 20, 0.75)` with a backdrop blur of `20px`
  - Borders: `1px dashed #E06C53` for retro sections and `1px solid rgba(224, 108, 83, 0.3)` for secondary elements
- **CRT & Scan Line Effects**: Add CSS overlay for vertical/horizontal scan lines and a glowing CRT vignette.
- **3D Desk Scene Layout**:
  - Create a `.desk-scene` wrapper with `perspective: 1200px`.
  - Create a `.desk-top` representing a warm oak wood/slate table using radial/linear CSS gradients tilted at a shallow angle.
  - Implement a `.desk-lamp` position casting a warm, semi-transparent radial cone of light (`rgba(255, 170, 50, 0.18)`) onto the table.
- **Hovering Panels**: Give `.glass-card` classes `position: relative`, `transform-style: preserve-3d`, and keyframe-based float animations (`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`).
- **Technical Flow Diagram Styles**: Add styling for SVG pipeline tracks, pulsing node connections, and flowing data packets.

#### [MODIFY] [index.html](file:///c:/Users/hrida/OneDrive/Desktop/Omni%20token/omniken/index.html)
- **Claude Code Mascot Header**: Add a terminal console card in the hero area displaying the classic "Omniken CLI v1.1.0" header and a responsive CSS/pixelated SVG invader mascot.
- **Technical Pipeline Flow Diagram**:
  - Insert an interactive flow diagram card above the workspace displaying:
    - **Step 1**: Raw Prompt Input
    - **Step 2**: Heuristic Strip (Pass 1) -> Strips greetings, Sycophancy
    - **Step 3**: Shorthand Pack (Pass 2) -> Terse directives, Abbrev
    - **Step 4**: Protected Registry -> Code/Math/JSON reinjection
    - **Step 5**: Compact Output
  - Use SVGs to draw connecting pipelines with moving light-dot animators.
- **Table Scene Structure**: Group landing pages, workspaces, calculators, and sandbox panels inside the `.desk-top` container.

#### [MODIFY] [app.js](file:///c:/Users/hrida/OneDrive/Desktop/Omni%20token/omniken/app.js)
- **Background Pixel Mascots**: Implement a lightweight canvas particle animation system to render moving pixelated invader figures across the background canvas.
- **Flow Indicator Integration**: Trigger visual pulses along the flow diagram paths when the user clicks the "⚡ Optimize" button.

#### [MODIFY] [calculator.js](file:///c:/Users/hrida/OneDrive/Desktop/Omni%20token/omniken/calculator.js)
- **Expanded Model Set**: Update the model rates, overheads, and comparison table with additional models:
  - **GPT-4o**: $2.50 / 1M
  - **Claude 3.5 Sonnet**: $3.00 / 1M + 12% eff. = $3.36 eff.
  - **Gemini 1.5 Pro**: $1.25 / 1M
  - **Llama 3 70B**: $0.60 / 1M
  - **Claude 3 Opus**: $15.00 / 1M
  - **GPT-4**: $30.00 / 1M
- **Table View Update**: Dynamically render calculations for all six models inside a sleek terminal-themed pricing matrix table.

#### [MODIFY] [physics.js](file:///c:/Users/hrida/OneDrive/Desktop/Omni%20token/omniken/physics.js)
- **Pixelated Mascots Canvas**: Modify the canvas physics simulation to render falling and bouncing pixelated invaders (8-bit style sprites) instead of generic circular balls.
- **Interactive Radial Shockwaves**: Retain the spring physics and shockwave repulsion, making the pixelated invaders bounce dynamically off boundaries.

---

## Verification Plan

### Automated Verification
- Verify that all modified files build correctly and compile without JavaScript errors.
- Confirm that token counting, calculators, and physics sandboxes maintain perfect functional integrity.

### Manual Verification
- View `omniken/index.html` in a local web browser to inspect the 3D desk angle, desk lamp warm glow, animated pixelated background invaders, pipeline flow diagram, expanded model calculator table, and falling pixelated invaders inside the sandbox.
