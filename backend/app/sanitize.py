"""Input sanitising helpers built on nh3 (Rust ammonia bindings)."""

import re

import nh3

_WS = re.compile(r"[ \t\r\f\v]+")
_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

BLOG_TAGS = {
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "h2",
    "h3",
    "h4",
    "code",
    "pre",
    "hr",
    "img",
    "figure",
    "figcaption",
}
BLOG_ATTRS = {"a": {"href", "title"}, "img": {"src", "alt", "width", "height", "loading"}}


def clean_text(value: str, *, multiline: bool = False) -> str:
    """Strip all HTML and control characters; collapse whitespace."""
    text = nh3.clean(value, tags=set())
    # nh3 escapes entities; plain text fields should store the literal characters.
    text = (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    text = _CTRL.sub("", text)
    if multiline:
        lines = [_WS.sub(" ", line).strip() for line in text.splitlines()]
        return "\n".join(lines).strip()
    return _WS.sub(" ", text.replace("\n", " ")).strip()


def clean_html(value: str) -> str:
    """Allow-list HTML for CMS rich text (blog bodies)."""
    return nh3.clean(
        value,
        tags=BLOG_TAGS,
        attributes=BLOG_ATTRS,
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer",
    )
