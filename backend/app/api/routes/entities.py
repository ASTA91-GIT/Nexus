from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from app.schemas.entity import EntityCreate, EntityOut, EntityUpdate, BulkPositionUpdate
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId
from datetime import datetime

router = APIRouter()

from app.services.data_processing.pipeline import process_entity_data

@router.post("/", response_model=EntityOut)
async def create_entity(entity: EntityCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    entity_dict = entity.dict()
    entity_dict["created_by"] = current_user["email"]
    entity_dict["created_at"] = datetime.utcnow()
    entity_dict["updated_at"] = datetime.utcnow()
    
    if "risk_score" not in entity_dict:
        entity_dict["risk_score"] = 0.0
        
    if not entity_dict.get("source") or entity_dict.get("source") == "UNKNOWN":
        entity_dict["source"] = "USER_CREATED"
        
    # Process data through the pipeline
    processed_dict = await process_entity_data(db, entity_dict, entity.case_id, mode="APPLY")
        
    result = await db["entities"].insert_one(processed_dict)
    created_entity = await db["entities"].find_one({"_id": result.inserted_id})
    return created_entity

@router.get("/", response_model=List[EntityOut])
async def list_entities(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    entities = await db["entities"].find({"$or": [{"case_id": case_id}, {"caseId": case_id}]}).to_list(1000)
    print(f"[ENTITY_API] requested_case_id={case_id} found={len(entities)}")
    return entities

@router.get("/{entity_id}", response_model=EntityOut)
async def get_entity(entity_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        entity = await db["entities"].find_one({"_id": ObjectId(entity_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid Entity ID format")
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity

@router.put("/bulk/positions")
async def update_bulk_positions(bulk_update: BulkPositionUpdate, db=Depends(get_database), current_user=Depends(get_current_user)):
    from pymongo import UpdateOne
    
    case_id = bulk_update.case_id
    operations = []
    
    # First, verify all entities belong to the case
    entity_ids = [ObjectId(p.entity_id) for p in bulk_update.positions]
    valid_entities_count = await db["entities"].count_documents({
        "_id": {"$in": entity_ids},
        "case_id": case_id
    })
    
    if valid_entities_count != len(bulk_update.positions):
        raise HTTPException(status_code=403, detail="One or more entities do not belong to the specified case or do not exist.")
        
    for pos_update in bulk_update.positions:
        operations.append(
            UpdateOne(
                {"_id": ObjectId(pos_update.entity_id), "case_id": case_id},
                {"$set": {"position": pos_update.position, "updated_at": datetime.utcnow()}}
            )
        )
        
    if operations:
        result = await db["entities"].bulk_write(operations)
        return {"matched_count": result.matched_count, "modified_count": result.modified_count}
        
    return {"matched_count": 0, "modified_count": 0}

@router.put("/{entity_id}", response_model=EntityOut)
async def update_entity(entity_id: str, case_id: str, update_data: EntityUpdate, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        obj_id = ObjectId(entity_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Entity ID format")
        
    existing_entity = await db["entities"].find_one({"_id": obj_id, "case_id": case_id})
    if not existing_entity:
        raise HTTPException(status_code=404, detail="Entity not found or does not belong to this case")
        
    update_dict = {k: v for k, v in update_data.dict(exclude_unset=True).items() if v is not None}
    
    if not update_dict:
        return existing_entity
        
    update_dict["updated_at"] = datetime.utcnow()
    
    if existing_entity.get("source") == "AI_EXTRACTED":
        update_dict["user_modified"] = True
        if "source" in update_dict:
            del update_dict["source"] # Protect AI_EXTRACTED source
            
    # Merge existing and new data to run through pipeline
    merged_entity = {**existing_entity, **update_dict}
    if "_id" in merged_entity:
        del merged_entity["_id"]
        
    processed_dict = await process_entity_data(db, merged_entity, case_id, mode="APPLY", exclude_id=entity_id)
            
    await db["entities"].update_one(
        {"_id": obj_id, "case_id": case_id},
        {"$set": processed_dict}
    )
    
    updated_entity = await db["entities"].find_one({"_id": obj_id})
    return updated_entity

@router.delete("/{entity_id}")
async def delete_entity(entity_id: str, case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        obj_id = ObjectId(entity_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Entity ID format")
        
    existing_entity = await db["entities"].find_one({"_id": obj_id, "case_id": case_id})
    if not existing_entity:
        raise HTTPException(status_code=404, detail="Entity not found or does not belong to this case")
        
    # Delete entity
    await db["entities"].delete_one({"_id": obj_id, "case_id": case_id})
    
    # Safely delete directly connected relationships
    # ONLY relationships where source_entity_id == entity_id OR target_entity_id == entity_id
    rels_deleted = await db["relationships"].delete_many({
        "case_id": case_id,
        "$or": [
            {"source_entity_id": entity_id},
            {"target_entity_id": entity_id}
        ]
    })
    
    return {"detail": "Entity deleted successfully", "relationships_deleted": rels_deleted.deleted_count}
