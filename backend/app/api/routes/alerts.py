from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.schemas.alert import AlertOut
from app.graph.graph_builder import build_graph
from app.graph.centrality import calculate_centrality
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter()

@router.get("/", response_model=List[AlertOut])
async def get_alerts(case_id: str = None, status: str = None, db=Depends(get_database), current_user=Depends(get_current_user)):
    query = {}
    if case_id:
        query["case_id"] = case_id
    if status:
        query["status"] = status.upper()
    alerts = await db["alerts"].find(query).to_list(1000)
    return alerts

@router.post("/calculate-risk/{case_id}")
async def calculate_case_risk(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    entities = await db["entities"].find({"case_id": case_id}).to_list(None)
    relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    
    if not entities:
        return {"message": "No entities found to calculate risk score.", "alerts_created": 0}
        
    G = build_graph(entities, relationships)
    centrality = calculate_centrality(G)
    
    alerts_created = 0
    for entity in entities:
        entity_id_str = str(entity["_id"])
        
        node_centrality = centrality.get(entity_id_str, {})
        degree = node_centrality.get("degree", 0.0)
        
        base_risk = 0.1
        properties = entity.get("properties", {})
        if isinstance(properties, dict):
            if properties.get("suspicious") or properties.get("flagged") or properties.get("is_cooperative") == False:
                base_risk += 0.4
                
        risk_score = min(1.0, base_risk + (degree * 1.5))
        
        await db["entities"].update_one(
            {"_id": entity["_id"]},
            {"$set": {"risk_score": round(risk_score, 2), "updated_at": datetime.utcnow()}}
        )
        
        if risk_score > 0.5:
            severity = "HIGH" if risk_score > 0.8 else "MEDIUM"
            alert_type = "HIGH_RISK_ENTITY" if risk_score > 0.8 else "SUSPICIOUS_ENTITY"
            message = f"Entity '{entity['name']}' flagged with {severity} risk ({risk_score:.2f}) due to network centrality ({degree:.2f})."
            
            existing = await db["alerts"].find_one({
                "case_id": case_id,
                "entity_id": entity_id_str,
                "type": alert_type
            })
            
            if not existing:
                alert_doc = {
                    "case_id": case_id,
                    "entity_id": entity_id_str,
                    "type": alert_type,
                    "severity": severity,
                    "message": message,
                    "status": "ACTIVE",
                    "created_at": datetime.utcnow()
                }
                await db["alerts"].insert_one(alert_doc)
                alerts_created += 1
                
    return {
        "message": f"Risk calculation complete. Recalculated scores for {len(entities)} entities.",
        "alerts_created": alerts_created
    }

@router.put("/{alert_id}/status")
async def update_alert_status(
    alert_id: str,
    status: str,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    try:
        oid = ObjectId(alert_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Alert ID format")
        
    existing = await db["alerts"].find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    await db["alerts"].update_one({"_id": oid}, {"$set": {"status": status.upper()}})
    return {"message": f"Alert status updated to {status.upper()}"}
