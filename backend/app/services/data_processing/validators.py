import re
from typing import Dict, Any, List, Tuple
from app.services.data_processing.normalizers import normalize_date

def validate_entity(entity: Dict[str, Any]) -> Tuple[str, List[str], List[str]]:
    """
    Validates an entity.
    Returns (status, warnings, errors)
    Status can be VALID, WARNING, INVALID
    """
    warnings = []
    errors = []

    # Required field: name
    if not entity.get("name") or str(entity.get("name")).strip() == "":
        errors.append("Entity name is missing or empty.")

    # Required field: type
    if not entity.get("type"):
        errors.append("Entity type is missing.")

    # Phone validation warning
    phone = entity.get("properties", {}).get("phone")
    if phone:
        # A phone should ideally have digits
        if not re.search(r'\d', str(phone)):
            warnings.append("Phone number does not contain digits.")

    # Email validation error/warning
    email = entity.get("properties", {}).get("email")
    if email:
        if "@" not in str(email) or "." not in str(email):
            errors.append("Completely malformed email.")

    # Date validation
    date = entity.get("properties", {}).get("date")
    if date:
        _, is_ambiguous = normalize_date(str(date))
        if is_ambiguous:
            warnings.append(f"Ambiguous date format: {date}")

    # Location coordinates
    pos = entity.get("position")
    if pos is not None:
        lat = pos.get("lat") if isinstance(pos, dict) else None
        lon = pos.get("lng") if isinstance(pos, dict) else None
        if lat is None or lon is None:
            warnings.append("Location coordinates missing.")

    if errors:
        return "INVALID", warnings, errors
    if warnings:
        return "WARNING", warnings, errors

    return "VALID", warnings, errors
