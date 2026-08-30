from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId

router = APIRouter()

@router.get("/{case_id}", response_model=List[Dict[str, Any]])
async def get_timeline(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    # 1. Fetch entities, relationships, evidence
    entities = await db["entities"].find({"case_id": case_id}).to_list(None)
    relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    evidence = await db["evidence"].find({"case_id": case_id}).to_list(None)
    
    events = []
    
    # 2. Add relationships with timestamp/date properties
    entity_map = {str(e["_id"]): e for e in entities}
    for r in relationships:
        props = r.get("properties", {})
        t_str = props.get("timestamp") or props.get("date") or props.get("time")
        if t_str:
            src = entity_map.get(str(r["source_entity_id"]))
            tgt = entity_map.get(str(r["target_entity_id"]))
            events.append({
                "event_id": str(r["_id"]),
                "timestamp": t_str,
                "type": f"RELATIONSHIP_{r['type']}",
                "category": "RELATIONSHIP",
                "title": f"{r['type']} Link Detected",
                "message": f"'{src['name'] if src else 'Unknown'}' linked to '{tgt['name'] if tgt else 'Unknown'}' via {r['type']}.",
                "properties": props
            })
            
    # Removed evidence uploads to ensure only real extracted data is used
    # 4. Add entities with temporal significance
    for ent in entities:
        props = ent.get("properties", {})
        t_str = props.get("timestamp") or props.get("date") or props.get("time")
        
        if t_str or ent.get("type") in ["EVENT", "COMMUNICATION"]:
            event_time = t_str if t_str else (ent["created_at"].isoformat() if hasattr(ent["created_at"], "isoformat") else str(ent["created_at"]))
            
            ent_type = ent.get('type', 'UNKNOWN')
            title = f"{ent_type.capitalize()} Logged: {ent['name']}"
            if ent_type == "EVENT":
                title = ent['name']
            elif ent_type == "COMMUNICATION":
                title = f"Communication Intercept: {ent['name']}"
                
            desc = ent.get("description", "")
            if not desc:
                desc = f"Subject '{ent['name']}' was registered as a {ent_type.lower()} in the intelligence database."
                
            events.append({
                "event_id": str(ent["_id"]),
                "timestamp": event_time,
                "type": f"ENTITY_{ent_type}",
                "category": "ENTITY",
                "title": title,
                "message": desc,
                "properties": {"risk_score": ent.get("risk_score", 0.0), **props}
            })
        
    # Sort events chronologically (ascending)
    def get_timestamp_key(evt):
        return str(evt["timestamp"])
        
    events.sort(key=get_timestamp_key, reverse=False)
    return events
