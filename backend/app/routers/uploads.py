"""Image uploads. Every file is decoded and re-encoded to WebP, which strips metadata
and rejects anything that isn't really an image."""

import io
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, UploadFile, status
from PIL import Image, UnidentifiedImageError

from ..config import get_settings
from ..security import AdminUser

router = APIRouter(prefix="/admin/uploads", tags=["cms"])

ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/avif"}
MAX_SIDE = 2560
Image.MAX_IMAGE_PIXELS = 60_000_000


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(request: Request, file: UploadFile, _: AdminUser) -> dict[str, Any]:
    settings = get_settings()
    if file.content_type not in ALLOWED:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Use JPEG, PNG, WebP or AVIF")
    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"Max {settings.max_upload_mb} MB")
    try:
        img: Image.Image = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Not a valid image") from exc
    img = img.convert("RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    out_dir = Path(settings.upload_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.webp"
    img.save(out_dir / name, "WEBP", quality=82, method=5)
    url = str(request.base_url).rstrip("/") + f"/uploads/{name}"
    return {"url": url, "width": img.width, "height": img.height}
