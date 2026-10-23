#!/usr/bin/env bash
# Build optimised web media from the source folders into frontend/public/media.
#
#   clips/*.mp4        → frontend/public/media/sequences/<name>/   (via video_to_frames.sh)
#   keyframes/*.webp   → frontend/public/media/scenes/<slug>-{800,1600}.webp
#   gallery/*.webp     → frontend/public/media/scenes/<slug>-{800,1600}.webp
#
# Re-run any time you drop new source media in. Map source file names to
# web slugs in the SCENES table below.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/frontend/public/media"
mkdir -p "$OUT/scenes" "$OUT/sequences"

declare -A SCENES=(
  ["keyframes/01_K1_model.webp"]="model"
  ["keyframes/02_K2_model_gold_line.webp"]="model-line"
  ["keyframes/03_K2.5_real_house_aerial.webp"]="aerial"
  ["keyframes/04_K3_entrance.webp"]="entrance"
  ["keyframes/05_K4_living_room.webp"]="living"
  ["keyframes/06_K5_glass_wall.webp"]="glass-wall"
  ["keyframes/07_K6_terrace.webp"]="terrace"
  ["keyframes/08_K7_pool_sunset.webp"]="pool-sunset"
  ["keyframes/09_K7N_pool_midnight.webp"]="pool-night"
  ["keyframes/10_K8_drone_above_house.webp"]="drone"
  ["keyframes/11_K9_cutaway_model.webp"]="cutaway"
  ["gallery/exterior_sunset_1.webp"]="exterior-1"
  ["gallery/exterior_sunset_2.webp"]="exterior-2"
)

for src in "${!SCENES[@]}"; do
  slug="${SCENES[$src]}"
  [[ -f "$ROOT/$src" ]] || { echo "skip (missing) $src"; continue; }
  for w in 800 1600; do
    q=$([[ $w == 800 ]] && echo 64 || echo 70)
    ffmpeg -loglevel error -y -i "$ROOT/$src" -vf "scale='min(${w},iw)':-2:flags=lanczos" \
      -c:v libwebp -quality "$q" -compression_level 6 -preset photo "$OUT/scenes/${slug}-${w}.webp"
  done
  # Tiny blurred placeholder (inlined by the frontend as a background while the real image loads).
  ffmpeg -loglevel error -y -i "$ROOT/$src" -vf "scale=24:-2" -c:v libwebp -quality 40 "$OUT/scenes/${slug}-lqip.webp"
  echo "✓ scene $slug"
done

for clip in "$ROOT"/clips/*.mp4; do
  [[ -f "$clip" ]] || continue
  name="$(basename "$clip" .mp4)"
  "$ROOT/scripts/video_to_frames.sh" "$clip" "$OUT/sequences/$name" "$@"
done
du -sh "$OUT"/*
