from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId
from app.services.data_processing.pipeline import process_entity_data

router = APIRouter()

async def verify_case_access(db, case_id: str, current_user: Dict):
    # Same basic auth logic to ensure user has access to this case
    # Assuming everyone has access in this simplified implementation,
    # but normally we'd check if user is associated with case.
    case = await db["cases"].find_one({"_id": ObjectId(case_id)})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.post("/preview")
async def preview_entity_processing(payload: Dict[str, Any] = Body(...), db=Depends(get_database), current_user=Depends(get_current_user)):
    """
    Analyzes raw entity data without modifying the DB.
    """
    case_id = payload.get("case_id")
    if not case_id:
        raise HTTPException(status_code=400, detail="case_id is required")
        
    await verify_case_access(db, case_id, current_user)
    
    preview = await process_entity_data(db, payload, case_id, mode="PREVIEW")
    return preview

@router.get("/case/{case_id}")
async def get_case_quality(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """
    Aggregates the quality metrics for an entire case on demand.
    """
    await verify_case_access(db, case_id, current_user)
    
    entities = await db["entities"].find({"case_id": case_id}).to_list(10000)
    if not entities:
        return {"overall_score": 0, "issues": ["Case is empty."]}
        
    total_score = 0
    issues = []
    analyzed_count = 0
    
    for entity in entities:
        dq = entity.get("data_quality")
        if dq:
            total_score += dq.get("overall_score", 0)
            analyzed_count += 1
            if entity.get("processing_report", {}).get("duplicates_found", 0) > 0:
                issues.append(f"Entity '{entity.get('name')}' has possible duplicates.")
            for w in entity.get("processing_report", {}).get("warnings", []):
                issues.append(f"{entity.get('name')}: {w}")
                
    if analyzed_count == 0:
        return {"overall_score": 0, "issues": ["No entities have been analyzed yet."]}
        
    avg_score = int(total_score / analyzed_count)
    return {
        "overall_score": avg_score,
        "analyzed_entities": analyzed_count,
        "issues": list(set(issues))[:20] # Return unique issues, cap at 20
    }

@router.get("/entities/{entity_id}/resolution")
async def get_entity_resolution(entity_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    """
    Returns a list of highly probable duplicate candidates.
    """
    try:
        obj_id = ObjectId(entity_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid entity ID")
        
    entity = await db["entities"].find_one({"_id": obj_id})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
        
    case_id = entity.get("case_id")
    await verify_case_access(db, case_id, current_user)
    
    # Run preview just to get duplicates
    preview = await process_entity_data(db, entity, case_id, mode="PREVIEW", exclude_id=entity_id)
    return {"suggestions": preview.get("duplicates", [])}
