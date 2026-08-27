from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.entity import EntityCreate, EntityOut
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=EntityOut)
async def create_entity(entity: EntityCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    entity_dict = entity.dict()
    entity_dict["created_by"] = current_user["email"]
    from datetime import datetime
    entity_dict["created_at"] = datetime.utcnow()
    entity_dict["updated_at"] = datetime.utcnow()
    entity_dict["risk_score"] = 0.0
    
    result = await db["entities"].insert_one(entity_dict)
    created_entity = await db["entities"].find_one({"_id": result.inserted_id})
    return created_entity

@router.get("/", response_model=List[EntityOut])
async def list_entities(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    entities = await db["entities"].find({"case_id": case_id}).to_list(1000)
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
