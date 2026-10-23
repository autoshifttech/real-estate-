# Media: how to drop in your own renders

All web media lives in `frontend/public/media/` and is **generated**. Don't hand-edit it.
Your originals stay in the source folders at the repo root:

| Source folder | What goes in it | Generated output |
|---|---|---|
| `clips/*.mp4` | Pre-rendered fly-through / build-up videos | `media/sequences/<clip-name>/` WebP frame sequence (desktop + mobile), posters, `manifest.json` |
| `keyframes/*.webp\|jpg\|png` | Hero stills, interiors, cut-aways | `media/scenes/<slug>-800.webp`, `-1600.webp`, `-lqip.webp` |
| `gallery/*` | Extra exteriors for project galleries | same as keyframes |
| `reference-frames/` | Inspiration stills | **Not used** by the site. Keep them out of production. |

## 1. Replace the hero animation

1. Export your animation as an MP4. 16:9, 1920×1080, 6–12 s works best. Keep the subject centred
   so the 4:5 mobile crop still frames it.
2. Put it in `clips/`, e.g. `clips/my-tower.mp4`.
3. Run the pipeline. It needs `ffmpeg` with libwebp:
   ```bash
   scripts/video_to_frames.sh clips/my-tower.mp4 frontend/public/media/sequences/my-tower --fps 12
   # or rebuild everything:
   scripts/build_media.sh
   ```
4. Point the hero at it in `frontend/src/config/media.config.ts`:
   ```ts
   hero: { sequence: "/media/sequences/my-tower", ... }
   ```
   The frontend reads `manifest.json` for frame count, sizes and poster names, so nothing else changes.

### Script options
```
--fps N             frames sampled per second (default 12). 8–15 is the sweet spot.
--desktop-width N   default 1280 (16:9 kept)
--mobile-width N    default 600
--mobile-aspect W:H centre crop for phones (default 4:5, "none" to keep 16:9)
--quality N         WebP quality (default 50; mobile uses N-4)
--start S --end S   trim
```
Rule of thumb: frames × average frame size is the total scrub weight. Frames stream in after first paint
(every 4th frame first, then the gaps). On Save-Data or slow connections only every 3rd frame is fetched.

### Video-scrub mode (alternative)
Set `hero.mode = "video"` in `media.config.ts` and supply an all-intra MP4. Every frame must be a
keyframe, or seeking stutters:
```bash
ffmpeg -i clips/my-tower.mp4 -an -c:v libx264 -g 1 -crf 26 -preset slow -movflags +faststart \
  -vf scale=1280:-2 frontend/public/media/sequences/my-tower/scrub.mp4
```
Frame sequences scrub more smoothly on iOS. Video is smaller for long clips.

## 2. Replace the scene stills

Add or rename entries in the `SCENES` table at the top of `scripts/build_media.sh`
(`"keyframes/your-file.webp"]="slug"`), run it, then reference `/media/scenes/<slug>-1600.webp`
from `media.config.ts` or from a project's gallery in the CMS.

## 3. Images uploaded through the CMS

Images uploaded in the back panel are re-encoded to WebP (max 2560 px) and served from the API at
`/uploads/…`. Point `UPLOAD_DIR` at a persistent disk in production (see README).

## 4. Brochure cover

`backend/app/assets/cover.jpg` is the default PDF cover. A project whose hero image was uploaded
through the CMS uses that upload instead.
