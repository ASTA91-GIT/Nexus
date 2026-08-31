from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.case import CaseCreate, CaseOut
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.api.dependencies import verify_case_access
from bson import ObjectId

from datetime import datetime

router = APIRouter()

@router.post("/", response_model=CaseOut)
async def create_case(case: CaseCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    case_dict = case.dict()
    case_dict["created_by"] = current_user["email"]
    if not case_dict.get("investigator"):
        case_dict["investigator"] = current_user["email"]
    case_dict["created_at"] = datetime.utcnow()
    case_dict["updated_at"] = datetime.utcnow()
    
    result = await db["cases"].insert_one(case_dict)
    created_case = await db["cases"].find_one({"_id": result.inserted_id})
    from app.core.audit import log_audit_action
    await log_audit_action(db, current_user["email"], "CREATE_CASE", str(result.inserted_id))
    return created_case

@router.get("/", response_model=List[CaseOut])
async def list_cases(db=Depends(get_database), current_user=Depends(get_current_user)):
    cases = await db["cases"].find().to_list(100)
    return cases

@router.get("/{case_id}", response_model=CaseOut)
async def get_case(case_id: str, case=Depends(verify_case_access)):
    return case

@router.put("/{case_id}", response_model=CaseOut)
async def update_case(case_id: str, updated_case: CaseCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        oid = ObjectId(case_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Case ID format")
        
    case = await db["cases"].find_one({"_id": oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    update_dict = updated_case.dict()
    update_dict["updated_at"] = datetime.utcnow()
    
    await db["cases"].update_one({"_id": oid}, {"$set": update_dict})
    refreshed_case = await db["cases"].find_one({"_id": oid})
    from app.core.audit import log_audit_action
    await log_audit_action(db, current_user["email"], "UPDATE_CASE", case_id)
    return refreshed_case

@router.delete("/{case_id}")
async def delete_case(case_id: str, case=Depends(verify_case_access), db=Depends(get_database), current_user=Depends(get_current_user)):
    oid = case["_id"]
    await db["cases"].delete_one({"_id": oid})
    # Strict cascading deletes for related items
    await db["entities"].delete_many({"case_id": case_id})
    await db["relationships"].delete_many({"case_id": case_id})
    await db["evidence"].delete_many({"case_id": case_id})
    await db["alerts"].delete_many({"case_id": case_id})
    from app.core.audit import log_audit_action
    await log_audit_action(db, current_user["email"], "DELETE_CASE", case_id)
    
    return {"message": "Case and all associated records deleted successfully"}
