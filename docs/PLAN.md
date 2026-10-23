# Aurevia — Build Plan

> **Aurevia** is a placeholder, fictional brand. Rename it in `frontend/src/config/brand.ts`
> and `backend/app/config.py` (`BRAND_NAME`).

Aurevia is two things in one product:

1. **A public marketing and sales site** for an off-plan development platform. It has a
   cinematic scroll hero, an interactive unit explorer, personalised PDF brochures and an
   installable, offline-capable PWA.
2. **A back panel** (auth required) with a sales CRM (leads, pipeline, notes, CSV), a CMS
   (projects, buildings, units, pricing, status, images, blog) and a dashboard.

The demo content is **Calanthe Bay Residences**, a fictional hillside development with two
buildings (Terrace House and Cliff House) and 40 units.

## 1. Architecture

```
┌──────────────── Browser (PWA) ────────────────┐      ┌──────────── FastAPI ────────────┐
│ React + Vite + TS + Tailwind                   │ HTTPS│ /api/public  projects, units,   │
│  ├─ Public routes (code-split)                 │─────▶│   blog, enquiries (rate-limited)│
│  │   Hero: GSAP ScrollTrigger + <canvas> frames│      │   brochure.pdf (ReportLab)      │
│  │   Explorer: Three.js (lazy chunk)           │      │ /api/auth    JWT login          │
│  ├─ Admin routes (lazy, JWT bearer)            │      │ /api/admin   CRM, CMS, stats    │
│  └─ Service worker (Workbox)                   │      │ Pydantic validation, nh3 sanitise│
│      precache shell · NetworkFirst API ·       │      └───────────────┬─────────────────┘
│      CacheFirst media                          │                      │ Motor (async)
└────────────────────────────────────────────────┘              ┌───────▼───────┐
                                                                │   MongoDB 7   │
                                                                └───────────────┘
```

### Stack decisions (and the reasons for the deviations)

| Brief | Choice | Reason |
|---|---|---|
| PDF: WeasyPrint **or** ReportLab | **ReportLab** | Pure Python wheels, so there's no Pango/Cairo system dependency. This keeps the Docker image and Render build simple. We draw floor plans as vectors from the same plan data the web uses. |
| Mongo driver | **Motor** (async) | Native async with FastAPI. Tests use `mongomock-motor` (in-memory), so CI needs no Mongo server. |
| Password hashing | **bcrypt** (direct) | `passlib` is unmaintained. |
| Sanitising | **Pydantic** constraints + **nh3** | nh3 strips HTML from free text and allow-lists tags for blog bodies. |
| Rate limiting | Small in-process sliding-window limiter | No extra infra for the demo. Known gap: use Redis for more than one instance. |
| 3D | **Three.js** (no R3F) | Only the explorer needs it. Plain three keeps the chunk small and the scene code explicit. |
| Charts | Hand-rolled SVG | Three small charts don't justify a chart library in the admin bundle. |
| Fonts | `@fontsource` (self-hosted) | No third-party request, works offline, no layout shift with `font-display: swap` + fallback metrics. |

## 2. Folder tree

```
.
├── backend/
│   ├── app/
│   │   ├── main.py            FastAPI app, CORS, routers, static uploads
│   │   ├── config.py          pydantic-settings (env based, no secrets in repo)
│   │   ├── db.py              Motor client, indexes, mongomock dev mode
│   │   ├── security.py        bcrypt, JWT, auth dependencies
│   │   ├── ratelimit.py       sliding-window limiter dependency
│   │   ├── sanitize.py        nh3 helpers
│   │   ├── schemas.py         Pydantic models (in/out)
│   │   ├── plans.py           floor-plan layouts (shared by API + PDF)
│   │   ├── pdf.py             ReportLab brochure
│   │   ├── seed.py            demo data (1 project, 2 buildings, 40 units, 25 leads, blog)
│   │   └── routers/           public.py, auth.py, leads.py, cms.py, stats.py, uploads.py
│   ├── tests/                 pytest + httpx AsyncClient
│   ├── pyproject.toml / requirements.txt / Dockerfile
├── frontend/
│   ├── public/media/          generated, optimised media (see docs/ASSETS.md)
│   ├── src/
│   │   ├── config/            brand.ts, media.config.ts, platform.ts (pricing/faq copy)
│   │   ├── lib/               api client, auth, format, visitor tracking
│   │   ├── components/        layout, hero, sections, ui
│   │   ├── explorer/          Three.js scene + explorer UI
│   │   ├── pages/             public pages
│   │   └── admin/             admin shell, CRM, CMS, dashboard
│   ├── vite.config.ts (PWA) · tailwind.config.ts · Dockerfile · vercel.json
├── clips/ keyframes/ gallery/ your original source media (left in place, not served directly)
├── reference-frames/          inspiration stills — NOT used by the site
├── scripts/
│   ├── video_to_frames.sh     ffmpeg → WebP frame sequence (2 widths) + poster
│   └── build_media.sh         optimises keyframes/gallery into frontend/public/media
├── docs/                      PLAN.md, reference-notes.md, ASSETS.md
├── docker-compose.yml
└── README.md
```

## 3. Data models (MongoDB collections)

| Collection | Fields |
|---|---|
| `users` | `email` (unique), `name`, `password_hash`, `role` (`admin`/`agent`), `created_at` |
| `projects` | `slug` (unique), `name`, `tagline`, `location`, `summary`, `description`, `hero_image`, `gallery[]`, `amenities[]`, `completion`, `status` (`launching`/`selling`/`sold_out`), `currency`, `published`, timestamps |
| `buildings` | `project_id`, `code` (A/B), `name`, `floors`, `units_per_floor`, `description`, `position` `{x, z}` for the 3D scene |
| `units` | `project_id`, `building_id`, `code` (e.g. `A-302`), `floor`, `position` (index on floor), `beds`, `baths`, `area_sqm`, `terrace_sqm`, `price`, `status` (`available`/`reserved`/`sold`), `orientation`, `plan_type`, `features[]`, `updated_at` |
| `leads` | `name`, `email`, `phone`, `message`, `source` (`website`/`explorer`/`brochure`/`contact`/`referral`/`portal`/`walk_in`), `stage` (`new`/`contacted`/`viewing`/`reserved`/`won`/`lost`), `unit_interest[]`, `units_viewed[]` `{unit_id, code, at}`, `notes[]` `{id, body, author, at}`, `visitor_id`, `consent`, `assignee`, timestamps |
| `unit_views` | `visitor_id`, `unit_id`, `code`, `at`. Anonymous views, attached to a lead when that visitor enquires. |
| `posts` | `slug` (unique), `title`, `excerpt`, `body` (sanitised Markdown/HTML), `cover`, `author`, `published`, `published_at`, timestamps |

## 4. API

Everything is under `/api`. Admin routes need `Authorization: Bearer <jwt>`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/projects` · `/projects/{slug}` | published only, includes buildings + unit counts |
| GET | `/projects/{slug}/units` | filters: `building`, `beds`, `min_price`, `max_price`, `floor_min`, `floor_max`, `status` |
| GET | `/units/{id}` | single unit with plan layout |
| GET | `/plans/{plan_type}` | floor-plan geometry (rooms) |
| GET | `/units/{id}/brochure.pdf?name=` | personalised PDF, server-side, live price |
| POST | `/enquiries` | public lead capture. **Rate-limited** (5/min, 20/h per IP), honeypot, validated, sanitised |
| POST | `/track/view` | anonymous unit view (rate-limited) |
| GET | `/posts` · `/posts/{slug}` | blog |
| POST | `/auth/login` · GET `/auth/me` | JWT. Login is rate-limited |
| GET/POST | `/admin/leads` | list (search, stage, source, paging, sort) / create |
| GET/PATCH/DELETE | `/admin/leads/{id}` | detail / update stage etc. / delete |
| POST | `/admin/leads/{id}/notes` | add note |
| GET | `/admin/leads/export.csv` | CSV export (respects filters) |
| CRUD | `/admin/projects` · `/admin/buildings` · `/admin/units` · `/admin/posts` | CMS |
| POST | `/admin/units/bulk-price` | % or absolute adjust by building/status |
| POST | `/admin/uploads` | image upload (type + size checked, stored under `UPLOAD_DIR`) |
| GET | `/admin/stats` | leads/day (30 d), conversion rate, units by status, pipeline counts |

## 5. Milestones

Each milestone ends with lint, typecheck, tests and a commit.

1. **M0 – Plan & reference**: this doc and reference notes.
2. **M1 – Backend core**: config, DB, auth, schemas, public + admin routers, rate limit, PDF, seed, pytest suite, ruff + mypy.
3. **M2 – Media pipeline**: `video_to_frames.sh`, `build_media.sh`, media config, docs/ASSETS.md.
4. **M3 – Public site**: layout, hero scroll sequence, sections, projects + detail, FAQ, blog, contact.
5. **M4 – Unit explorer**: Three.js scene, filters, compare, enquiry, brochure link, view tracking.
6. **M5 – PWA**: manifest, icons, service worker strategies, offline explorer.
7. **M6 – Back panel**: login, dashboard, leads table + drawer, kanban, CSV, CMS screens.
8. **M7 – Hardening & delivery**: Docker Compose, Lighthouse mobile run, README, checklist, known gaps.
