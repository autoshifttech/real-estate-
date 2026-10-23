"""Pydantic request models. Every free-text field is sanitised on the way in."""

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, field_validator

from .sanitize import clean_html, clean_text


class UnitStatus(StrEnum):
    available = "available"
    reserved = "reserved"
    sold = "sold"


class LeadStage(StrEnum):
    new = "new"
    contacted = "contacted"
    viewing = "viewing"
    reserved = "reserved"
    won = "won"
    lost = "lost"


class LeadSource(StrEnum):
    website = "website"
    explorer = "explorer"
    brochure = "brochure"
    contact = "contact"
    referral = "referral"
    portal = "portal"
    walk_in = "walk_in"


PUBLIC_SOURCES = {LeadSource.website, LeadSource.explorer, LeadSource.brochure, LeadSource.contact}


def _text(v: str) -> str:
    cleaned = clean_text(v)
    if v and not cleaned:
        raise ValueError("must contain plain text")
    return cleaned


def _multiline(v: str) -> str:
    cleaned = clean_text(v, multiline=True)
    if v and not cleaned:
        raise ValueError("must contain plain text")
    return cleaned


Text = Annotated[str, AfterValidator(_text)]
LongText = Annotated[str, AfterValidator(_multiline)]
Html = Annotated[str, AfterValidator(clean_html)]
Slug = Annotated[str, Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", min_length=2, max_length=80)]
ObjectIdStr = Annotated[str, Field(pattern=r"^[0-9a-f]{24}$")]
VisitorId = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{8,64}$")]
Phone = Annotated[str, Field(max_length=32, pattern=r"^[0-9+()\-. ]{0,32}$")]
MediaPath = Annotated[str, Field(max_length=300, pattern=r"^(https?://|/)[^\s<>\"']*$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# ---------- Auth ----------


class LoginIn(Strict):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserCreate(Strict):
    email: EmailStr
    name: Text = Field(min_length=1, max_length=80)
    password: str = Field(min_length=10, max_length=72)
    role: str = Field(default="agent", pattern="^(admin|agent)$")


# ---------- Leads ----------


class EnquiryIn(Strict):
    name: Text = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: Phone = ""
    message: LongText = Field(default="", max_length=2000)
    unit_ids: list[ObjectIdStr] = Field(default_factory=list, max_length=3)
    source: LeadSource = LeadSource.website
    visitor_id: VisitorId | None = None
    consent: bool
    # Honeypot: real users never see or fill this field.
    website: str = Field(default="", max_length=200)

    @field_validator("source")
    @classmethod
    def _public_source(cls, v: LeadSource) -> LeadSource:
        if v not in PUBLIC_SOURCES:
            raise ValueError("invalid source")
        return v

    @field_validator("consent")
    @classmethod
    def _must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("consent is required")
        return v


class LeadCreate(Strict):
    name: Text = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: Phone = ""
    message: LongText = Field(default="", max_length=2000)
    source: LeadSource = LeadSource.walk_in
    stage: LeadStage = LeadStage.new
    unit_ids: list[ObjectIdStr] = Field(default_factory=list, max_length=10)
    assignee: Text = Field(default="", max_length=80)


class LeadUpdate(Strict):
    name: Text | None = Field(default=None, min_length=2, max_length=80)
    email: EmailStr | None = None
    phone: Phone | None = None
    source: LeadSource | None = None
    stage: LeadStage | None = None
    unit_ids: list[ObjectIdStr] | None = Field(default=None, max_length=10)
    assignee: Text | None = Field(default=None, max_length=80)


class NoteIn(Strict):
    body: LongText = Field(min_length=1, max_length=4000)


class TrackViewIn(Strict):
    visitor_id: VisitorId
    unit_id: ObjectIdStr


# ---------- CMS ----------


class ProjectIn(Strict):
    slug: Slug
    name: Text = Field(min_length=2, max_length=120)
    tagline: Text = Field(default="", max_length=200)
    location: Text = Field(default="", max_length=120)
    summary: LongText = Field(default="", max_length=600)
    description: LongText = Field(default="", max_length=8000)
    hero_image: MediaPath | None = None
    gallery: list[MediaPath] = Field(default_factory=list, max_length=40)
    amenities: list[Text] = Field(default_factory=list, max_length=40)
    completion: Text = Field(default="", max_length=40)
    status: str = Field(default="selling", pattern="^(launching|selling|sold_out)$")
    currency: str = Field(default="EUR", pattern="^[A-Z]{3}$")
    published: bool = True


class ProjectUpdate(Strict):
    slug: Slug | None = None
    name: Text | None = Field(default=None, min_length=2, max_length=120)
    tagline: Text | None = Field(default=None, max_length=200)
    location: Text | None = Field(default=None, max_length=120)
    summary: LongText | None = Field(default=None, max_length=600)
    description: LongText | None = Field(default=None, max_length=8000)
    hero_image: MediaPath | None = None
    gallery: list[MediaPath] | None = Field(default=None, max_length=40)
    amenities: list[Text] | None = Field(default=None, max_length=40)
    completion: Text | None = Field(default=None, max_length=40)
    status: str | None = Field(default=None, pattern="^(launching|selling|sold_out)$")
    currency: str | None = Field(default=None, pattern="^[A-Z]{3}$")
    published: bool | None = None


class Position(Strict):
    x: float = Field(ge=-100, le=100)
    z: float = Field(ge=-100, le=100)


class BuildingIn(Strict):
    project_id: ObjectIdStr
    code: str = Field(pattern=r"^[A-Z0-9]{1,4}$")
    name: Text = Field(min_length=2, max_length=80)
    floors: int = Field(ge=1, le=80)
    units_per_floor: int = Field(ge=1, le=20)
    description: LongText = Field(default="", max_length=2000)
    position: Position = Position(x=0, z=0)


class BuildingUpdate(Strict):
    code: str | None = Field(default=None, pattern=r"^[A-Z0-9]{1,4}$")
    name: Text | None = Field(default=None, min_length=2, max_length=80)
    floors: int | None = Field(default=None, ge=1, le=80)
    units_per_floor: int | None = Field(default=None, ge=1, le=20)
    description: LongText | None = Field(default=None, max_length=2000)
    position: Position | None = None


class UnitIn(Strict):
    building_id: ObjectIdStr
    code: str = Field(pattern=r"^[A-Z0-9-]{1,12}$")
    floor: int = Field(ge=0, le=80)
    position: int = Field(ge=1, le=20)
    beds: int = Field(ge=0, le=10)
    baths: int = Field(ge=1, le=10)
    area_sqm: float = Field(gt=10, le=2000)
    terrace_sqm: float = Field(default=0, ge=0, le=2000)
    price: int = Field(gt=0, le=1_000_000_000)
    status: UnitStatus = UnitStatus.available
    orientation: Text = Field(default="", max_length=40)
    plan_type: str = Field(pattern=r"^[A-Z0-9]{1,6}$")
    features: list[Text] = Field(default_factory=list, max_length=20)


class UnitUpdate(Strict):
    code: str | None = Field(default=None, pattern=r"^[A-Z0-9-]{1,12}$")
    floor: int | None = Field(default=None, ge=0, le=80)
    position: int | None = Field(default=None, ge=1, le=20)
    beds: int | None = Field(default=None, ge=0, le=10)
    baths: int | None = Field(default=None, ge=1, le=10)
    area_sqm: float | None = Field(default=None, gt=10, le=2000)
    terrace_sqm: float | None = Field(default=None, ge=0, le=2000)
    price: int | None = Field(default=None, gt=0, le=1_000_000_000)
    status: UnitStatus | None = None
    orientation: Text | None = Field(default=None, max_length=40)
    plan_type: str | None = Field(default=None, pattern=r"^[A-Z0-9]{1,6}$")
    features: list[Text] | None = Field(default=None, max_length=20)


class BulkPriceIn(Strict):
    project_id: ObjectIdStr
    building_id: ObjectIdStr | None = None
    only_status: UnitStatus | None = UnitStatus.available
    percent: float | None = Field(default=None, ge=-50, le=100)
    amount: int | None = Field(default=None, ge=-10_000_000, le=10_000_000)
    round_to: int = Field(default=1000, ge=1, le=100_000)


class PostIn(Strict):
    slug: Slug
    title: Text = Field(min_length=2, max_length=160)
    excerpt: Text = Field(default="", max_length=400)
    body: Html = Field(default="", max_length=50_000)
    cover: MediaPath | None = None
    author: Text = Field(default="", max_length=80)
    published: bool = False
    published_at: datetime | None = None


class PostUpdate(Strict):
    slug: Slug | None = None
    title: Text | None = Field(default=None, min_length=2, max_length=160)
    excerpt: Text | None = Field(default=None, max_length=400)
    body: Html | None = Field(default=None, max_length=50_000)
    cover: MediaPath | None = None
    author: Text | None = Field(default=None, max_length=80)
    published: bool | None = None
    published_at: datetime | None = None


def dump_update(model: BaseModel) -> dict[str, Any]:
    """Only fields the client actually sent."""
    return model.model_dump(exclude_unset=True, mode="python")
