# Design system — Tenkasi Land Promoters

The site is built on the **Vinode** design tokens. Every colour, type size, space, radius, shadow and motion value in `assets/css/style.css` references a token defined once in `:root`. This document lists the tokens and the guideline for each component.

**Principles**

- Consistency over novelty — reuse existing patterns before inventing new ones.
- Token-driven — every visual decision references a token, not a magic number.
- Accessible by default — every page passes an axe-core WCAG 2.1 AA audit at 390 px and 1440 px.

**Scope note.** The generated landscape illustrations (`assets/js/art.js`, `assets/css/art.css`) are *imagery*, the equivalent of photographs. They keep their own atmospheric palette, including the glowing gold boundary line. UI chrome (text, buttons, borders, surfaces) uses only the tokens below.

---

## Foundations

### Colour

| Token | Value | Role | Alias |
|-------|-------|------|-------|
| `--color-1` | `#1B1B1B` | Background dark · primary text | `--bg-dark`, `--text` |
| `--color-2` | `#757575` | Muted text (on white only) · borders on dark | `--text-muted` |
| `--color-3` | `#A0A0A0` | Secondary text on dark | `--text-secondary` |
| `--color-4` | `#E5E7EB` | Border · disabled fill | `--border` |
| `--color-5` | `#F3F3F3` | Page background | `--bg` |
| `--color-6` | `#FFFFFF` | Surface · text on dark | `--surface`, `--text-light` |

Contrast rules (measured):

| Pair | Ratio | Use |
|------|-------|-----|
| `color-1` on `color-5` / `color-6` | 15.5 / 17.2 | All body text |
| `color-2` on `color-6` | 4.6 | Small muted text on white cards only |
| `color-2` on `color-5` | 4.15 | **Large text only** (≥ 24 px), e.g. the grey half of a heading |
| `color-3` on `color-1` | 6.6 | Secondary text on dark sections |
| `color-6` on `color-1` | 17.2 | Text on dark |

### Typography

| Token | Size | Line height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | 12px | `--leading-relaxed` (18px) | Badges, metadata |
| `--text-sm` | 14px | `--leading-normal` (19.6px) | Labels, buttons, secondary text |
| `--text-base` | 16px | `--leading-relaxed` (24px) | Body |
| `--text-lg` | 24px | `--leading-snug` (28.8px) | Card titles, lede |
| `--text-2xl` | 28px | `--leading-snug` (33.6px) | Section titles (mobile), form titles |
| `--text-3xl` | 44px | `--leading-tight` | Section titles (≥ 760px), display (mobile) |
| `--text-4xl` | 64px | `--leading-tight` (70.4px) | Display (≥ 760px), big numbers |

Families: `--font-display` (Poppins) for headings, buttons, labels; `--font-body` (Inter) for running text. Noto Sans Tamil is a glyph fallback for Tamil lines. Weights: 300 (lede), 400, 500 (headings, buttons), 600 (prices, brand).

### Spacing

Base unit 4px. `--space-1` 2 · `--space-2` 4 · `--space-3` 8 · `--space-4` 10 · `--space-5` 12 · `--space-6` 14 · `--space-7` 16 · `--space-8` 20 · `--space-9` 24 · `--space-10` 28 · `--space-11` 30 · `--space-12` 32 · `--space-13` 40 · `--space-14` 56 · `--space-15` 60 · `--space-16` 80 · `--space-17` 150.

Layout tokens built from them: `--gutter` (16 → 24 → 60), `--section-y` (56 → 80 → 150), `--header-h` (60 → 80).

### Shape, elevation, motion

- Radius: `--radius-sm` 2 (focus ring, legend swatches) · `--radius-md` 16 (inputs, media inside cards) · `--radius-lg` 20 (cards, panels) · `--radius-full` 90 (buttons, pills, chips). `--radius-xl` is reserved.
- Shadow: `--shadow-md` for hover lift on cards and buttons; `--shadow-sm` for floating layers (chat panel, spec card, hover thumbnails).
- Motion: `--duration-fast` 0.15s, `--duration-base` 0.2s (colour), `--duration-transform` 0.3s, `--duration-rise` 0.6s (hero rise, staggered 0 / 0.08 / 0.12s), `--duration-reveal` 0.72s with `--ease-out-expo` (opacity + transform + blur reveal), `--duration-slow` 1s with `--ease-out-quart`, `--duration-marquee` 22s linear. All motion is disabled or reduced under `prefers-reduced-motion`.

### Breakpoints

Smallest supported: **320px**. Tested: 390px (phone) and 1440px (desktop). Layout switches at 520, 560, 640, 760, 860, 900, 960 and 1080px.

---

## Components

Each guideline follows: Overview · Tokens · Anatomy & variants · States & interactions · Accessibility · Content · Anti-patterns.

### Button (`.btn`)

**Overview.** Triggers an action or navigates to a primary destination. Use for the one or two most important actions in a region; use `.link-arrow` for secondary navigation.

**Tokens.** Font `--font-display` / `--text-sm` / `--weight-medium`; padding `--space-5` `--space-9`; min-height `--space-12`; radius `--radius-full`; hover shadow `--shadow-md`; transitions `--transition-colors`, `--duration-transform`.

**Anatomy & variants.** Container, optional leading icon (`--space-7` square), label.

| Variant | Light context | Dark context (`.section--dark`, `.on-dark`, `.t-dusk`) |
|---------|---------------|------------------|
| `.btn-primary` | `color-1` fill, `color-6` text | `color-6` fill, `color-1` text |
| `.btn-light` | `color-6` fill, `color-4` border | — |
| `.btn-ghost` | transparent, `color-1` border | transparent, `color-6` border |

Modifiers: `.btn-block` (full width), `.btn-lg`. Inside `.form-card` the primary button is always dark.

**States.**

| State | Treatment |
|-------|-----------|
| Default | As above |
| Hover | Lifts `--space-1`, `--shadow-md`; ghost fills |
| Focus-visible | 2px `color-1` outline (white on dark), offset 2px |
| Active | Returns to rest position, no shadow |
| Disabled | `color-4` fill, `color-2` text, `not-allowed` cursor, no lift |
| Loading | `.is-loading` + `aria-busy="true"`: label hidden, spinner shown, pointer events off |

**Accessibility.** Real `<button>` for actions, `<a>` for navigation. Icon-only buttons need `aria-label`. Hit area at least 32px tall (`--space-12`), 40px for icon buttons.

**Content.** Sentence case, a verb first, at most four words: "Book a site visit", "Send enquiry". No ALL CAPS.

**Anti-patterns.** A `<div>` with a click handler (no keyboard access). Two primary buttons side by side (the user can't tell which matters). A button nested inside a card link (nested interactive elements). Use a `.btn-ghost` beside a primary instead.

### Header & navigation

**Overview.** Persistent site navigation: a floating white pill inset from the page edges, with a logo badge, four dropdown menus, a Contact link and one primary CTA. It hides when scrolling down past the hero and returns on scroll up. Use one per page; don't add a second CTA to the bar.

**Tokens.** Offset `--header-top` (12 → 16px); height `--nav-h` (60px); radius `--radius-full`; shadow `--shadow-md`; frosted fill `color-6` at 95% over `color-5`; logo badge `--space-13` circle in `color-1`; trigger padding `--space-3` `--space-7`, `--text-base` / `--weight-medium`; dropdown panel `--radius-lg`, `--shadow-sm`, `--border`; menu rows `--radius-md`, icon tiles `--space-13`.

**Anatomy & variants.**

| Part | Content |
|------|---------|
| Brand | Logo badge + "Tenkasi / Land Promoters", links home |
| Properties ⌄ | Five property types with icons, live listing counts and a featured-listing card; footer link to all properties |
| Locations ⌄ | Seven regions in two columns with Tamil names and counts; footer link to the map |
| Services ⌄ | Buy land, Sell your land, Site visits, Video walkthroughs, Document checks |
| Company ⌄ | About us, How it works, FAQs, Instagram ↗, YouTube ↗ |
| Contact | Plain link |
| CTA | "Book a site visit" (`.btn-primary`) |

Responsive: under 1080px the menus collapse into a round menu button that drops a white panel (`.mobile-menu`) under the pill, with each menu as a `<details>` section, then the CTA and WhatsApp. Under 560px the bar's CTA moves into that panel.

**States & interactions.**

| State | Treatment |
|-------|-----------|
| Trigger hover / open | `color-5` pill; chevron rotates 180° |
| Current section | `color-5` pill with a `--border` ring; visually hidden "(current section)" |
| Menu row hover / focus | `color-5` row; icon tile inverts to `color-1` |
| Pill scrolled | Adds a `--border` ring |
| Hidden | Slides up out of view; never while a menu is open |
| Mobile open | Backdrop `color-1` at 35%, page scroll locked, chat button hidden |

Pointer: menus open on hover with a 180ms close delay and a hover bridge across the gap; a click straight after a hover keeps the menu open instead of toggling it shut. Touch: tap toggles. Keyboard: Tab reaches each trigger; Enter/Space toggles; ↓ opens and focuses the first link; ↑/↓ move between links (wrapping), Home/End jump; Escape closes and returns focus to the trigger; tabbing out closes. Outside click closes. Featured-card art renders on first open.

**Accessibility.** Skip link first in the DOM. `<nav aria-label="Main">` with a list of items; triggers are `<button>`s with `aria-expanded` and `aria-controls` (disclosure pattern, not `role="menu"`). Closed panels are `visibility: hidden`, so they leave the tab order. Listing counts carry visually hidden "listings"; external links announce "(opens in a new tab)". Menu button exposes `aria-expanded`, `aria-controls` and a changing label; Escape closes the panel and refocuses the button.

**Content.** One-word trigger labels in sentence case. Menu rows: title of 1–3 words plus a description of at most 40 characters. Exactly one CTA.

**Anti-patterns.** Opening menus on hover only (unusable on touch and keyboard). Using `role="menu"`, which makes screen readers expect application-style arrow navigation for ordinary site links. Putting a second CTA in the pill (the user can't tell which one matters). Nesting dropdowns inside dropdowns.

### Story hero (`.story`)

**Overview.** The home page's scroll-driven film: five scenes, each with a layered illustration that cross-fades and pushes forward while a gold line draws the boundary. Use once per site.

**Tokens.** Captions `--text-4xl` / `--text-3xl`; reveal `--duration-reveal` + `--ease-out-expo` with 18ms letter stagger; supporting lines rise with `--duration-rise` at 0 / 0.08 / 0.12s; spec card `--radius-lg`, `--shadow-sm`; UI pills `--radius-full`.

**Anatomy.** Sticky stage → scenes (depth layers) → scrim → captions (eyebrow, display heading, Tamil line, subline, actions) → spec card (last scene) → bottom bar (counter, prev / dots / next, dawn-dusk toggle).

**States & interactions.** Scroll progress drives opacity, scale and the line; active scene index drives captions, dots and arrows. Prev/next and dots scroll to a scene; ← / → keys work while the stage has focus. Dawn/Dusk is an `aria-pressed` toggle, remembered in `localStorage`. First / last scene disables the matching arrow (35% opacity, `not-allowed`).

**Accessibility.** The first caption is the page `<h1>` (with the brand name in visually hidden text); letters are `aria-hidden` and a visually hidden copy is read instead. Inactive captions are `aria-hidden`. Reduced motion: no scale or letter animation; scenes cross-fade and lines are drawn.

**Content.** Captions are one short sentence, ≤ 6 words, sentence case, ending in a full stop.

**Anti-patterns.** Putting body copy or forms inside the stage (it is sticky and will trap content). Auto-advancing scenes on a timer. More than six scenes (the scroll gets long).

### Property card (`.card`)

**Overview.** Summarises a listing in rails and grids; the whole card links to the property page.

**Tokens.** Padding `--space-3`; radius `--radius-lg` (card), `--radius-md` (media); border `--border`; hover `--shadow-md` + lift `--space-2`; title `--text-lg`; price `--text-lg` / `--weight-semibold`.

**Anatomy.** Media (illustration or photo, status badge, type badge) · location · title (the link) · meta (area, region) · price + arrow button.

**Variants.** Default, `.card--sold` (desaturated media, dark "Sold out" badge).

**States.** Hover: lift, media zoom 1.07, gold line draws; focus-within: `color-1` border; empty: see Listings.

**Accessibility.** One link only (the title), stretched over the card with `::after`, so screen readers hear one link per card. Badges are text, not colour.

**Content.** Title ≤ 30 characters; location "Place, District"; price in Indian format (₹6.9 L, ₹1.85 Cr). Long titles wrap; never truncate a price.

**Anti-patterns.** Wrapping the whole card in `<a>` and adding a button inside it (nested interactive elements). Status shown by colour only.

### Badge (`.badge`)

**Overview.** Status or type label on media. **Tokens.** `--text-xs`, `--radius-full`, padding `--space-2` `--space-5`. **Variants.** Available (filled dot), Few left (ring dot), Sold out (dark), Type (translucent dark). **Accessibility.** Always a word, never just the dot. **Anti-patterns.** More than two badges on one image.

### Form field (`.field`)

**Overview.** Labelled input, select or textarea used in enquiry forms and filters.

**Tokens.** Label `--text-sm` / `--weight-medium`; input min-height `--space-14`, padding `--space-5` `--space-7`, radius `--radius-md`, fill `color-5`, border `--border`; focus ring `--space-2` of `color-4`.

**States.**

| State | Treatment |
|-------|-----------|
| Default | `color-5` fill, `color-4` border |
| Hover | `color-3` border |
| Focus | `color-6` fill, `color-1` border, 4px `color-4` ring |
| Disabled | `color-4` fill, `color-2` text, `not-allowed` |
| Error | `aria-invalid="true"`, 2px `color-1` border, message with "!" icon in `.err` |
| Read-only | Plot field on the property page; filled by the plot chooser |

**Accessibility.** Every control has a `<label for>`; filter labels are visually hidden. Errors are announced by `aria-live="polite"` and focus moves to the first invalid field. Errors are signalled by text and icon, not colour.

**Content.** Labels are nouns in sentence case ("Phone"). Placeholders give an example, never the instructions ("e.g. 2 acres or 1,200 sq.ft").

**Anti-patterns.** Placeholder used as the label. Red-only error states (outside the palette and invisible to colour-blind users).

### Enquiry form (`.form-card`)

**Overview.** Collects name, phone and context, then opens WhatsApp with the message filled in, or posts to `formEndpoint` when one is configured.

**States.** Validation error, loading (fetch), success (`.form-status`), failure (falls back to WhatsApp and says so).

**Accessibility.** `novalidate` plus custom messages; status line uses `role="status"`.

**Anti-patterns.** Asking for email and phone both as required. Submitting silently with no confirmation.

### Tabs (`.tabs`)

**Overview.** Switches the contact form between Buy and Sell. **Tokens.** Container `color-5`, `--radius-full`; selected tab `color-1`. **Interactions.** Click, ← / →, roving `tabindex`; `?tab=sell` preselects. Hidden fields are disabled so they are not submitted. **Accessibility.** `role="tablist"`, `role="tab"` + `aria-selected`, panel `aria-labelledby` follows the selected tab. **Anti-patterns.** Using tabs for navigation between pages.

### Filters & chips (`.filters`, `.chip`)

**Overview.** Narrows the listings grid. **Tokens.** Chip min-height `--space-13`, `--radius-full`, `--text-sm`. **States.** Chip default / hover (border `color-1`) / pressed (`aria-pressed="true"`, `color-1` fill); Clear filters disabled when nothing is set. **Interactions.** Changes apply instantly (search debounced 160ms) and are mirrored in the URL. Sticky under the header from 760px; scrolls with the page on phones. **Empty state.** Dashed panel with Clear filters and a WhatsApp request. **Accessibility.** `role="search"`, result count in `aria-live="polite"`. **Anti-patterns.** An "Apply" button for instant filters; resetting the sort when clearing filters.

### Region explorer

**Overview.** A tab list of the seven regions with a large illustration, a lat/long survey map and a link to that region's listings. **Interactions.** Hover (pointer devices), click, ↑ / ↓ / ← / → with roving `tabindex`. Becomes horizontal pills under 900px; the mini-map hides under 560px. **Accessibility.** `role="tablist"` / `tab` / `tabpanel`; region summary is `aria-live="polite"`. **Anti-patterns.** Selecting on hover on touch devices (would fire on scroll).

### Plot chooser (`.plots`)

**Overview.** Shows a layout's plots and lets the buyer pick one, which is added to the enquiry.

**Tokens.** Available `color-6`; hover `color-4`; booked hatched `color-3`; sold `color-2`; selected `color-1`.

**Interactions.** Click or Enter / Space selects an available plot; arrow keys move focus across the grid (Home / End jump); booked and sold plots are focusable but not selectable.

**Accessibility.** Each plot is `role="button"` with a label "Plot 7, available, 30 × 40 ft", `aria-pressed` on available plots and `aria-disabled` on others; the summary line is `aria-live="polite"`. The legend uses pattern and fill, not colour alone.

**Anti-patterns.** Making every plot a tab stop (36 Tab presses to pass). Showing sold plots in a colour only.

### FAQ accordion (`.faq`)

Native `<details>` / `<summary>`; plus icon rotates to minus; open item gets a `color-1` border. Questions ≤ 80 characters. Don't nest accordions.

### Chat launcher (`.chat`)

**Overview.** Floating contact shortcut (WhatsApp, call). **Tokens.** 60px (`--space-15`) circle, `color-1`, `--shadow-sm`; panel `--radius-lg`. **Interactions.** Toggle button with `aria-expanded`; outside click and Escape close it, Escape returns focus. **Anti-patterns.** Auto-opening the panel; covering page controls (the hero bar and footer reserve space for it).

---

## Definition of done

- [x] Renders in its default state on every page (smoke-tested in Chromium).
- [x] Hover, focus-visible, active, disabled, loading, error and empty states defined.
- [x] Visual values reference tokens (illustrations excepted, see scope note).
- [x] Keyboard navigation works without a pointer.
- [x] axe-core WCAG 2.1 AA: 0 violations on all pages at 390px and 1440px.
- [x] Tested at the smallest and largest breakpoints.
- [x] Each component lists at least one anti-pattern.
