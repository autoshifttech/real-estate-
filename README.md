# Tenkasi Land Promoters — website

A complete real estate website for **Tenkasi Land Promoters**: residential plots, farm land, hill estates and commercial land across Tenkasi, Tirunelveli, Virudhunagar, Thoothukudi, Kodaikanal, Ooty and Kerala.

The design follows the [Vinode](https://vinode.io/) design system: a cinematic, scroll-driven hero where scenes cross-fade and the camera pushes forward, a single glowing line that traces each plot boundary, neutral greys, Poppins and Inter, pill buttons and 20 px cards. See [`admin/              admin panel (index.html, admin.js, admin.css)
api/                serverless functions: admin.js, enquiry.js, _lib/
tools/dev-server.js local preview of the site + admin
docs/design-system.md`](docs/design-system.md) for tokens and component guidelines.

## Pages

Every page shares a floating pill navigation bar with dropdowns for Properties, Locations, Services and Company (hover, click or keyboard), a Contact link and a "Book a site visit" button; on phones it becomes a menu button with expandable sections.

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

> You can now do all of this from the **admin panel** (below) instead of editing files.

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

## About the images

The hero, property cards, regions and banners use **golden-hour aerial renders** in `assets/img/scenes/` (plotted layouts among coconut groves, Ghats farmland, coconut and mango groves, Kerala river, Thoothukudi coast, palmyra plains, highway, Kodaikanal and Ooty hills). They are generated, not photographs, by `tools/scenes/render.html`; regenerate with:

```sh
node tools/scenes/render.js            # needs Playwright (Chromium) and ImageMagick
```

That also writes `assets/js/scenes.js`, the gold plot outline drawn on top of each image.

**Using your own drone photos:** add `image: "assets/img/properties/your-photo.jpg"` to a listing in `assets/js/data.js` and it replaces the render on the card and property page. To change a hero image, replace the matching file in `assets/img/scenes/` (keep a 16:10 photo with sky in the top third, where the headline sits).

## Admin panel (`/admin`)

Sign in at **`https://<your-site>.vercel.app/admin/`** with a username and password to manage the whole site without touching code:

| Section | What you can do |
|---|---|
| Dashboard | Counts, quick actions, latest enquiries |
| Properties | Add a property with just **photos, an optional video and the social-media caption** (drag and drop files, drag photos to reorder) (English, Tamil or both). `assets/js/caption.js` reads the title, place, region, type, price (₹, lakhs, crores, per cent / per acre), land size, road and approval from the caption and shows a live "On the website" preview; the property page shows the caption itself, with a photo gallery and video player. Edit, duplicate, delete and reorder listings; click the status pill to cycle available / few left / sold; star to feature on the home page |
| Enquiries | Every form sent on the website, newest first; New / Contacted / Closed; call or WhatsApp in one tap; delete; export CSV |
| Regions | Name, Tamil name, description, image, map position; add, reorder, delete |
| Steps & FAQs | The "How it works" steps and the FAQ list |
| Settings | Phone, WhatsApp, email, address, hours, map location, brand names, social links, the numbers shown on the site |

Edits are a **draft** until you press **Publish to website**. Publishing saves one commit to GitHub and Vercel puts it live in about a minute. Photos are saved when you upload them and appear once you publish.

### Demo mode (before the backend is connected)

Until the settings below are added, `/admin/` runs in **demo mode**: sign in with the demo account you were given, and everything you publish (properties, photos, settings, regions, FAQs) is saved **in that browser only**, and the website shows those changes in that same browser, Photos and videos are kept in that browser's IndexedDB (`assets/js/media.js`). Website enquiries sent from that browser appear in the demo inbox. Other visitors always see the normal site, so demo sign-ins can't change the live website. The demo password is stored only as a SHA-256 hash in `admin/admin.js`. Clear it from **Settings → Restore original content**.

Demo mode switches off by itself as soon as the real backend is configured.

### One-time setup

1. **Create a GitHub token** — github.com → your picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   *Resource owner*: `autoshifttech` · *Repository access*: **Only select repositories** → `real-estate-` · *Permissions → Repository permissions → Contents*: **Read and write** · choose an expiry (note the date — renew the token before it ends). Copy the token.
2. **Add settings in Vercel** — project → **Settings → Environment Variables**, for *Production* (and *Preview* if you use it):

   | Name | Value |
   |---|---|
   | `ADMIN_USERNAME` | the name you will sign in with |
   | `ADMIN_PASSWORD` | at least 8 characters; the longer and less guessable, the safer |
   | `SESSION_SECRET` | a long random string, 32+ characters (e.g. from a password generator). **Never change it later** — it also unlocks saved enquiries |
   | `GITHUB_TOKEN` | the token from step 1 |
   | `GITHUB_BRANCH` | *optional* — the branch the site deploys from; defaults to the deployed branch |

3. **Redeploy** — Deployments → ⋯ → **Redeploy**. Then open `/admin/`.

To change the password, edit `ADMIN_PASSWORD` in Vercel and redeploy.

### How it is built and kept safe

- The username and password live only in Vercel's settings, never in the code — this repository is public.
- `api/admin.js` and `api/enquiry.js` are Vercel serverless functions (plain Node, no packages). Shared code is in `api/_lib/`.
- Sign-in is checked on the server; the session is a signed, `HttpOnly`, `SameSite=Strict` cookie that lasts 12 hours. Repeated wrong passwords are slowed down and locked out for 15 minutes. Admin requests also need a custom header, which blocks cross-site requests.
- Everything the admin sends is checked and rebuilt field by field on the server before it is saved (lengths, links must be `https://`, photo types are verified, ids are unique), so a typo can't break the site.
- If two people edit at once, the second publish is stopped with "someone else changed it — reload" instead of overwriting.
- **Enquiries contain names and phone numbers, and this repository is public**, so they are encrypted (AES-256-GCM) before saving, on a separate branch `admin-data` that Vercel does not deploy. Only the server, with `SESSION_SECRET`, can read them. Making the GitHub repository private is still recommended.
- Website forms still open WhatsApp as before; the copy saved to the inbox is in addition.

### Moving to Supabase later

Storage sits behind one small interface in `api/_lib/store.js` (`read`, `list`, `commit`, `ensureBranch`), and enquiries behind `api/_lib/enquiries.js` (`add`, `all`, `update`). To switch to Supabase, add a Supabase adapter there (tables for properties, regions, FAQs, settings and enquiries, using a service-role key kept in a Vercel setting). The admin panel and the API actions stay the same.

### Try it locally

```sh
ADMIN_USERNAME=admin ADMIN_PASSWORD=change-me-123 SESSION_SECRET=$(openssl rand -hex 32) node tools/dev-server.js
# site: http://localhost:8000   admin: http://localhost:8000/admin/
```

Locally, saves write straight to the files in this folder and enquiries go to `.data/` (ignored by git).

## After editing CSS or JS

Every page links its files with a version, e.g. `assets/js/data.js?v=20261024c`. When you change any CSS or JS file, bump that version on all pages (one find-and-replace) so visitors' browsers load the new files instead of an old cached copy.

## Project structure

```
index.html  properties.html  property.html  about.html  contact.html  404.html
assets/
  css/style.css     site styles, built on design tokens
  css/art.css       palette for the generated illustrations (dawn / dusk)
  js/config.js      business details  (edited by the admin panel)
  js/data.js        regions, listings, process, FAQs  (edited by the admin panel)
  js/art.js         SVG landscape generator
  js/core.js        header, footer, menu, chat button, cards, forms
  js/home.js        scroll story, regions explorer, process line
  js/listings.js    properties filters
  js/property.js    property page, gallery and plot chooser
  js/caption.js     reads property details from a social-media caption
  js/media.js       photos / videos stored in the browser until a database is connected
  js/contact.js     buy / sell tabs, map
  img/              favicon, social preview image
docs/design-system.md
```

## Accessibility

Keyboard navigation throughout (skip link, menu, story arrows, region tabs with arrow keys, plot chooser with arrow keys / Enter, buy-sell tabs), visible focus rings, `prefers-reduced-motion` support, form errors announced to screen readers and not signalled by colour alone. Every page passes an axe-core WCAG 2.1 AA audit.
