"""Single source of truth for the marketplace category vocabulary (mirrors backend/src/models/constants.js)."""

CATEGORIES = ["Books", "Electronics", "Furniture", "Cycles", "Stationery", "Accessories", "Appliances", "Other"]
_LOOKUP = {c.casefold(): c for c in CATEGORIES}
_ALIASES = {
    "cycle": "Cycles", "bicycle": "Cycles", "bikes": "Cycles", "book": "Books", "appliance": "Appliances",
    "accessory": "Accessories", "electronic": "Electronics", "stationary": "Stationery",
    # Labels from the previous model's catalog, so a backend translation layer written for it keeps working.
    "daily essentials": "Furniture", "lab & safety": "Accessories", "lab and safety": "Accessories",
    "cycles & transport": "Cycles", "cycles & transportation": "Cycles", "cycles and transport": "Cycles",
    "personal care": "Other", "snacks & food": "Other",
}


def normalize_category(value: str | None) -> str:
    """Map any incoming label onto the marketplace vocabulary; unknown labels become 'Other'."""
    key = str(value or "").strip().casefold()
    return _LOOKUP.get(key) or _ALIASES.get(key) or "Other"
