#!/usr/bin/env bash
# Convert a video into a scroll-scrubbable WebP frame sequence (desktop + mobile)
# plus poster images and a manifest.json the frontend reads.
#
# Usage:
#   scripts/video_to_frames.sh <input.mp4> <output_dir> [options]
#
# Options:
#   --fps N             frames per second to sample (default 12)
#   --desktop-width N   desktop frame width, keeps 16:9 (default 1280)
#   --mobile-width N    mobile frame width (default 600)
#   --mobile-aspect W:H crop the centre to this aspect for portrait phones (default 4:5, "none" to keep)
#   --quality N         WebP quality 0-100 (default 50)
#   --start S --end S   trim the input (seconds)
#
# Output:
#   <out>/desktop/frame_0001.webp ...   <out>/mobile/frame_0001.webp ...
#   <out>/poster-desktop.webp  <out>/poster-mobile.webp  <out>/manifest.json
set -euo pipefail

usage() { sed -n '2,20p' "$0"; exit 1; }
[[ $# -lt 2 ]] && usage
IN="$1"; OUT="$2"; shift 2
FPS=12; DW=1280; MW=600; MASPECT="4:5"; Q=50; START=""; END=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fps) FPS="$2"; shift 2 ;;
    --desktop-width) DW="$2"; shift 2 ;;
    --mobile-width) MW="$2"; shift 2 ;;
    --mobile-aspect) MASPECT="$2"; shift 2 ;;
    --quality) Q="$2"; shift 2 ;;
    --start) START="$2"; shift 2 ;;
    --end) END="$2"; shift 2 ;;
    *) echo "Unknown option $1"; usage ;;
  esac
done
command -v ffmpeg >/dev/null || { echo "ffmpeg is required"; exit 1; }
[[ -f "$IN" ]] || { echo "Input not found: $IN"; exit 1; }

TRIM=()
[[ -n "$START" ]] && TRIM+=(-ss "$START")
[[ -n "$END" ]] && TRIM+=(-to "$END")

rm -rf "$OUT/desktop" "$OUT/mobile"
mkdir -p "$OUT/desktop" "$OUT/mobile"

echo "→ desktop frames (${DW}px, ${FPS}fps, q${Q})"
ffmpeg -loglevel error -y "${TRIM[@]}" -i "$IN" -an \
  -vf "fps=${FPS},scale=${DW}:-2:flags=lanczos" \
  -c:v libwebp -quality "$Q" -compression_level 6 -preset photo \
  "$OUT/desktop/frame_%04d.webp"

if [[ "$MASPECT" == "none" ]]; then
  MFILTER="fps=${FPS},scale=${MW}:-2:flags=lanczos"
else
  AW="${MASPECT%%:*}"; AH="${MASPECT##*:}"
  MFILTER="fps=${FPS},crop='min(iw,ih*${AW}/${AH})':'min(ih,iw*${AH}/${AW})',scale=${MW}:-2:flags=lanczos"
fi
echo "→ mobile frames (${MW}px, aspect ${MASPECT})"
ffmpeg -loglevel error -y "${TRIM[@]}" -i "$IN" -an -vf "$MFILTER" \
  -c:v libwebp -quality "$((Q - 4))" -compression_level 6 -preset photo \
  "$OUT/mobile/frame_%04d.webp"

COUNT=$(find "$OUT/desktop" -name 'frame_*.webp' | wc -l | tr -d ' ')
MCOUNT=$(find "$OUT/mobile" -name 'frame_*.webp' | wc -l | tr -d ' ')
[[ "$COUNT" == "$MCOUNT" ]] || { echo "Frame count mismatch ($COUNT vs $MCOUNT)"; exit 1; }

# Posters = first frame, at slightly higher quality (they are the LCP image).
ffmpeg -loglevel error -y "${TRIM[@]}" -i "$IN" -frames:v 1 -vf "scale=${DW}:-2:flags=lanczos" \
  -c:v libwebp -quality 72 "$OUT/poster-desktop.webp"
ffmpeg -loglevel error -y "${TRIM[@]}" -i "$IN" -frames:v 1 -vf "${MFILTER#fps=${FPS},}" \
  -c:v libwebp -quality 70 "$OUT/poster-mobile.webp"

read -r DWW DHH < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT/desktop/frame_0001.webp" | tr ',' ' ')
read -r MWW MHH < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT/mobile/frame_0001.webp" | tr ',' ' ')
DBYTES=$(du -cb "$OUT"/desktop/*.webp | tail -1 | cut -f1)
MBYTES=$(du -cb "$OUT"/mobile/*.webp | tail -1 | cut -f1)

cat > "$OUT/manifest.json" <<JSON
{
  "frameCount": $COUNT,
  "fps": $FPS,
  "pattern": "frame_{index}.webp",
  "pad": 4,
  "desktop": { "dir": "desktop", "width": $DWW, "height": $DHH, "bytes": $DBYTES, "poster": "poster-desktop.webp" },
  "mobile": { "dir": "mobile", "width": $MWW, "height": $MHH, "bytes": $MBYTES, "poster": "poster-mobile.webp" }
}
JSON
echo "✓ $COUNT frames → $OUT  (desktop $((DBYTES / 1024)) KB total, mobile $((MBYTES / 1024)) KB total)"
