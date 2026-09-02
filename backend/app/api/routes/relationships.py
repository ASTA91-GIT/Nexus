from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from app.schemas.relationship import RelationshipCreate, RelationshipOut, RelationshipUpdate
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=RelationshipOut)
async def create_relationship(relationship: RelationshipCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    # Validate source and target exist and belong to the same case
    source_entity = await db["entities"].find_one({"_id": ObjectId(relationship.source_entity_id), "case_id": relationship.case_id})
    target_entity = await db["entities"].find_one({"_id": ObjectId(relationship.target_entity_id), "case_id": relationship.case_id})
    
    if not source_entity or not target_entity:
        raise HTTPException(status_code=400, detail="Source or target entity does not exist or does not belong to the case")
        
    rel_dict = relationship.dict()
    rel_dict["created_by"] = current_user["email"]
    rel_dict["created_at"] = datetime.utcnow()
    rel_dict["updated_at"] = datetime.utcnow()
    
    if not rel_dict.get("source") or rel_dict.get("source") == "UNKNOWN":
        rel_dict["source"] = "USER_CREATED"
        
    result = await db["relationships"].insert_one(rel_dict)
    created_rel = await db["relationships"].find_one({"_id": result.inserted_id})
    return created_rel

@router.get("/", response_model=List[RelationshipOut])
async def list_relationships(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    relationships = await db["relationships"].find({"$or": [{"case_id": case_id}, {"caseId": case_id}]}).to_list(5000)
    print(f"[RELATIONSHIPS_API] requested_case_id={case_id} found={len(relationships)}")
    return relationships

@router.put("/{relationship_id}", response_model=RelationshipOut)
async def update_relationship(relationship_id: str, case_id: str, update_data: RelationshipUpdate, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        obj_id = ObjectId(relationship_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Relationship ID format")
        
    existing_rel = await db["relationships"].find_one({"_id": obj_id, "case_id": case_id})
    if not existing_rel:
        raise HTTPException(status_code=404, detail="Relationship not found or does not belong to this case")
        
    update_dict = {k: v for k, v in update_data.dict(exclude_unset=True).items() if v is not None}
    
    if not update_dict:
        return existing_rel
        
    update_dict["updated_at"] = datetime.utcnow()
    
    await db["relationships"].update_one(
        {"_id": obj_id, "case_id": case_id},
        {"$set": update_dict}
    )
    
    updated_rel = await db["relationships"].find_one({"_id": obj_id})
    return updated_rel

@router.delete("/{relationship_id}")
async def delete_relationship(relationship_id: str, case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        obj_id = ObjectId(relationship_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Relationship ID format")
        
    existing_rel = await db["relationships"].find_one({"_id": obj_id, "case_id": case_id})
    if not existing_rel:
        raise HTTPException(status_code=404, detail="Relationship not found or does not belong to this case")
        
    await db["relationships"].delete_one({"_id": obj_id, "case_id": case_id})
    return {"detail": "Relationship deleted successfully"}
