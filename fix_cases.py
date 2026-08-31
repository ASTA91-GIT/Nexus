import json
import re

file_path = 'backend/app/api/routes/cases.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    'from app.api.routes.auth import get_current_user',
    'from app.api.routes.auth import get_current_user\nfrom app.api.dependencies import verify_case_access'
)

# Refactor get_case
old_get_case = '''@router.get("/{case_id}", response_model=CaseOut)
async def get_case(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        case = await db["cases"].find_one({"_id": ObjectId(case_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid Case ID format")
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case'''

new_get_case = '''@router.get("/{case_id}", response_model=CaseOut)
async def get_case(case_id: str, case=Depends(verify_case_access)):
    return case'''

content = content.replace(old_get_case, new_get_case)

# Refactor update_case
old_update_case = '''@router.put("/{case_id}", response_model=CaseOut)
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
    
    await db["cases"].update_one({"_id": oid}, {"": update_dict})
    refreshed_case = await db["cases"].find_one({"_id": oid})
    from app.core.audit import log_audit_action
    await log_audit_action(db, current_user["email"], "UPDATE_CASE", case_id)
    return refreshed_case'''

new_update_case = '''@router.put("/{case_id}", response_model=CaseOut)
async def update_case(case_id: str, updated_case: CaseCreate, case=Depends(verify_case_access), db=Depends(get_database), current_user=Depends(get_current_user)):
    oid = case["_id"]
    update_dict = updated_case.dict()
    update_dict["updated_at"] = datetime.utcnow()
    
    await db["cases"].update_one({"_id": oid}, {"": update_dict})
    refreshed_case = await db["cases"].find_one({"_id": oid})
    from app.core.audit import log_audit_action
    await log_audit_action(db, current_user["email"], "UPDATE_CASE", case_id)
    return refreshed_case'''

content = content.replace(old_update_case, new_update_case)

# Refactor delete_case
old_delete_case = '''@router.delete("/{case_id}")
async def delete_case(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        oid = ObjectId(case_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Case ID format")
        
    case = await db["cases"].find_one({"_id": oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    await db["cases"].delete_one({"_id": oid})'''

new_delete_case = '''@router.delete("/{case_id}")
async def delete_case(case_id: str, case=Depends(verify_case_access), db=Depends(get_database), current_user=Depends(get_current_user)):
    oid = case["_id"]
    await db["cases"].delete_one({"_id": oid})'''

content = content.replace(old_delete_case, new_delete_case)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated cases.py successfully')
