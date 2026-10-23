"""Personalised unit brochure rendered server-side with ReportLab.

Prices and status are read at request time, so every download is current.
"""

import io
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas

from .config import get_settings
from .plans import get_plan

ASSETS = Path(__file__).parent / "assets"
INK = HexColor("#0E0D0B")
PAPER = HexColor("#F4EFE6")
GOLD = HexColor("#B8925A")
MUTED = HexColor("#6B655C")
LINE = HexColor("#D8CFC0")

ROOM_FILL = {
    "terrace": HexColor("#E6DCCB"),
    "living": HexColor("#FBF8F2"),
    "bed": HexColor("#F3EDE2"),
    "bath": HexColor("#E9EEF0"),
    "kitchen": HexColor("#F6F0E4"),
    "hall": HexColor("#F1ECE3"),
    "study": HexColor("#F3EDE2"),
}

CURRENCY_SYMBOL = {"EUR": "€", "GBP": "£", "USD": "$", "AED": "AED "}


def money(value: int, currency: str) -> str:
    symbol = CURRENCY_SYMBOL.get(currency, currency + " ")
    return f"{symbol}{value:,.0f}"


def _image_for(project: dict[str, Any]) -> Path:
    hero = project.get("hero_image") or ""
    if "/uploads/" in hero:
        candidate = Path(get_settings().upload_dir) / Path(hero).name
        if candidate.is_file():
            return candidate
    return ASSETS / "cover.jpg"


def _cover_image(c: Canvas, path: Path, x: float, y: float, w: float, h: float) -> None:
    """Draw an image cropped to fill the box (CSS object-fit: cover)."""
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    p = c.beginPath()
    p.rect(x, y, w, h)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    c.restoreState()


def _draw_plan(c: Canvas, plan: dict[str, Any], x: float, y: float, max_w: float, max_h: float) -> None:
    scale = min(max_w / plan["width"], max_h / plan["depth"])
    ox = x + (max_w - plan["width"] * scale) / 2
    top = y + max_h - 12  # top-aligned under the "Floor plan" label
    for room in plan["rooms"]:
        rx = ox + room["x"] * scale
        ry = top - (room["y"] + room["h"]) * scale
        rw, rh = room["w"] * scale, room["h"] * scale
        c.setFillColor(ROOM_FILL.get(room["kind"], PAPER))
        c.setStrokeColor(INK)
        c.setLineWidth(0.6 if room["kind"] == "terrace" else 1.6)
        if room["kind"] == "terrace":
            c.setDash(3, 2)
        c.rect(rx, ry, rw, rh, stroke=1, fill=1)
        c.setDash()
        c.setFillColor(INK)
        c.setFont("Helvetica", 7 if rw < 60 else 8)
        c.drawCentredString(rx + rw / 2, ry + rh / 2 + 2, room["name"])
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(rx + rw / 2, ry + rh / 2 - 8, f"{room['w']:.1f} × {room['h']:.1f} m")
    # Scale bar: 2 m
    bar = 2 * scale
    by = top - plan["depth"] * scale - 16
    c.setStrokeColor(INK)
    c.setLineWidth(1)
    c.line(ox, by, ox + bar, by)
    c.line(ox, by - 3, ox, by + 3)
    c.line(ox + bar, by - 3, ox + bar, by + 3)
    c.setFont("Helvetica", 7)
    c.setFillColor(MUTED)
    c.drawString(ox + bar + 6, by - 2.5, "2 m")


def _qr(c: Canvas, url: str, x: float, y: float, size: float) -> None:
    widget = QrCodeWidget(url)
    bx0, by0, bx1, by1 = widget.getBounds()
    d = Drawing(size, size, transform=[size / (bx1 - bx0), 0, 0, size / (by1 - by0), 0, 0])
    d.add(widget)
    renderPDF.draw(d, c, x, y)


def render_brochure(
    *, project: dict[str, Any], building: dict[str, Any], unit: dict[str, Any], recipient: str
) -> bytes:
    settings = get_settings()
    currency = project.get("currency", "EUR")
    now = datetime.now(UTC)
    buf = io.BytesIO()
    W, H = A4
    c = Canvas(buf, pagesize=A4, pageCompression=1)
    c.setTitle(f"{project['name']} — Residence {unit['code']}")
    c.setAuthor(settings.brand_name)
    c.setSubject("Personalised residence brochure")

    # ---- Page 1: cover ----
    c.setFillColor(INK)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    _cover_image(c, _image_for(project), 0, H * 0.38, W, H * 0.62)
    shade = Color(0.055, 0.05, 0.043, alpha=0.55)
    c.setFillColor(shade)
    c.rect(0, H * 0.38, W, 70, stroke=0, fill=1)

    c.setFillColor(GOLD)
    c.setFont("Helvetica", 8.5)
    c.drawString(48, H - 48, settings.brand_name.upper())
    c.setFillColor(PAPER)
    c.setFont("Helvetica", 8.5)
    c.drawRightString(W - 48, H - 48, project.get("location", "").upper())

    c.setFillColor(GOLD)
    c.setFont("Helvetica", 9)
    c.drawString(48, H * 0.38 - 56, "PRIVATE RESIDENCE BROCHURE")
    c.setFillColor(PAPER)
    c.setFont("Times-Roman", 40)
    c.drawString(48, H * 0.38 - 104, project["name"])
    c.setFont("Times-Italic", 24)
    c.drawString(48, H * 0.38 - 138, f"Residence {unit['code']}")
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#BDB5A8"))
    tagline = project.get("tagline", "")
    if tagline:
        c.drawString(48, H * 0.38 - 166, tagline[:110])

    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.line(48, 120, W - 48, 120)
    c.setFillColor(HexColor("#BDB5A8"))
    c.setFont("Helvetica", 8)
    c.drawString(48, 100, "PREPARED FOR")
    c.drawString(W / 2, 100, "ISSUED")
    c.setFillColor(PAPER)
    c.setFont("Times-Roman", 16)
    c.drawString(48, 80, recipient or "Private client")
    c.drawString(W / 2, 80, now.strftime("%d %B %Y"))
    c.showPage()

    # ---- Page 2: details + plan ----
    plan = get_plan(unit["plan_type"])
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.setFont("Helvetica", 8.5)
    c.drawString(48, H - 48, f"{project['name'].upper()} · {building.get('name', '').upper()}")
    c.setFillColor(INK)
    c.setFont("Times-Roman", 30)
    c.drawString(48, H - 92, f"Residence {unit['code']}")
    c.setFont("Times-Italic", 14)
    c.setFillColor(MUTED)
    c.drawString(48, H - 114, plan["label"] if plan else unit["plan_type"])

    status_label = {"available": "Available", "reserved": "Reserved", "sold": "Sold"}[unit["status"]]
    rows = [
        ("Building", f"{building.get('code', '')} · {building.get('name', '')}"),
        ("Floor", "Ground" if unit["floor"] == 0 else str(unit["floor"])),
        ("Bedrooms", str(unit["beds"])),
        ("Bathrooms", str(unit["baths"])),
        ("Internal area", f"{unit['area_sqm']:.0f} m²"),
        ("Terrace", f"{unit.get('terrace_sqm', 0):.0f} m²"),
        ("Orientation", unit.get("orientation") or "—"),
        ("Status", status_label),
    ]
    ty = H - 160
    for label, value in rows:
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8.5)
        c.drawString(48, ty, label.upper())
        c.setFillColor(INK)
        c.setFont("Helvetica", 11)
        c.drawRightString(230, ty, value)
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(48, ty - 8, 230, ty - 8)
        ty -= 26

    c.setFillColor(INK)
    c.rect(48, ty - 62, 182, 62, stroke=0, fill=1)
    c.setFillColor(GOLD)
    c.setFont("Helvetica", 8)
    c.drawString(60, ty - 20, "PRICE" if unit["status"] == "available" else "LAST LISTED PRICE")
    c.setFillColor(PAPER)
    c.setFont("Times-Roman", 22)
    c.drawString(60, ty - 46, money(int(unit["price"]), currency))
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7)
    c.drawString(48, ty - 76, f"Live price as of {now.strftime('%d %b %Y, %H:%M')} UTC.")

    features = unit.get("features") or []
    fy = ty - 108
    if features:
        c.setFillColor(GOLD)
        c.setFont("Helvetica", 8.5)
        c.drawString(48, fy, "HIGHLIGHTS")
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        for feat in features[:7]:
            fy -= 16
            c.drawString(48, fy, f"—  {feat}"[:46])

    if plan:
        c.setFillColor(GOLD)
        c.setFont("Helvetica", 8.5)
        c.drawString(262, H - 160, "FLOOR PLAN")
        _draw_plan(c, plan, 262, H * 0.30, W - 262 - 48, H - 190 - H * 0.30)

    url = f"{settings.public_site_url.rstrip('/')}/explorer/{project['slug']}?unit={unit['_id']}"
    _qr(c, url, W - 48 - 72, 60, 72)
    c.setFillColor(INK)
    c.setFont("Helvetica", 8)
    c.drawRightString(W - 48 - 80, 112, "Explore this residence in 3D")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.5)
    disclaimer = (
        "Indicative information for an off-plan development. Plans, areas and specifications may change "
        "during construction. Prices and availability are subject to confirmation and do not constitute an offer."
    )
    c.drawString(48, 72, disclaimer[:118])
    c.drawString(48, 63, disclaimer[118:])
    c.drawString(48, 44, f"{settings.brand_name} · {project.get('location', '')}")
    c.showPage()
    c.save()
    return buf.getvalue()
