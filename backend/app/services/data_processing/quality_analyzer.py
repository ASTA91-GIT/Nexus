from typing import Dict, Any

def calculate_entity_quality(entity: Dict[str, Any], validation_status: str, has_duplicates: bool) -> Dict[str, Any]:
    """
    Calculates the data quality score for an entity deterministically.
    """
    completeness = 0
    validity = 0
    consistency = 0
    uniqueness = 0
    relationship_integrity = 100 # Default to 100 if no relationship info is available here
    
    # Completeness (30 points max)
    # Check if important fields are present
    important_fields = ["name", "type"]
    optional_fields = ["description", "source", "notes"]
    
    comp_score = 0
    if entity.get("name"): comp_score += 15
    if entity.get("type"): comp_score += 5
    
    # Optional fields (don't penalize heavily)
    if entity.get("description"): comp_score += 3
    if entity.get("properties", {}).get("email") or entity.get("properties", {}).get("phone"): comp_score += 7
    
    completeness = min(100, int((comp_score / 30) * 100))
    
    # Validity (25 points max -> 100% scale)
    if validation_status == "VALID":
        validity = 100
    elif validation_status == "WARNING":
        validity = 75
    else:
        validity = 25
        
    # Consistency (20 points max -> 100% scale)
    # Check if normalized values exist
    consistency = 100
    if entity.get("original_values"):
        consistency = 90 # Modified but traceable
        
    # Uniqueness (15 points max -> 100% scale)
    if not has_duplicates:
        uniqueness = 100
    else:
        uniqueness = 50
        
    # Calculate weighted overall score
    overall_score = (
        (completeness * 0.30) +
        (validity * 0.25) +
        (consistency * 0.20) +
        (uniqueness * 0.15) +
        (relationship_integrity * 0.10)
    )
    
    return {
        "overall_score": int(overall_score),
        "breakdown": {
            "completeness": completeness,
            "validity": validity,
            "consistency": consistency,
            "uniqueness": uniqueness,
            "relationship_integrity": relationship_integrity
        }
    }
