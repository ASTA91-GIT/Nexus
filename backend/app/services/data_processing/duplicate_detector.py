from typing import List, Dict, Any
import difflib
from app.services.data_processing.cleaners import clean_whitespace
from app.services.data_processing.normalizers import normalize_name, normalize_email, normalize_phone

async def detect_duplicates(db, case_id: str, entity_data: Dict[str, Any], exclude_id: str = None) -> List[Dict[str, Any]]:
    """
    Detects duplicate candidates for a given entity within the same case.
    Returns a list of candidates with confidence scores and reasons.
    """
    candidates = []
    
    # Query all entities in the same case
    query = {"case_id": case_id}
    if exclude_id:
        from bson import ObjectId
        query["_id"] = {"$ne": ObjectId(exclude_id)}
        
    cursor = db["entities"].find(query)
    existing_entities = await cursor.to_list(length=10000) # Scoped strictly to case
    
    # Prepare comparison fields
    name = str(entity_data.get("name", ""))
    norm_name = normalize_name(clean_whitespace(name)).lower()
    
    props = entity_data.get("properties", {})
    email = normalize_email(str(props.get("email", "")))
    phone = normalize_phone(str(props.get("phone", "")))
    
    for ex in existing_entities:
        ex_name = str(ex.get("name", ""))
        ex_norm_name = normalize_name(clean_whitespace(ex_name)).lower()
        
        ex_props = ex.get("properties", {})
        ex_email = normalize_email(str(ex_props.get("email", "")))
        ex_phone = normalize_phone(str(ex_props.get("phone", "")))
        
        confidence = 0
        reasons = []
        
        # 1. Exact email match (High confidence identifier)
        if email and email == ex_email:
            confidence = max(confidence, 100)
            reasons.append("Exact email match.")
            
        # 2. Exact phone match (High confidence identifier)
        if phone and phone == ex_phone:
            confidence = max(confidence, 100)
            reasons.append("Exact phone match.")
            
        # 3. Exact normalized name match
        if norm_name and norm_name == ex_norm_name:
            confidence = max(confidence, 95)
            reasons.append("Exact normalized name match.")
            
        # 4. Sequence similarity (if no exact matches yet)
        if confidence == 0 and norm_name and ex_norm_name:
            seq_ratio = difflib.SequenceMatcher(None, norm_name, ex_norm_name).ratio()
            similarity = int(seq_ratio * 100)
            if similarity >= 85:
                confidence = max(confidence, similarity)
                reasons.append(f"High name similarity ({similarity}%).")
            elif similarity >= 75:
                confidence = max(confidence, similarity)
                reasons.append(f"Medium name similarity ({similarity}%).")

        if confidence >= 60:
            candidate = {
                "entity_id": str(ex["_id"]),
                "entity_name": ex_name,
                "confidence": confidence,
                "match_reasons": reasons
            }
            candidates.append(candidate)
            
    # Sort by confidence descending
    candidates.sort(key=lambda x: x["confidence"], reverse=True)
    return candidates
