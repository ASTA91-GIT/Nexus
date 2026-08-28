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
            
    # 3. Add evidence uploads
    for ev in evidence:
        events.append({
            "event_id": str(ev["_id"]),
            "timestamp": ev["created_at"].isoformat() if hasattr(ev["created_at"], "isoformat") else str(ev["created_at"]),
            "type": "EVIDENCE_INGESTED",
            "category": "EVIDENCE",
            "title": "Evidence Ingested",
            "message": f"Document '{ev['title']}' ({ev['source_type']}) was successfully uploaded and indexed.",
            "properties": {"uploader": ev["created_by"]}
        })
        
    # 4. Add entities created
    for ent in entities:
        events.append({
            "event_id": str(ent["_id"]),
            "timestamp": ent["created_at"].isoformat() if hasattr(ent["created_at"], "isoformat") else str(ent["created_at"]),
            "type": "ENTITY_CREATED",
            "category": "ENTITY",
            "title": "Suspect Identified",
            "message": f"New entity '{ent['name']}' ({ent['type']}) registered in the case log.",
            "properties": {"risk_score": ent.get("risk_score", 0.0)}
        })
        
    # Sort events by timestamp descending
    def get_timestamp_key(evt):
        return str(evt["timestamp"])
        
    events.sort(key=get_timestamp_key, reverse=True)
    return events
