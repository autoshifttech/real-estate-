# Tenkasi Land Promoters — website

A complete real estate website for **Tenkasi Land Promoters**: residential plots, farm land, hill estates and commercial land across Tenkasi, Tirunelveli, Virudhunagar, Thoothukudi, Kodaikanal, Ooty and Kerala.

The design follows the [Vinode](https://vinode.io/) design system: a cinematic, scroll-driven hero where scenes cross-fade and the camera pushes forward, a single glowing line that traces each plot boundary, neutral greys, Poppins and Inter, pill buttons and 20 px cards. See [`docs/design-system.md`](docs/design-system.md) for tokens and component guidelines.

## Pages

| Page | File | What it does |
|------|------|--------------|
| Home | `index.html` | Five-scene scroll story with a dawn/dusk toggle, featured listings, regions explorer with a lat/long map, categories, process, sell banner, video section, FAQ, enquiry form |
| Properties | `properties.html` | Region chips, type / budget / sort filters and search, synced to the URL (`?region=tenkasi&type=farm`) |
| Property | `property.html?id=…` | Hero, spec bar, highlights, interactive plot chooser for layouts, map, walkthrough links, enquiry form, similar listings |
| About | `about.html` | Story, four promises, community numbers |
| Contact | `contact.html` | Buy / sell tabs (`?tab=sell`), contact details, map |
| 404 | `404.html` | Not-found page (GitHub Pages serves it automatically) |

## No build step

Plain HTML, CSS and JavaScript. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

### Publish on GitHub Pages

Repository → **Settings → Pages** → *Deploy from a branch* → pick the branch and `/ (root)` → Save. The site is live at `https://<user>.github.io/<repo>/` a minute later. Netlify, Vercel or any static host works the same way (no build command, publish directory `/`).

## Before going live — edit these two files

### 1. `assets/js/config.js` — business details

Phone, WhatsApp number, email, office address, opening hours and social links. **The phone, WhatsApp and email are placeholders** (`+91 00000 00000`, `hello@example.com`) and must be replaced. Every header, footer, button and form on the site reads from this file.

Forms open WhatsApp with the enquiry pre-filled. To receive them by email instead, create a free form endpoint (Formspree, Web3Forms, Getform…) and paste its URL into `formEndpoint`.

### 2. `assets/js/data.js` — listings, regions, FAQs

**The 13 listings are sample content** written to show how the site works — titles, prices, areas, distances and highlights are illustrative. Replace them with real properties. Each listing supports:

```js
{
  id: "courtallam-meadows",          // used in property.html?id=…
  title: "Courtallam Meadows",
  region: "tenkasi",                  // a region id
  type: "plot",                       // plot | farm | estate | commercial | house
  location: "Courtallam Road, Tenkasi",
  price: 690000,                      // rupees, for filtering and sorting
  priceNote: "onwards",               // "onwards", "per cent", "total" (hidden)…
  area: "1,200 – 2,400 sq.ft",
  approval: "DTCP approved",
  road: "30 ft blacktop",
  status: "available",                // available | few | sold
  featured: true,                     // shown on the home page
  image: "assets/img/properties/courtallam.jpg", // optional photo — replaces the illustration
  video: "https://www.instagram.com/reel/…",     // optional walkthrough link
  art: { kind: "plan", seed: 7 },     // illustration when there is no photo
  layout: { rows: 4, cols: 9, plotSize: "30 × 40 ft", sold: [0, 1], booked: [5] }, // optional plot chooser
  summary: "…", description: "…", highlights: ["…"], nearby: [{ name: "…", dist: "5 km" }], coords: [8.94, 77.28]
}
```

Illustration kinds: `plan`, `ghats`, `farm` (`trees: "mango"` for orchards), `hills` (`tea: true` for tea estates), `river`, `coast`, `plains`, `highway`. Change `seed` for a different variation.

## About the illustrations

There are no stock photos. Every landscape — the Western Ghats with the Courtallam falls, coconut groves, Kodaikanal pines, Ooty tea rows, Punalur riverbanks, Thoothukudi salt pans, Tirunelveli palmyra and wind turbines, isometric site plans — is drawn in SVG by `assets/js/art.js` from a seed, in two palettes (dawn and dusk). They load instantly and stay sharp at any size. Add real photos per listing with the `image` field whenever you have them.

## Project structure

```
index.html  properties.html  property.html  about.html  contact.html  404.html
assets/
  css/style.css     site styles, built on design tokens
  css/art.css       palette for the generated illustrations (dawn / dusk)
  js/config.js      business details  ← edit
  js/data.js        regions, listings, process, FAQs  ← edit
  js/art.js         SVG landscape generator
  js/core.js        header, footer, menu, chat button, cards, forms
  js/home.js        scroll story, regions explorer, process line
  js/listings.js    properties filters
  js/property.js    property page and plot chooser
  js/contact.js     buy / sell tabs, map
  img/              favicon, social preview image
docs/design-system.md
```

## Accessibility

Keyboard navigation throughout (skip link, menu, story arrows, region tabs with arrow keys, plot chooser with arrow keys / Enter, buy-sell tabs), visible focus rings, `prefers-reduced-motion` support, form errors announced to screen readers and not signalled by colour alone. Every page passes an axe-core WCAG 2.1 AA audit.
