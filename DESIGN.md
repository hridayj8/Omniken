# Omniken — Complete Design System

> **The Infinite Zero Context Engine** · Pitch-black glassmorphic design with CRT terminal aesthetic, multi-modal optimization, and interactive physics.

---

## 1. Design Philosophy

Omniken's visual language fuses three frameworks:

| Principle | Source | Application |
|-----------|--------|-------------|
| **Impeccable** | Apple HIG | Precise typography, perfect spacing, no visual noise |
| **Taste-Skill** | Emil Kowalski | One decisive flourish per section, restraint over ornament |
| **Terminal-native** | Claude Code CLI | Orange/amber accents, pixel invader mascots, dashed borders, SF Mono throughout |

**Core tenets:**
- Pitch-black canvas (`#000000`) — absolute monochromatic foundation
- Glassmorphic cards with `rgba(22, 22, 23, 0.82)` and `backdrop-filter: blur(28px) saturate(160%)`
- One accent color (`#40A9FF`) used at most twice per screen — never flood
- CRT scan lines and vignette as ambient texture, not distraction
- Spring physics in every transition: `cubic-bezier(0.16, 1, 0.3, 1)`

---

## 2. Design System Tokens (`app.css`)

### 2.1 Color Palette

```css
--c-base:           #000000       /* Pitch-black canvas */
--c-surface:        rgba(22,22,23,0.82)  /* Glassmorphic card bg */
--c-surface-hi:     rgba(38,38,42,0.88)  /* Hover card bg */
--c-border:         #333336       /* Default border (charcoal) */
--c-border-hi:      #555558       /* Hover border */

--c-text-primary:   #F5F5F7       /* Headlines, labels */
--c-text-secondary: #A0A0A6       /* Body, descriptions */
--c-text-muted:     #555558       /* Metadata, placeholders */

--c-accent-1:       #40A9FF       /* Primary accent (brighter blue) */
--c-accent-2:       #80D0FF       /* Secondary accent (sky) */
--c-accent-3:       #0077E6       /* Deep accent (dark blue) */
--c-accent-grd:     linear-gradient(135deg, #40A9FF, #80D0FF)

--c-founder:        oklch(72% 0.17 145)  /* Green for Founder tier */
--c-elite:          #40A9FF       /* Blue for Elite tier */

--c-red:            #FF4646       /* Error, danger */
--c-green:          oklch(68% 0.19 145)  /* Success, savings */
--c-amber:          #FF9F0A       /* Warning, caution */
```

### 2.2 Typography

```css
--font-ui:   'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
```

**Usage rules:**
- Navigation, section headers, body text → `--font-ui` (SF Pro Display)
- Code, metric values, terminals, model names, chip labels → `--font-mono` (SF Mono)
- Never use `--font-ui` for display text when the brief calls for terminal aesthetic
- Primary font weight map: `300` (subtitles) · `500` (body) · `600` (nav, labels) · `700` (headlines)

### 2.3 Spacing & Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--r-sm` | `8px` | Buttons, small chips, inline elements |
| `--r-md` | `12px` | Cards (default), textareas, flow nodes |
| `--r-lg` | `16px` | Larger containers, model table cells |
| `--r-xl` | `24px` | Section containers, pricing cards, modals |

### 2.4 Shadows

```css
--shadow-card:      0 0 0 1px rgba(51,51,54,0.5), 0 8px 32px rgba(0,0,0,0.8)
--shadow-glow:      0 0 60px rgba(64,169,255,0.08), 0 0 120px rgba(64,169,255,0.04)
--shadow-accent:    0 0 30px rgba(64,169,255,0.35)
--shadow-card-hover:0 0 0 1px rgba(85,85,88,0.6), 0 12px 48px rgba(0,0,0,0.9), 0 0 80px rgba(64,169,255,0.06)
```

### 2.5 Easing Curves

```css
--ease-spring:  cubic-bezier(0.16, 1, 0.3, 1)  /* Snappy spring — primary */
--ease-out:     cubic-bezier(0.22, 1, 0.36, 1) /* Smooth exit */
--ease-snap:    cubic-bezier(0.34, 1.56, 0.64, 1) /* Overshoot for micro-interactions */
```

---

## 3. Visual Foundation

### 3.1 CRT Scan Lines (`body::before`)

```css
/* Fixed overlay across entire viewport */
background: repeating-linear-gradient(
  0deg, transparent, transparent 2px,
  rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px
);
mix-blend-mode: multiply;
z-index: 9998;
pointer-events: none;
```

### 3.2 Vignette (`body::after`)

```css
/* Radial darkening at edges */
background: radial-gradient(
  ellipse 70% 60% at 50% 50%,
  transparent 40%,
  rgba(0,0,0,0.5) 100%
);
z-index: 9997;
pointer-events: none;
```

### 3.3 Desk Scene

| Class | Role |
|-------|------|
| `.desk-scene` | Full-viewport wrapper, `position: relative`, `background: #000` |
| `.desk-top` | Content container with subtle surface gradient + grid |
| `.desk-lamp` | Fixed-position warm blue glow (right corner), radial gradient 1100×1100px |

**Desk-top surface gradient** (linear 180°):
```
#0c0c10 → #0e0e14 → #101018 → #0d0d12 → #09090d
```

**Desk-top grid** (subtle cyan grid lines every 80px at 5% opacity).

### 3.4 Background Canvas (`#bgCanvas`)

- Fixed full-viewport canvas
- `pointer-events: none`
- `opacity: 0.5`
- Renders floating pixel invader particles via `app.js`

---

## 4. Navigation

| Element | Selector | Description |
|---------|----------|-------------|
| Brand + logo | `.nav-brand` | ♾ icon + "Omniken" + `ZERO_CONTEXT_v1.1` |
| Links | `.nav-link` | Engine, Pipeline, Calculator, Pricing, Sandbox |
| CTA | `.nav-cta` | Gradient button "Get Started →" |

**States:**
- Nav: `sticky: top(0)`, `background: rgba(0,0,0,0.85)`, `backdrop-filter: blur(28px) saturate(180%)`
- Link hover: `color: --c-text-primary`, `background: rgba(64,169,255,0.08)`
- Link active: `transform: scale(0.95)`
- CTA hover: `translateY(-1px)`, enhanced shadow glow
- CTA active: `transform: scale(0.95)`

**Responsive:** Nav links hidden at ≤860px (`display: none`).

---

## 5. Component Library

### 5.1 Glass Cards (`.card`)

```
background:   rgba(22, 22, 23, 0.82)
border:       1px solid #333336
border-radius: 12px
padding:      28px
backdrop-filter: blur(28px) saturate(160%)
transition:   transform 0.2s ease-spring, box-shadow 0.25s, border-color 0.25s
```

**States:**
- Default: `box-shadow: var(--shadow-card)`
- Hover: `border-color: #555558`, `box-shadow: var(--shadow-card-hover)`
- Active: `transform: scale(0.993)`

### 5.2 Floating Cards (`.glass-card-float`)

Inherits `.card` + `animation: float 5s ease-in-out infinite`:
```
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
```
Staggered delays: 0s (1st), 0.7s (2nd), 1.4s (3rd).

### 5.3 Buttons (`.btn`)

Base: `padding: 10px 22px`, `border-radius: 8px`, `font-mono`, `font-weight: 600`, `transition: transform 0.12s ease-spring`

| Variant | Selector | Background | Text | Border |
|---------|----------|------------|------|--------|
| Primary | `.btn-primary` | `var(--c-accent-grd)` | `#fff` | None |
| Secondary | `.btn-secondary` | `rgba(255,255,255,0.06)` | `--c-text-secondary` | `1px solid --c-border` |
| Ghost | `.btn-ghost` | `transparent` | `--c-text-muted` | `1px solid --c-border` |
| Danger | `.btn-danger` | `rgba(255,70,70,0.12)` | `--c-red` | `1px solid rgba(255,70,70,0.25)` |
| Founder | `.btn-founder` | `var(--c-accent-grd)` | `#fff` | None |
| Elite | `.btn-elite` | `linear-gradient(135deg, #80D0FF, #40A9FF)` | `#fff` | None |

**All buttons:** `:active { transform: scale(0.95) }`

### 5.4 Textarea / Output

| Element | Height | Font | Background |
|---------|--------|------|------------|
| `.engine-textarea` | 300px | `--font-mono`, 13px | `rgba(0,0,0,0.7)` |
| `.engine-output` | 300px | `--font-mono`, 13px | `rgba(0,0,0,0.7)` |

**Focus ring:** `border-color: --c-accent-1`, `box-shadow: 0 0 0 3px rgba(64,169,255,0.12), 0 0 40px rgba(64,169,255,0.05)`

### 5.5 Pane Labels

```
font-family: --font-mono, 11px, 600, letter-spacing: 0.1em, uppercase
```
With `.dot` indicator: 7px circle with glow shadow.

### 5.6 Toggle Switch (`.toggle`)

```
width: 38px, height: 22px, border-radius: 11px
background: rgba(255,255,255,0.08)
```
Thumb: 16px white circle, slides `translateX(16px)` when active.
Active state background: `--c-accent-1` with glow.

### 5.7 Metric Chips (`.metric-chip`)

```
padding: 14px 18px, background: rgba(0,0,0,0.5), border-radius: 8px
min-width: 110px
```
Value: `20px, --font-mono, 700, --c-accent-1` (or `.green` / `.amber`)
Key: `11px, --font-mono, --c-text-muted`

### 5.8 Model Chips (`.model-chip`)

```
padding: 7px 16px, border-radius: 999px, font-mono 12px
border: 1px solid --c-border, background: transparent
```
Active/hover: `background: rgba(64,169,255,0.12)`, `border-color: --c-accent-1`
Active: `transform: scale(0.95)`

### 5.9 Range Slider (`.range-input`)

```
height: 4px, border-radius: 2px, background: rgba(255,255,255,0.08)
```
Thumb: 18px circle, `--c-accent-1`, `box-shadow: 0 0 10px rgba(64,169,255,0.5)`
Thumb hover: `transform: scale(1.2)`

---

## 6. Page Architecture (Section by Section)

### 6.0 App Wrapper (`.app-wrapper`)

```
max-width: 1400px, margin: 0 auto, padding: 0 40px 80px
z-index: 2 (above bgCanvas)
```

### 6.1 Terminal Mascot Header

A terminal-card with:
- **SVG Pixel Invader** — 80×80px, `#40A9FF` and `#80D0FF` rectangles, `invaderBounce` animation (2s, translateY -3px alternating delays)
- **Terminal lines:** `$> ./omniken --version` → "Omniken CLI v1.1.0 — Zero Context Engine" with blinking cursor
- **Status line:** "Loaded [core] · [pass1 heuristic] · [pass2 shorthand] · [6 models] · [multi-modal]"
- **Running indicator:** `● running` in green

```
background: rgba(0,0,0,0.65), border-radius: 24px
inner scan-line overlay: 2px repeating gradient at 3% opacity
```

### 6.2 Hero Section

| Element | Tag | Key CSS |
|---------|-----|---------|
| Badge | `.hero-badge` | `LIVE · Zero Context Engine`, pill shape, green dot |
| Headline | `.hero-h1` | `clamp(40px, 7vw, 80px)`, `font-weight: 700`, gradient text on "Zero Context" |
| Subtitle | `.hero-sub` | `clamp(16px, 2vw, 19px)`, `max-width: 680px` |
| CTA | `.btn-primary` | "⚡ Try Engine Free" |
| CTA | `.btn-secondary` | "$ Calculate Savings" |

**Animations:** `fadeSlideUp` staggered at 0.1s/0.2s/0.3s delays.

### 6.3 Stats Strip

6 metrics in a horizontal flex strip with 1px gap/background:
```
| 47% | 2 | 100% | <40 | 4 | 6 |
```
- `padding: 28px 20px`
- `--font-mono, 32px, 700` for values
- Hover effect: background brightens, border lightens

### 6.4 Pipeline Flow Diagram

5-step horizontal flow with SVG connectors:
```
[Raw Prompt] → [Heuristic Strip] → [Shorthand Pack] → [Protected Registry] → [Compact Output]
```

**Each node:**
- `padding: 14px 20px`, `border: 1px solid rgba(64,169,255,0.25)`
- Step number in uppercase 9px
- Title in 11px bold
- Description in 10px muted

**Connectors:** 60px wide SVG with dashed line + animated dot (`.flow-dot-anim`):
- 2s ease-in-out cycle, translates 55px along X
- Staggered 0.5s delays

**Interactive:** `.flow-flash` class triggers border pulse animation (0.3s × 3) on optimize.

### 6.5 Core Engine Workspace

Dual-pane grid (`grid-template-columns: 1fr 1fr`):

| Pane | Content |
|------|---------|
| **Left (Input)** | Textarea 300px + controls (Optimize, Pass 1 Only, Clear, Load Demo) + 3 metric chips |
| **Right (Output)** | Read-only output 300px + controls (Copy Output, Gravity toggle) + 4 metric chips |

**Below the grid:**
- Pass 1 card (heuristic engine description + status dot + stats)
- Pass 2 card (shorthand engine description + status dot + stats)

**Interaction flow:**
1. User pastes prompt → metrics auto-update via `input` event listener
2. Click "⚡ Optimize" → 80ms delay → output rendered + pass stats + calculator sync
3. Click "Pass 1 Only" → skips Pass 2
4. Click "Clear" → resets both panes
5. Ctrl+Enter shortcut → triggers optimize
6. Flow diagram pulses green dots on optimize

### 6.6 Model Pricing Matrix

Full-width table with 7 columns × 6 model rows:

| Model | Input Cost / 1M tk | Overhead | Effective Rate | Avg Compression | Savings / 1M Calls | Annual ROI |
|-------|-------------------|----------|---------------|-----------------|-------------------|------------|
| GPT-4o | $2.50 | 0% | $2.50 | 47% | — | — |
| Claude 3.5 Sonnet | $3.00 | 12% | $3.36 | 47% | — | — |
| Gemini 1.5 Pro | $1.25 | 0% | $1.25 | 47% | — | — |
| Llama 3 70B | $0.60 | 0% | $0.60 | 47% | — | — |
| Claude 3 Opus | $15.00 | 0% | $15.00 | 47% | — | — |
| GPT-4 | $30.00 | 0% | $30.00 | 47% | — | — |

- Values calculated dynamically by `calculator.js`
- Savings/ROI cells highlighted green
- Row hover: brightened background

### 6.7 API Cost Offset Calculator

Dual-pane grid with interactive sliders and live savings projection:

**Left pane — Usage Parameters:**
- Daily API Calls: range 100–50,000 (default 5,000)
- Avg Tokens / Prompt: range 100–8,000 (default 1,200)
- Compression Rate: range 20–65% (default 47%)
- Primary Model: 6 chip buttons (GPT-4o active by default)
- Plan Tier: Founder $89/yr / Elite $179/yr

**Right pane — Savings Projection:**
- 6 savings rows with horizontal bars + daily saving amount
- Payback card: "Annual plan cost recovered in X days" + annual savings + ROI
- Math proof section: raw calculation formula with variable values
- Each row hover shifts `translateX(2px)`

**State:**
- All sliders update calculator on `input` event
- Model/Plan chips toggle via `selectModel()` / `selectPlan()`
- Savings bars animate with `transition: width 0.6s ease-spring`

### 6.8 Physics Sandbox

HTML5 Canvas with pixel invader physics:

| Feature | Implementation |
|---------|---------------|
| Gravity | `0.35 px/frame²` |
| Damping | `0.78` on bounce |
| Friction | `0.99` per frame |
| Restitution | `0.65` on wall impact |
| Max particles | 120 |
| Shockwave force | 18 at source, 200px radius |
| Colors | `#2997FF`, `#64D2FF`, `#40A9FF`, `#F5F5F7`, `#FF9F0A`, `#FF4646` |

**Invader sprite:** 8×8 pixel grid (39 filled cells) drawn via `fillRect`.

**Interactions:**
- Click canvas → shockwave + particle repulsion
- Drag → spawn invaders along trail (80ms throttle)
- Touch support for mobile
- "Spawn Invaders" button: 12-invader burst + shockwave
- "Activate Gravity" toggle → starts physics loop

**Initial state:** Grid overlay + centered instruction text.

### 6.9 Pricing Section

Two-tier pricing cards side by side:

| Element | Founder ($89/yr) | Elite ($179/yr) |
|---------|-----------------|-----------------|
| Badge | "Founder's Pass" (blue) | "⚡ Elite Agentic" (sky) |
| Target | Individual Vibe Coder | Developer Teams |
| Features | 8 items | 8 items (everything + extra) |
| CTA | Blue gradient button | Sky gradient button |
| Callout | Recovered in <40 days | Best for 10K+ calls/day |

**Gold banner below:** "The Math Is Simple" — inline calculation example showing $89 recovered in 13 days at default usage.

**Checkout flow:** Modal dialog with plan details, session state, and close button.

### 6.10 MCP Integration Section

Shows IDE configuration JSON block with:
```
{
  "mcpServers": {
    "omniken-core": {
      "command": "node",
      "args": ["./omniken/mcp-server/index.js"],
      "env": {
        "OMNIKEN_LICENSE": "YOUR_LICENSE_KEY",
        "OMNIKEN_COMPRESSION": "47"
      }
    }
  }
}
```
+ Two info cards: "TOOL: optimize_context_stream" and "AUTO-TRIAL VALIDATION".

### 6.11 Checkout Modal

Overlay dialog: `rgba(0,0,0,0.85)`, `backdrop-filter: blur(16px)`.

Inner card: `rgba(22,22,23,0.95)`, `max-width: 440px`, `box-shadow: 0 40px 80px rgba(0,0,0,0.9)`.

**Content:**
- "♾ You're In!" title
- Plan name + price description
- License activation block with status "✓ Session initialized"
- Close button (Escape key also closes)

### 6.12 Footer

```
border-top: 1px solid --c-border
padding: 48px 0
flex layout: brand left, copy right
```
Contents: "♾ Omniken — Zero Context Engine" + "v1.1.0 · 2025 · Built with precision"

---

## 7. Animation Registry

| Animation | Duration | Applied To | Description |
|-----------|----------|------------|-------------|
| `fadeSlideUp` | 0.6s | Hero elements | Fade in + translateY(24px) → 0 |
| `float` | 5s | `.glass-card-float` | translateY(-8px) loop |
| `pulse` | 2s | `.hero-badge::before` | Opacity + scale on green dot |
| `blink` | 1s step-end | `.terminal-cursor` | 8px block cursor blink |
| `invaderBounce` | 2s | `.invader-grid rect` | translateY(-3px) with staggered delays |
| `flowMove` | 2s | `.flow-dot-anim` | SVG dot translates 55px along connector |
| `flowFlash` | 0.3s × 3 | `.flow-flash .flow-node` | Border + glow pulse triggered on optimize |
| Scrollbar | — | `::-webkit-scrollbar-thumb` | 6px blue-tinted thumb, 3px radius |

---

## 8. Responsive Breakpoints

### ≤860px (Tablet / Small Desktop)
- `.stat-strip`: column layout
- `.nav-links`: hidden
- `.app-wrapper`: padding 0 20px
- `.terminal-header`: column, centered
- `.hero`: reduced padding
- `.engine-grid`, `.calc-grid`, `.pricing-grid`: `grid-template-columns: 1fr`
- `.flow-diagram`: horizontal scroll, compact nodes

### ≤480px (Mobile)
- `.hero-h1`: `clamp(28px, 10vw, 40px)`
- `.app-wrapper`: padding 0 16px
- `.stat-item`: 20px padding
- `.stat-value`: 26px
- `.engine-textarea`, `.engine-output`: 220px height
- `.hero-badge`: 10px, 4px 12px
- `.pricing-card`: 28px padding
- `#physicsCanvas`: 300px height

---

## 9. Scrollbar Customization

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(64,169,255,0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(64,169,255,0.3); }
```

---

## 10. Streamlit SaaS Backend (`app.py`)

### 10.1 Architecture

The Streamlit backend mirrors the frontend design system and provides the same functionality as a fully deployed SaaS web app.

**Tabs:**
1. **⚡ Core Engine** — Prompt optimization workspace (pass 1 / pass 2)
2. **📡 Multi-Modal** — Text, image, audio, video cost estimation with context caching
3. **💰 Calculator** — API cost offset calculator with 6 models, real-time payback, ROI
4. **🏆 Pricing** — Founder $89/yr + Elite $179/yr checkout (Stripe-ready)

### 10.2 Session State

```python
st.session_state keys:
  optimized_output          # str — last compressed output
  metrics_calculated        # dict — cached metrics
  auth_token                # str — session auth hash
  anti_gravity_active       # bool — feature flag
  api_key                   # str — user's API key (secure)
  user_email                # str — authenticated email
  license_tier              # str — "Founder's Pass" | "Elite Agentic"
  total_prompts_processed   # int — session counter
  total_tokens_saved        # int — session counter
```

### 10.3 CSS Injection

The Streamlit UI uses Black (`#000000`) background with:
- Google Fonts: SF Pro Display + SF Mono
- `.omniken-card` class matching frontend glassmorphism
- Razor-thin borders `#333336`
- 12px radius, `sf mono` for code/metrics
- Slider color, button styles, scrollbar all match the HTML frontend
- All transitions use `cubic-bezier(0.16, 1, 0.3, 1)`

### 10.4 Error Handling

- Every function wrapped in try-catch
- `supabase` import fails gracefully (fallback = `None`)
- `tiktoken` falls back to word heuristic if unavailable
- Application error caught in `__main__` with `st.exception()`

---

## 11. Supabase / Prisma Data Model

### 11.1 Schema Entities

| Model | Table | Key Fields |
|-------|-------|------------|
| `User` | `users` | `id` (uuid), `email` (unique), `name`, `api_key` |
| `License` | `licenses` | `id` (uuid), `user_id` (FK), `tier`, `status`, `price`, `license_key` (unique) |
| `ApiKey` | `api_keys` | `id` (uuid), `user_id` (FK), `key_hash` (unique, sha256), `label`, `revoked` |
| `UsageLog` | `usage_logs` | `id` (uuid), `user_id` (FK), `prompt_in`, `prompt_out`, `saved`, `reduction`, `model`, `input_type`, `context_cache`, `cache_hits` |
| `CheckoutSession` | `checkout_sessions` | `id` (uuid), `user_id` (FK), `email`, `tier`, `amount`, `status`, `stripe_id` (unique) |

### 11.2 Supabase Client Functions (`supabase_client.py`)

| Function | Purpose |
|----------|---------|
| `register_user(email, name)` | Create user record |
| `create_license(user_id, tier, price)` | Generate license key + activate |
| `upsert_user(email, name)` | Create-or-update by email |
| `get_license(license_key)` | Validate license key lookup |
| `log_usage(user_id, prompt_in, prompt_out, model, ...)` | Track usage with multi-modal + cache fields |
| `get_user_usage(user_id)` | Aggregate total tokens + prompt count |
| `create_checkout_session(email, tier)` | Upsert user + create pending session |

---

## 12. MCP Server (`mcp-server/index.js`)

### 12.1 Tools

| Tool | Input | Output |
|------|-------|--------|
| `optimize_context_stream` | `{ text, passes?, model? }` | `{ compressed, metrics }` |
| `get_compression_metrics` | `{}` | `{ version, uptime, session stats, rates }` |
| `validate_environment` | `{}` | `{ timestamp, environment, integrations, engineTest }` |

### 12.2 Auto-Trial Validation

On boot, runs compression test against a sample prompt and reports:
- Environment (Node version, platform, arch, PID)
- Integration detection (Cursor, Claude Desktop, Windsurf, VS Code)
- Engine test (tokens in/out, reduction %, protected blocks)
- Heartbeat every 5 minutes

### 12.3 6 Model Rates

| Model | Rate / 1M tokens |
|-------|-----------------|
| GPT-4o | $2.50 |
| Claude 3.5 Sonnet | $3.36 (incl. 12% overhead) |
| Gemini 1.5 Pro | $1.25 |
| Llama 3 70B | $0.60 |
| Claude 3 Opus | $15.00 |
| GPT-4 | $30.00 |

---

## 13. File Architecture

```
omniken/                          # Web frontend + Streamlit SaaS
├── index.html                    # Single-page app (landing + workspace + pricing)
├── app.css                       # Full design system (1194 lines)
├── app.js                        # Optimization engine + multi-modal + UI control
├── calculator.js                 # Cost savings calculator (6 models)
├── physics.js                    # Invader physics sandbox (canvas + shockwaves)
├── mcp-server/
│   └── index.js                  # MCP server (3 tools, auto-validation)
├── prisma/
│   └── schema.prisma             # 5 models: User, License, ApiKey, UsageLog, CheckoutSession
├── supabase_client.py            # Auth + license + usage functions
├── app.py                        # Streamlit SaaS (4 tabs)
├── requirements.txt              # Python dependencies
├── package.json                  # Vercel analytics dep
├── vercel.json                   # Static SPA deployment config
├── .env.example                  # Environment template
└── .gitignore

supabase/                         # SQL migration / seed
├── schema.sql
├── rls-policies.sql
├── seed.sql
├── migrations/
│   └── 001_initial_schema.sql
└── functions/
    ├── create_checkout_session.sql
    ├── activate_license.sql
    ├── log_usage.sql
    └── get_dashboard_stats.sql
```

---

## 14. Key Interaction Flows

### 14.1 Optimize Prompt

```
[User pastes text] → input event → updateInputMetrics (tokens/chars/words)
    ↓
[Click ⚡ Optimize] → flow-flash animation → optimizeText(input, ['pass1','pass2'])
    ↓
extractProtectedBlocks() → runPass1() → runPass2() → restoreProtectedBlocks()
    ↓
Render output → Update pass status dots → Update output metrics
    ↓
Sync compression slider to calculator → flow diagram pulse green dots
```

### 14.2 Calculate Savings

```
[Slider change / Model click / Plan click] → updateCalculator()
    ↓
calculateSavings() → iterate 6 models → compute daily savings
    ↓
Render bar widths (% of max) → Update payback card → Update annual savings
    ↓
renderMathProof() → updateModelTable()
```

### 14.3 Physics Toggle

```
[Click "Activate Gravity"] → togglePhysicsMode()
    ↓
startPhysics() → init 12 invaders → requestAnimationFrame loop
    ↓
Each frame: apply gravity + friction → wall bounce + restitution
    ↓
[Click canvas] → new Shockwave() → apply repulsive force to all invaders
[Drag canvas] → spawnInvader() at cursor every 80ms
```

### 14.4 Checkout Flow

```
[Click "Start Founder Pass"] → handleCheckout('founder')
    ↓
Open modal → display plan name + price + license activation block
    ↓
Supabase upsert user → create checkout_session (pending)
    ↓
User clicks Close or Escape → closeModal()
```

---

## 15. Design Audit (Anti-Slop Checklist)

| Item | Status | Notes |
|------|--------|-------|
| ❌ Purple/violet gradient backgrounds | ✗ Avoided | All gradients are blue tones |
| ❌ Generic emoji feature icons (✨🚀🎯) | ✗ Avoided | Only ♾, ⚡, $, ● used |
| ❌ Rounded card + left coloured border | ✗ Avoided | Full card borders instead |
| ❌ Hand-drawn SVG humans/faces | ✗ Avoided | Pixel invader sprite only |
| ❌ Inter/Roboto/Arial as display face | ✗ Avoided | SF Pro Display only |
| ❌ Invented metrics ("10× faster") | ✗ Avoided | All stats are realistic/calculated |
| ❌ Filler copy ("Feature One") | ✗ Avoided | All labels are specific |
| ❌ Icon next to every heading | ✗ Avoided | Only in section labels |
| ❌ Gradient on every background | ✗ Avoided | Gradients restricted to CTA buttons |
| ❌ Warm beige/peach/pink backgrounds | ✗ Avoided | Pitch-black canvas |
| ❌ Designer/demo controls in final UI | ✗ Avoided | No platform toggles or viewport selectors |

---

## 16. Multi-Modal Optimization Details

### 16.1 Token Estimation

| Modality | Function | Formula |
|----------|----------|---------|
| Text | `estimateTokens()` | Word-length heuristic (4-char ≈ 1 token, punctuation × 0.3) |
| Image | `estimateImageTokens(w, h, detail)` | `low: 85` / `auto: 85 + tiles × 170` where tiles = `⌈min(w,2048)/512⌉ × ⌈min(h,2048)/512⌉` |
| Audio | `estimateAudioTokens(dur)` | `duration × 12.5` |
| Video | `estimateVideoTokens(dur, fps)` | `min(frames, 150) × imageTokens(1920, 1080)` |

### 16.2 Context Caching Rates

| Type | Raw Rate / 1M | With 90% Cache |
|------|--------------|----------------|
| Text | $2.50 | $0.25 |
| Image | $7.50 | $0.75 |
| Audio | $3.75 | $0.38 |
| Video | $12.00 | $1.20 |

Video/audio also support Gemini-style hourly storage: $1.00–$4.50/M tokens/hour for cached content.

### 16.3 Pass 1 Heuristic Targets (30+ rules)

Targets patterns like: greetings (`hi`, `hello`, `good morning`), signoffs (`best regards`, `sincerely`), preambles (`I hope this finds you well`), fillers (`very`, `really`, `basically`, `actually`), polite hedges (`kind of`, `sort of`, `to be honest`), verbose phrases (`due to the fact that` → `because`, `in order to` → `to`). Preserves code fences, inline code, math blocks, JSON objects, and arrays via the Protected Block Registry.

### 16.4 Pass 2 Shorthand Targets (20+ rules)

Replaces: `for example` → `e.g.`, `Act as an expert` → `Role:`, `Your task is to` → `Task:`, `Please ensure that` → `Ensure`, verbose instructions to terse directives, `without` → `w/o`, `with` → `w/`, contractions (`do not` → `don't`).

### 16.5 Protected Block Registry

Extracts and reinjects verbatim:
- Code fences (` ```...``` `)
- Inline code (`` `...` ``)
- Math blocks (`$$...$$`)
- Inline math (`$...$`)
- JSON objects (`{...}`)
- JSON arrays (`[...]`)

Uses null-byte placeholders (`\x00OMNI_PROTECTED_N\x00`) sorted by position (reverse order for safe replacement).

---

## 17. Deployments

| Service | Entry Point | Domain / Notes |
|---------|------------|----------------|
| **Vercel** (frontend) | `omniken/index.html` | Static SPA, no build step |
| **Streamlit Cloud** (SaaS) | `omniken/app.py` | Full app with auth + payments |
| **MCP Server** (npm) | `omniken/mcp-server/index.js` | Background daemon for IDE integration |
| **Supabase** (DB) | `nhkscsynarfbwgfcrgva` | PostgreSQL + auth + RLS |
