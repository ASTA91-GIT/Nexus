import re
import dateutil.parser

def normalize_name(name: str) -> str:
    """
    Normalizes a name using Title Case (except for certain acronyms).
    Will ignore ALL CAPS words that look like acronyms (e.g. FBI, CIA).
    """
    if not name:
        return name
    words = name.split()
    normalized_words = []
    for word in words:
        if word.isupper() and len(word) > 1:
            # Preserve acronyms
            normalized_words.append(word)
        else:
            normalized_words.append(word.capitalize())
    return " ".join(normalized_words)

def normalize_email(email: str) -> str:
    """
    Normalizes an email address.
    """
    if not email:
        return email
    return email.strip().lower()

def normalize_phone(phone: str) -> str:
    """
    Normalizes a phone number to standard international format (if possible)
    or just strips unnecessary characters.
    """
    if not phone:
        return phone
    # Strip everything except digits and plus sign
    cleaned = re.sub(r'[^\d+]', '', phone)
    return cleaned

def normalize_date(date_str: str) -> tuple[str, bool]:
    """
    Attempts to parse a date into ISO 8601 format.
    Returns (normalized_date_str, is_ambiguous).
    """
    if not date_str:
        return date_str, False
    try:
        # Check if the date string is already in ISO 8601 format (YYYY-MM-DD)
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str.strip()):
            return date_str.strip(), False
        
        parsed = dateutil.parser.parse(date_str, dayfirst=False) # We will warn on potential ambiguity if dayfirst is possible
        # Check ambiguity: if it contains slashes, it could be ambiguous
        is_ambiguous = '/' in date_str or '-' in date_str and not re.match(r'^\d{4}-', date_str)
        return parsed.strftime("%Y-%m-%d"), is_ambiguous
    except Exception:
        return date_str, False

def check_location(lat: float, lon: float) -> str:
    """
    Returns location status.
    """
    if lat is None or lon is None:
        return "MISSING_COORDINATES"
    
    try:
        lat = float(lat)
        lon = float(lon)
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return "VALID"
        return "INVALID_COORDINATES"
    except (ValueError, TypeError):
        return "INVALID_COORDINATES"
