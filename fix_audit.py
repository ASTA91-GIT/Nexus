import json
import re

file_path = 'backend/app/api/routes/audit.py'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    old_route = '''@router.get("/")
async def get_audit_logs(db=Depends(get_database), current_user=Depends(get_current_user)):
    cursor = db["audit_logs"].find().sort("timestamp", -1).limit(50)
    logs = await cursor.to_list(length=50)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs'''

    new_route = '''@router.get("/")
async def get_audit_logs(db=Depends(get_database), current_user=Depends(get_current_user)):
    user_email = current_user.get("email")
    user_role = current_user.get("role", "USER")
    
    # Enforce backend privacy: only admins see global logs, normal users see their own
    query = {} if user_role == "ADMIN" else {"email": user_email}
    
    cursor = db["audit_logs"].find(query).sort("timestamp", -1).limit(50)
    logs = await cursor.to_list(length=50)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs'''

    if old_route in content:
        content = content.replace(old_route, new_route)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('Updated audit.py privacy logic')
    else:
        print('Could not find old route in audit.py')
except Exception as e:
    print('Error:', e)
