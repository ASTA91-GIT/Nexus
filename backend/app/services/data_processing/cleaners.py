import re

def clean_whitespace(text: str) -> str:
    """
    Safely trims leading and trailing whitespace and collapses multiple spaces.
    Example: "   Rohan    Mehta   " -> "Rohan Mehta"
    """
    if not isinstance(text, str):
        return text
    # Replace multiple spaces/newlines/tabs with a single space
    cleaned = re.sub(r'\s+', ' ', text)
    return cleaned.strip()

def clean_structured_field(text: str) -> str:
    """
    Cleans a structured field (like a name or organization) safely.
    """
    if not text:
        return text
    return clean_whitespace(text)
