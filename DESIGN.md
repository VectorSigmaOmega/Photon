---
name: Photon
description: A high-signal asynchronous image processing pipeline demo.
colors:
  primary: "#d33b30"
  neutral-bg: "#f9f6f1"
  neutral-fg: "#332d29"
  accent-trace: "#49a6db"
typography:
  display:
    fontFamily: "Inter Tight, Inter, sans-serif"
    fontSize: "clamp(3rem, 9vw, 7rem)"
    fontWeight: 800
    lineHeight: 0.85
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.18em"
rounded:
  sm: "2px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.neutral-fg}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
---

# Design System: Photon

## 1. Overview

**Creative North Star: "The Archival Ledger"**

Photon's visual system is designed to convey technical precision and engineering competence. It rejects the soft, generic aesthetic of modern SaaS dashboards in favor of a "paper and ink" materiality that feels grounded, archival, and permanent. The interface acts as a high-signal dossier, surfacing the complexity of a distributed runtime through dense technical readouts and transparent state indicators.

**Key Characteristics:**
- **Technical Transparency**: Internal state (queues, metrics) is treated as a first-class citizen.
- **Material Precision**: Warm neutrals and sharp ink-like typography create a physical, archival feel.
- **High-Signal Density**: Information-rich layouts that prioritize data clarity over decorative whitespace.

## 2. Colors

The palette is anchored by warm neutrals and deep ink tones, punctuated by a single high-chroma signal color.

### Primary
- **Oxide Signal Red** (oklch(58% 0.21 28)): Used for primary actions, critical status indicators, and branding accents. Its rarity ensures maximum impact.

### Secondary
- **Circuitry Trace Blue** (oklch(70% 0.09 220)): Reserved for live data traces, pipeline flow indicators, and informational system highlights.

### Neutral
- **Aged Paper White** (oklch(96% 0.012 75)): The foundation. A warm, non-glaring background that mimics physical paper.
- **Warm Iron Ink** (oklch(18% 0.02 60)): The primary text and border color. Deep but not pure black, maintaining the warm, material tone.

**The One Voice Rule.** The primary signal color is used on ≤10% of any given screen. Its rarity is the point—it directs focus to the most critical state change or action.

## 3. Typography

**Display Font:** Inter Tight (Extra Bold)
**Body Font:** Inter
**Label/Mono Font:** IBM Plex Mono

**Character:** A high-contrast pairing of aggressive, tight-tracked display type and spacious, technical monospaced labels.

### Hierarchy
- **Display** (800, clamp(3rem, 9vw, 7rem), 0.85): Hero branding and page titles. Aggressive and bold.
- **Headline** (600, 1.125rem, 1.2): Section titles and significant groupings.
- **Body** (400, 1rem, 1.5): Descriptive text and secondary information. Max line length 65ch.
- **Label/Mono** (400, 11px, 0.18em tracking, Uppercase): Technical metadata, system status, and small UI actions.

## 4. Elevation

Photon is flat by default. Depth is conveyed through tonal layering, distinct border treatments, and subtle background textures (grids and washes), rather than drop shadows.

**The Material Grid Rule.** Visual grouping is achieved via hairline borders (1px) and background shifts. Shadows are prohibited except for ephemeral feedback states.

## 5. Components

### Buttons
- **Shape:** Sharp (2px radius)
- **Primary:** Solid Warm Iron Ink background with Aged Paper White text.
- **Hover:** Transitions to Oxide Signal Red.

### Pipeline Indicators
- **Style:** Monospaced labels with color-coded status pips.
- **Trace lines:** 1px dashed or solid lines using Circuitry Trace Blue for active flows.

### Cards / Containers
- **Corner Style:** Sharp (2px)
- **Background:** Transparent with hairline borders or subtle paper-deep tints.
- **Padding:** Generous but efficient (16px to 32px).

## 6. Do's and Don'ts

### Do:
- **Do** use OKLCH for all color declarations in code to maintain gamut precision.
- **Do** surface technical details (ids, durations, counts) using the monospaced Label style.
- **Do** use the 32px grid pattern for background structure on large sections.

### Don't:
- **Don't** use generic SaaS "Stripe-clone" minimalism or soft shadows.
- **Don't** use border-left greater than 1px as a colored stripe for alerts.
- **Don't** use gradient text or glassmorphism effects.
