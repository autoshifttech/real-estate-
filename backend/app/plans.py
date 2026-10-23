"""Floor-plan layouts, in metres. Shared by the API (web SVG) and the PDF renderer.

A plan is a terrace band on top, then rows of rooms filling the plan width.
Swap these for real architect plans later by adding `image` URLs to a plan.
"""

from typing import Any, TypedDict


class Room(TypedDict):
    name: str
    kind: str  # living | bed | bath | kitchen | hall | study | terrace
    x: float
    y: float
    w: float
    h: float


class Plan(TypedDict):
    type: str
    label: str
    beds: int
    baths: int
    width: float
    depth: float
    internal_sqm: float
    terrace_sqm: float
    rooms: list[Room]


# (label, beds, baths, width, terrace depth, rows of (row height, [(name, kind, width)]))
_SPECS: dict[str, tuple[str, int, int, float, float, list[tuple[float, list[tuple[str, str, float]]]]]] = {
    "A1": (
        "One-bedroom residence",
        1,
        1,
        9.0,
        2.0,
        [
            (4.5, [("Living", "living", 5.5), ("Bedroom", "bed", 3.5)]),
            (2.5, [("Entry", "hall", 2.5), ("Kitchen", "kitchen", 3.0), ("Bath", "bath", 3.5)]),
        ],
    ),
    "B2": (
        "Two-bedroom residence",
        2,
        2,
        12.0,
        2.5,
        [
            (5.0, [("Living & dining", "living", 7.0), ("Primary suite", "bed", 5.0)]),
            (
                3.0,
                [
                    ("Bedroom 2", "bed", 3.5),
                    ("Bath", "bath", 2.5),
                    ("Kitchen", "kitchen", 3.0),
                    ("Ensuite", "bath", 3.0),
                ],
            ),
        ],
    ),
    "C3": (
        "Three-bedroom residence",
        3,
        2,
        14.0,
        3.0,
        [
            (5.5, [("Living & dining", "living", 8.0), ("Primary suite", "bed", 4.0), ("Ensuite", "bath", 2.0)]),
            (
                4.5,
                [
                    ("Bedroom 2", "bed", 3.5),
                    ("Bath", "bath", 2.5),
                    ("Bedroom 3", "bed", 3.5),
                    ("Kitchen", "kitchen", 4.5),
                ],
            ),
        ],
    ),
    "P4": (
        "Four-bedroom penthouse",
        4,
        3,
        18.0,
        4.5,
        [
            (
                6.0,
                [
                    ("Grand living", "living", 8.0),
                    ("Kitchen", "kitchen", 4.0),
                    ("Primary suite", "bed", 4.0),
                    ("Ensuite", "bath", 2.0),
                ],
            ),
            (
                6.0,
                [
                    ("Bedroom 2", "bed", 4.0),
                    ("Bath", "bath", 2.5),
                    ("Bedroom 3", "bed", 4.0),
                    ("Bedroom 4", "bed", 4.0),
                    ("Study", "study", 3.5),
                ],
            ),
        ],
    ),
}


def _build(plan_type: str) -> Plan:
    label, beds, baths, width, terrace, rows = _SPECS[plan_type]
    rooms: list[Room] = [{"name": "Terrace", "kind": "terrace", "x": 0, "y": 0, "w": width, "h": terrace}]
    y = terrace
    for height, cells in rows:
        x = 0.0
        for name, kind, w in cells:
            rooms.append({"name": name, "kind": kind, "x": x, "y": y, "w": w, "h": height})
            x += w
        if abs(x - width) > 1e-6:
            raise ValueError(f"plan {plan_type}: row width {x} != {width}")
        y += height
    internal = round(sum(r["w"] * r["h"] for r in rooms if r["kind"] != "terrace"), 1)
    return {
        "type": plan_type,
        "label": label,
        "beds": beds,
        "baths": baths,
        "width": width,
        "depth": y,
        "internal_sqm": internal,
        "terrace_sqm": round(width * terrace, 1),
        "rooms": rooms,
    }


PLANS: dict[str, Plan] = {key: _build(key) for key in _SPECS}


def get_plan(plan_type: str) -> dict[str, Any] | None:
    plan = PLANS.get(plan_type)
    return dict(plan) if plan else None
