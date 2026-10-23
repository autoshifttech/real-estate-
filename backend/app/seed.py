"""Demo data: 1 project, 2 buildings, 40 units, 25 leads, 3 blog posts, 1 admin.

    python -m app.seed            # insert if empty
    python -m app.seed --reset    # wipe demo collections first

The admin password comes from SEED_ADMIN_PASSWORD. If that isn't set, a random
password is generated and printed once.
"""

import argparse
import asyncio
import random
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from .config import get_settings
from .db import ensure_indexes, get_db
from .plans import PLANS
from .security import hash_password

PROJECT_SLUG = "calanthe-bay"

# Plan type by (floor, position). Top floor holds the penthouses.
LAYOUT = {
    "A": {"typical": ["A1", "B2", "B2", "C3"], "top": ["C3", "P4", "P4", "C3"]},
    "B": {"typical": ["B2", "C3", "A1", "B2"], "top": ["C3", "P4", "P4", "B2"]},
}
ORIENTATION = {1: "South-west · sea", 2: "South · sea", 3: "South-east · sea", 4: "East · garden"}
BASE_SQM = {"A": 9_200, "B": 10_400}
FEATURES = {
    "A1": ["Floor-to-ceiling glazing", "Oak floors", "Smart-home ready"],
    "B2": ["Dual-aspect living", "Walk-in wardrobe", "Ensuite with rain shower", "Oak floors"],
    "C3": ["Wrap-around terrace", "Chef's kitchen", "Primary suite with dressing room", "Two parking spaces"],
    "P4": [
        "Private rooftop plunge pool",
        "Panoramic sea views",
        "Private lift lobby",
        "Outdoor kitchen",
        "Three parking spaces",
    ],
}

FIRST = [
    "Amara",
    "Lukas",
    "Sofia",
    "Kenji",
    "Isabel",
    "Omar",
    "Freya",
    "Mateo",
    "Priya",
    "Jonas",
    "Leila",
    "Henrik",
    "Chloé",
    "Rafael",
    "Ingrid",
    "Yusuf",
    "Elena",
    "Tomás",
    "Mei",
    "Noah",
    "Aisha",
    "Pieter",
    "Camille",
    "Dimitri",
    "Zara",
]
LAST = [
    "Okafor",
    "Brandt",
    "Rossi",
    "Tanaka",
    "Ferreira",
    "Haddad",
    "Lindqvist",
    "Alvarez",
    "Raman",
    "Weber",
    "Nasser",
    "Strand",
    "Moreau",
    "Duarte",
    "Berg",
    "Demir",
    "Petrova",
    "Navarro",
    "Chen",
    "Fischer",
    "Bello",
    "de Vries",
    "Laurent",
    "Papadakis",
    "Khan",
]
STAGES = ["new"] * 7 + ["contacted"] * 6 + ["viewing"] * 5 + ["reserved"] * 3 + ["won"] * 2 + ["lost"] * 2
SOURCES = ["website", "explorer", "explorer", "brochure", "contact", "referral", "portal", "walk_in"]
NOTE_SNIPPETS = [
    "Called, interested in sea-facing units on upper floors.",
    "Sent brochure and payment plan by email.",
    "Prefers a viewing at the sales suite on a weekend.",
    "Asked about rental yield and management options.",
    "Relocating with family next year; needs 3 bedrooms.",
    "Comparing with another development; price-sensitive.",
]


def _price(code: str, plan: str, floor: int, position: int) -> int:
    p = PLANS[plan]
    weighted = p["internal_sqm"] + 0.4 * p["terrace_sqm"]
    premium = 1 + 0.035 * (floor - 1) + (0.08 if position in (1, 2) else 0)
    return int(round(weighted * BASE_SQM[code] * premium / 5000) * 5000)


async def seed(reset: bool = False) -> dict[str, Any]:
    db = get_db()
    settings = get_settings()
    await ensure_indexes()
    if reset:
        for name in ("projects", "buildings", "units", "leads", "unit_views", "posts"):
            await db[name].delete_many({})
    elif await db.projects.find_one({"slug": PROJECT_SLUG}):
        return {"skipped": True}

    rng = random.Random(7)
    now = datetime.now(UTC)
    project = {
        "slug": PROJECT_SLUG,
        "name": "Calanthe Bay",
        "tagline": "Terraced residences carved into a sunlit Aegean hillside.",
        "location": "Calanthe Bay · Aegean Coast",
        "summary": "Forty residences across two buildings, in olive terraces above a private cove. Completion 2028.",
        "description": (
            "Calanthe Bay steps down the hillside in rammed-earth terraces and timber-clad volumes, each residence "
            "opening to a deep terrace and an uninterrupted view of the bay.\n"
            "Terrace House holds the one- to three-bedroom residences around a planted courtyard. Cliff House sits "
            "closer to the water and crowns its top floor with two penthouses, each with a private rooftop pool.\n"
            "Residents share an infinity pool, spa, wine room, concierge and a path down to the cove."
        ),
        "hero_image": "/media/scenes/aerial-1600.webp",
        "gallery": [
            f"/media/scenes/{n}-1600.webp"
            for n in ("aerial", "entrance", "living", "glass-wall", "terrace", "pool-sunset", "pool-night", "drone")
        ],
        "amenities": [
            "Infinity pool",
            "Spa & hammam",
            "Wine room",
            "24/7 concierge",
            "Private cove access",
            "Olive grove gardens",
            "EV charging",
            "Residents' lounge",
        ],
        "completion": "Q3 2028",
        "status": "selling",
        "currency": "EUR",
        "published": True,
        "created_at": now,
        "updated_at": now,
    }
    project_id = (await db.projects.insert_one(project)).inserted_id

    buildings = [
        {
            "code": "A",
            "name": "Terrace House",
            "floors": 5,
            "units_per_floor": 4,
            "position": {"x": -7.5, "z": 0},
            "description": "Five storeys around a planted courtyard, stepping back to form deep terraces.",
        },
        {
            "code": "B",
            "name": "Cliff House",
            "floors": 5,
            "units_per_floor": 4,
            "position": {"x": 7.5, "z": -2},
            "description": "Closest to the water, crowned by two penthouses with rooftop pools.",
        },
    ]
    unit_ids: list[tuple[Any, str]] = []
    statuses = ["available"] * 24 + ["reserved"] * 8 + ["sold"] * 8
    rng.shuffle(statuses)
    for b in buildings:
        b.update({"project_id": project_id, "created_at": now, "updated_at": now})
        b_id = (await db.buildings.insert_one(b)).inserted_id
        code = str(b["code"])
        for floor in range(1, int(b["floors"]) + 1):  # type: ignore[call-overload]
            row = LAYOUT[code]["top" if floor == b["floors"] else "typical"]
            for position, plan_type in enumerate(row, start=1):
                plan = PLANS[plan_type]
                status = statuses[len(unit_ids)]
                unit_code = f"{code}-{floor}{position:02d}"
                unit = {
                    "project_id": project_id,
                    "building_id": b_id,
                    "code": unit_code,
                    "floor": floor,
                    "position": position,
                    "beds": plan["beds"],
                    "baths": plan["baths"],
                    "area_sqm": plan["internal_sqm"],
                    "terrace_sqm": plan["terrace_sqm"],
                    "price": _price(code, plan_type, floor, position),
                    "status": status,
                    "orientation": ORIENTATION[position],
                    "plan_type": plan_type,
                    "features": FEATURES[plan_type],
                    "created_at": now,
                    "updated_at": now,
                }
                unit_ids.append(((await db.units.insert_one(unit)).inserted_id, unit_code))

    leads = []
    for i in range(25):
        first, last = FIRST[i], LAST[i]
        created = now - timedelta(days=rng.randint(0, 44), hours=rng.randint(0, 23), minutes=rng.randint(0, 59))
        interest = rng.sample(unit_ids, k=rng.randint(1, 3))
        viewed = rng.sample(unit_ids, k=rng.randint(0, 6))
        stage = STAGES[i]
        notes = []
        if stage != "new":
            for n in range(rng.randint(1, 3)):
                notes.append(
                    {
                        "id": f"seed{i}{n}",
                        "body": rng.choice(NOTE_SNIPPETS),
                        "author": "Demo Admin",
                        "at": created + timedelta(days=n + 1),
                    }
                )
        leads.append(
            {
                "name": f"{first} {last}",
                "email": f"{first.lower().replace('é', 'e')}.{last.lower().replace(' ', '')}@example.com",
                "phone": f"+30 69{rng.randint(10_000_000, 99_999_999)}",
                "message": "I'd like to know more about availability and the payment plan.",
                "source": rng.choice(SOURCES),
                "stage": stage,
                "unit_interest": [{"unit_id": u, "code": c} for u, c in interest],
                "units_viewed": [
                    {"unit_id": u, "code": c, "at": created - timedelta(minutes=5 * k)}
                    for k, (u, c) in enumerate(viewed)
                ],
                "notes": notes,
                "visitor_id": None,
                "consent": True,
                "assignee": rng.choice(["Demo Admin", "Elena M.", "Marcus L."]),
                "created_at": created,
                "updated_at": created + timedelta(days=len(notes)),
            }
        )
    await db.leads.insert_many(leads)

    posts = [
        (
            "why-off-plan-buyers-want-to-explore-before-they-visit",
            "Why off-plan buyers want to explore before they visit",
            "Interactive tools shorten the path from first look to reservation.",
            "<p>Buyers now shortlist residences from their phone long before they book a viewing. A model they can "
            "orbit, filter and compare does the work a sales suite used to do alone.</p><h2>What changes</h2><ul>"
            "<li>Fewer, better-qualified viewings</li><li>Live availability, so nobody falls for a sold unit</li>"
            "<li>Every unit a lead looked at, already in the CRM</li></ul>",
            6,
            "living",
        ),
        (
            "designing-for-the-sales-suite-kiosk",
            "Designing for the sales-suite kiosk",
            "Offline-first, touch-first and built for a 65-inch screen.",
            "<p>A kiosk has to keep working when the Wi-Fi drops. We cache the explorer, unit data and media on the "
            "device, so the experience is identical online and off.</p><blockquote>Rule one: the screen must never go "
            "blank.</blockquote>",
            15,
            "glass-wall",
        ),
        (
            "pricing-live-inventory",
            "Live pricing without the spreadsheet chaos",
            "One source of truth for price and status across the site, PDFs and the CRM.",
            "<p>When a residence is reserved, the explorer, the brochure generator and the pipeline update together. "
            "Bulk price changes are logged per unit, so finance can see every adjustment.</p>",
            28,
            "drone",
        ),
    ]
    for slug, title, excerpt, body, age, cover in posts:
        published = now - timedelta(days=age)
        await db.posts.insert_one(
            {
                "slug": slug,
                "title": title,
                "excerpt": excerpt,
                "body": body,
                "cover": f"/media/scenes/{cover}-1600.webp",
                "author": f"{settings.brand_name} Studio",
                "published": True,
                "published_at": published,
                "created_at": published,
                "updated_at": published,
            }
        )

    generated_password = None
    email = settings.seed_admin_email.lower()
    if not await db.users.find_one({"email": email}):
        password = settings.seed_admin_password
        if not password:
            password = generated_password = secrets.token_urlsafe(14)
        await db.users.insert_one(
            {
                "email": email,
                "name": "Demo Admin",
                "role": "admin",
                "password_hash": hash_password(password),
                "created_at": now,
            }
        )
        if generated_password:
            print(f"[seed] Admin created: {email} / {generated_password}  (set SEED_ADMIN_PASSWORD to choose one)")

    return {"project_id": str(project_id), "units": len(unit_ids), "leads": len(leads), "posts": len(posts)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo data")
    parser.add_argument("--reset", action="store_true", help="wipe demo collections first")
    args = parser.parse_args()
    print(asyncio.run(seed(reset=args.reset)))


if __name__ == "__main__":
    main()
