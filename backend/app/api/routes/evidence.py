from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.evidence import EvidenceCreate, EvidenceOut
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=EvidenceOut)
async def create_evidence(evidence: EvidenceCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    ev_dict = evidence.dict()
    ev_dict["created_by"] = current_user["email"]
    from datetime import datetime
    ev_dict["created_at"] = datetime.utcnow()
    
    result = await db["evidence"].insert_one(ev_dict)
    created_ev = await db["evidence"].find_one({"_id": result.inserted_id})
    return created_ev

@router.get("/{evidence_id}", response_model=EvidenceOut)
async def get_evidence(evidence_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        ev = await db["evidence"].find_one({"_id": ObjectId(evidence_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid Evidence ID")
    
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return ev
