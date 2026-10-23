# Reference notes: vinode.io (concept reference only)

## Tooling status (Step 0)

| Check | Result |
|---|---|
| REA MCP tools (`github.com/morluto/rea`) | **Not available.** This session has no REA MCP server, and `rea` is not on `PATH`, so `rea doctor` could not run. |
| Plain HTTP reachability of `https://vinode.io` | **Blocked** by the sandbox's outbound proxy (HTTP 403 on CONNECT). |

As the brief allows, nothing was observed on the live site. **No source, copy, assets or
network traces from vinode.io were collected.** The notes below describe the *technique
family* this kind of product generally uses, from general web-engineering knowledge. They
are **not** observations of vinode.io. If REA becomes available later, rerun Step 0 and
replace the "Assumed" column with real observations.

## Technique notes (general knowledge, not observed)

| Area | Assumed technique for this product category | What we do in this build |
|---|---|---|
| Hero animation | Scroll-scrubbed pre-rendered sequence. It's either an image-frame sequence drawn to `<canvas>`, or a `<video>` whose `currentTime` is driven by scroll. Frame sequences scrub smoothly everywhere. Video seeking is jerky on many mobiles unless every frame is a keyframe. | `<canvas>` frame sequence driven by GSAP ScrollTrigger. A video-scrub mode (all-intra encode) is also supported. Mode is chosen in `frontend/src/config/media.config.ts`. |
| Frame strategy | WebP/AVIF frames at 2 resolutions (mobile/desktop), roughly 60–150 frames, loaded progressively. Coarse frames load first (every 4th), then gaps are filled. | Poster first. Then every 4th frame, then all remaining frames after `load`/idle. The nearest loaded frame is drawn while scrubbing. |
| 3D / pre-rendered model | Pre-rendered turntable frames for photoreal views. Lightweight WebGL massing for interactive unit picking. | Three.js massing model (lazy chunk, only on `/explorer`) for picking floors/units. Pre-rendered stills for the mood. |
| Loading | Critical CSS inline, preload poster/LCP image, defer heavy JS, code-split per route. | Same: `<link rel=preload>` poster, route-level `React.lazy`, Three.js only in the explorer chunk. |
| PWA / offline | Service worker precaches the shell and caches API + media at runtime, so a sales-suite kiosk keeps working offline. | `vite-plugin-pwa` (Workbox). Shell precache, NetworkFirst for project/unit API, CacheFirst for media. |
| Network formats | Images as AVIF/WebP, immutable hashed assets with long `Cache-Control`, Brotli. | Hashed Vite assets, `immutable` headers (see `frontend/vercel.json`), WebP media at 2 widths. |

## Performance targets we hold ourselves to

- LCP < 1.0 s on a fast 4G profile for the home page (poster image is the LCP element).
- Lighthouse mobile ≥ 90 on Performance, Accessibility, Best Practices, SEO.
- Initial JS for `/` < 120 kB gzip. Three.js is never in the initial bundle.
- Hero frames: ≈45 kB per mobile frame (600×750) and ≈75 kB per desktop frame (1280×720), WebP q50.
  The demo clip is unusually detailed (foliage, line drawings), so it compresses less than typical renders.
  Frames never block first paint. On Save-Data or 2G/3G only every 3rd frame loads.
