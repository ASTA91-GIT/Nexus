from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.core.database import get_database
from app.api.routes.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def get_audit_logs(db=Depends(get_database), current_user=Depends(get_current_user)):
    """
    Returns the 100 most recent operational logs from the audit_logs collection.
    """
    logs = await db["audit_logs"].find().sort("timestamp", -1).limit(100).to_list(None)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs
