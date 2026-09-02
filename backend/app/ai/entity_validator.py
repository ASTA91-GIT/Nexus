import os
import re
from typing import Dict, Any, List, Tuple, Set

# Known legitimate short 2-letter locations or acronyms
VALID_SHORT_LOCATIONS = {
    "US", "UK", "NY", "LA", "EU", "IN", "UP", "MP", "AP", "KA", "TN", "DL", "GA", "MH", "RJ", "GJ", "WB", "KL", "HR", "PB"
}

# Common document header, footer, table, and status noise tokens
DOCUMENT_NOISE_TOKENS = {
    "page", "pages", "table", "tables", "section", "sections", "figure", "figures",
    "header", "footer", "confidential", "date", "dates", "status", "report", "reports",
    "document", "documents", "file", "files", "total", "subtotal", "amount", "serial",
    "serial no", "sr no", "id", "index", "column", "row", "item", "items", "null",
    "none", "undefined", "n/a", "na", "unknown", "text", "error", "version", "summary",
    "subject", "type", "description", "value", "created", "updated", "timestamp"
}

# Common English stop words that should not be standalone Person or Org entities
COMMON_STOPWORDS = {
    "the", "a", "an", "this", "that", "these", "those", "he", "she", "they", "it", "in",
    "on", "at", "to", "for", "with", "by", "from", "and", "or", "but", "if", "when", "as",
    "is", "are", "was", "were", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "shall", "should", "may", "might", "must", "can", "could", "about",
    "above", "after", "again", "against", "all", "any", "before", "below", "between",
    "both", "down", "during", "each", "few", "more", "most", "other", "some", "such",
    "than", "too", "very", "where", "which", "while", "who", "whom", "why"
}

def normalize_entity_name(name: str, entity_type: str) -> str:
    """
    Normalizes an entity name based on its type.
    Strips leading/trailing quotes, bullets, numbering artifacts, and whitespace.
    """
    if not name:
        return ""

    cleaned = name.strip()
    # Strip surrounding quotes or brackets
    cleaned = re.sub(r'^[%\'"\s\[\]\(\)\{\}\-\*\+\#\:\.\,]+|[%\'"\s\[\]\(\)\{\}\-\*\+\#\:\.\,]+$', '', cleaned)
    # Strip numbered list prefixes like "1. ", "2) "
    cleaned = re.sub(r'^\d+[\.\)]\s*', '', cleaned)

    etype = (entity_type or "").upper()

    if etype == "PHONE_NUMBER" or etype == "PHONE":
        # Keep digits and optional leading +
        digits = re.sub(r'[^\d+]', '', cleaned)
        return digits if digits else cleaned

    if etype == "EMAIL":
        return cleaned.lower()

    if etype == "PERSON":
        # Strip common salutation prefixes if attached
        cleaned = re.sub(r'^(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Officer|Inspector|Constable|Agent)\s+', '', cleaned, flags=re.IGNORECASE)

    # Collapse multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def validate_entity(entity: Dict[str, Any], text_context: str = "", current_filename: str = "") -> Tuple[bool, str]:
    """
    Context-aware, type-aware entity quality validator.
    Returns (is_valid, rejection_reason).
    """
    if not isinstance(entity, dict):
        return False, "Entity is not a dictionary"

    raw_name = entity.get("name", "")
    entity_type = str(entity.get("type", "PERSON")).upper()
    name = normalize_entity_name(str(raw_name), entity_type)

    if not name or len(name) < 2:
        return False, f"Entity name '{raw_name}' is empty or too short (< 2 chars)"

    name_lower = name.lower()

    # Reject current uploaded evidence file title if present
    if current_filename and (name_lower == current_filename.lower() or name_lower == os.path.basename(current_filename).lower()):
        return False, f"Entity '{name}' matches current uploaded evidence filename"

    # 1. Document / Header / Footer / Package Artifact Check
    if name_lower in DOCUMENT_NOISE_TOKENS or name_lower in {"pk", "content_types", "content_types].xml", "[content_types].xml"}:
        return False, f"Entity '{name}' is a generic document/table header artifact"

    if re.match(r'^(?:Page|Table|Section|Figure|Row|Column|Item|Doc|File|Record|Serial|Sr)\s*#?\s*\d+$', name, re.IGNORECASE):
        return False, f"Entity '{name}' is a document structural artifact"

    # Reject ZIP / DOCX package internal members (e.g. [Content_Types].xml, _rels/.rels, word/document.xml, PK\x03\x04)
    if re.search(r'\[?Content_Types\]?|\_rels/|word/|xl/|docProps/|ppt/|meta-inf/|^pk$', name, re.IGNORECASE):
        return False, f"Entity '{name}' is a package/container archive member"

    # Reject system/package metadata file extensions (e.g. .xml, .rels, .bin, .tmp, .manifest)
    if re.search(r'\.(?:xml|rels|bin|tmp|dat|sys|dll|exe|manifest)$', name, re.IGNORECASE):
        return False, f"Entity '{name}' is a system/package metadata extension"

    # 2. General Noise & Symbol Check
    # Reject URLs, IP paths, code snippets, or hex hashes
    if re.search(r'https?://|www\.|/[a-z0-9_/\.-]+|\\\\[a-z0-9_\\\.-]+', name_lower):
        return False, f"Entity '{name}' appears to be a URL or file path"

    if re.match(r'^[0-9a-fA-F]{24}$', name) or re.match(r'^0x[0-9a-fA-F]+$', name):
        return False, f"Entity '{name}' appears to be a database ID or hex hash"

    if re.match(r'^[^a-zA-Z0-9]+$', name):
        return False, f"Entity '{name}' contains only special characters"

    # 3. TYPE-SPECIFIC VALIDATION RULES

    if entity_type == "PERSON":
        # Person name cannot contain numeric digits (e.g. C19, F37b1z, User123)
        if re.search(r'\d', name):
            return False, f"Person name '{name}' contains invalid numeric digits"

        # Person name must be plausible alphabetic tokens
        if not re.match(r'^[A-Za-z\s\.\'\-–—]+$', name):
            return False, f"Person name '{name}' contains invalid characters"

        # Reject short 2-letter tokens that are not valid initials or names
        if len(name) <= 2 and not re.match(r'^[A-Z]\.[A-Z]\.?$', name):
            return False, f"Person name '{name}' is an ambiguous 2-letter fragment"

        # Reject standalone stopwords
        if name_lower in COMMON_STOPWORDS:
            return False, f"Person name '{name}' is a common English stop word"

    elif entity_type in ("PHONE_NUMBER", "PHONE"):
        # Validate phone structure (7 to 15 digits)
        digits_only = re.sub(r'\D', '', name)
        if len(digits_only) < 7 or len(digits_only) > 15:
            return False, f"Phone number '{name}' has invalid digit count ({len(digits_only)})"
        if re.search(r'[a-zA-Z]', name):
            return False, f"Phone number '{name}' contains alphabetic letters"

    elif entity_type == "EMAIL":
        email_pattern = r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        if not re.match(email_pattern, name):
            return False, f"Email '{name}' does not match standard email structure"

    elif entity_type == "LOCATION":
        if name_lower in COMMON_STOPWORDS:
            return False, f"Location '{name}' is a common English stop word"

        # Short 2-letter location check
        if len(name) <= 2 and name.upper() not in VALID_SHORT_LOCATIONS:
            return False, f"Location '{name}' is an unrecognized 2-letter fragment"

        # Location should not be purely digits
        if name.isdigit():
            return False, f"Location '{name}' cannot be purely numeric"

    elif entity_type == "ORGANIZATION":
        if name_lower in COMMON_STOPWORDS:
            return False, f"Organization '{name}' is a common English stop word"

        if len(name) < 2:
            return False, f"Organization '{name}' is too short"

    elif entity_type == "ACCOUNT":
        # Account should contain digits or structured pattern
        if not re.search(r'\d', name) and not re.search(r'\b(?:Account|Acc|IBAN|Bank)\b', name, re.IGNORECASE):
            if len(name) < 4:
                return False, f"Account identifier '{name}' is ambiguous"

    elif entity_type == "VEHICLE":
        if len(name) < 3:
            return False, f"Vehicle identifier '{name}' is too short"

    elif entity_type == "EVENT":
        if name_lower in COMMON_STOPWORDS or len(name) < 3:
            return False, f"Event name '{name}' is invalid or too short"

    return True, "Valid"

def validate_and_normalize_entities(
    entities: List[Dict[str, Any]], text_context: str = "", current_filename: str = ""
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Processes a list of raw entity dicts.
    Returns (valid_entities, rejected_entities).
    Each rejected entity dictionary includes a 'rejection_reason' key.
    """
    valid_list = []
    rejected_list = []
    seen_keys = set() # (normalized_name.lower(), type)

    for ent in entities:
        if not isinstance(ent, dict):
            continue

        raw_name = ent.get("name", "")
        ent_type = str(ent.get("type", "PERSON")).upper()
        norm_name = normalize_entity_name(str(raw_name), ent_type)

        # Create a copy with normalized name
        ent_copy = dict(ent)
        ent_copy["name"] = norm_name
        ent_copy["type"] = ent_type

        is_valid, reason = validate_entity(ent_copy, text_context, current_filename)

        if is_valid:
            key = (norm_name.lower(), ent_type)
            if key not in seen_keys:
                seen_keys.add(key)
                valid_list.append(ent_copy)
            else:
                # Deduplicated
                ent_copy["rejection_reason"] = "Duplicate entity in document"
                rejected_list.append(ent_copy)
        else:
            ent_copy["rejection_reason"] = reason
            rejected_list.append(ent_copy)

    return valid_list, rejected_list

def validate_relationships(
    relationships: List[Dict[str, Any]], valid_entities: List[Dict[str, Any]], text_context: str = ""
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Validates relationships against valid entities.
    Returns (valid_relationships, rejected_relationships).
    """
    valid_entity_names = {ent["name"].lower() for ent in valid_entities if "name" in ent}
    valid_rels = []
    rejected_rels = []
    seen_rel_keys = set()

    for rel in relationships:
        if not isinstance(rel, dict):
            continue

        source_raw = str(rel.get("source", "")).strip()
        target_raw = str(rel.get("target", "")).strip()
        rel_type = str(rel.get("type", "ASSOCIATED_WITH")).upper()

        source_norm = normalize_entity_name(source_raw, "UNKNOWN")
        target_norm = normalize_entity_name(target_raw, "UNKNOWN")

        rel_copy = dict(rel)
        rel_copy["source"] = source_norm
        rel_copy["target"] = target_norm
        rel_copy["type"] = rel_type

        if not source_norm or not target_norm:
            rel_copy["rejection_reason"] = "Missing source or target entity name"
            rejected_rels.append(rel_copy)
            continue

        if source_norm.lower() == target_norm.lower():
            rel_copy["rejection_reason"] = "Self-referential relationship (source == target)"
            rejected_rels.append(rel_copy)
            continue

        # Both endpoints MUST exist in valid_entity_names
        if source_norm.lower() not in valid_entity_names:
            rel_copy["rejection_reason"] = f"Source entity '{source_norm}' was rejected or not found in valid entities"
            rejected_rels.append(rel_copy)
            continue

        if target_norm.lower() not in valid_entity_names:
            rel_copy["rejection_reason"] = f"Target entity '{target_norm}' was rejected or not found in valid entities"
            rejected_rels.append(rel_copy)
            continue

        rel_key = (source_norm.lower(), target_norm.lower(), rel_type)
        if rel_key not in seen_rel_keys:
            seen_rel_keys.add(rel_key)
            valid_rels.append(rel_copy)
        else:
            rel_copy["rejection_reason"] = "Duplicate relationship"
            rejected_rels.append(rel_copy)

    return valid_rels, rejected_rels
