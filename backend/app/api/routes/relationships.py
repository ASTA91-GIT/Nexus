from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.relationship import RelationshipCreate, RelationshipOut
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=RelationshipOut)
async def create_relationship(relationship: RelationshipCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    rel_dict = relationship.dict()
    rel_dict["created_by"] = current_user["email"]
    from datetime import datetime
    rel_dict["created_at"] = datetime.utcnow()
    rel_dict["updated_at"] = datetime.utcnow()
    
    result = await db["relationships"].insert_one(rel_dict)
    created_rel = await db["relationships"].find_one({"_id": result.inserted_id})
    return created_rel

@router.get("/", response_model=List[RelationshipOut])
async def list_relationships(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    relationships = await db["relationships"].find({"case_id": case_id}).to_list(5000)
    return relationships
