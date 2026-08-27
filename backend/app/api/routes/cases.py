from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.case import CaseCreate, CaseOut
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=CaseOut)
async def create_case(case: CaseCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    case_dict = case.dict()
    case_dict["created_by"] = current_user["email"]
    from datetime import datetime
    case_dict["created_at"] = datetime.utcnow()
    case_dict["updated_at"] = datetime.utcnow()
    
    result = await db["cases"].insert_one(case_dict)
    created_case = await db["cases"].find_one({"_id": result.inserted_id})
    return created_case

@router.get("/", response_model=List[CaseOut])
async def list_cases(db=Depends(get_database), current_user=Depends(get_current_user)):
    cases = await db["cases"].find().to_list(100)
    return cases

@router.get("/{case_id}", response_model=CaseOut)
async def get_case(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        case = await db["cases"].find_one({"_id": ObjectId(case_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid Case ID format")
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case
