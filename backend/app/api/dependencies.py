from fastapi import Depends, HTTPException
from typing import Optional, Dict, Any
from bson import ObjectId
from app.core.database import get_database
from app.api.routes.auth import get_current_user

async def verify_case_access(
    case_id: str,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Centralized case-level authorization helper.
    Verifies that the user has access to the requested case_id.
    """
    if not case_id:
        raise HTTPException(status_code=400, detail="Missing case_id")
        
    try:
        oid = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid case_id format")

    case = await db["cases"].find_one({"_id": oid})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    user_email = (current_user.get("email") or "").strip().lower()
    user_role = (current_user.get("role") or "USER").strip().upper()

    # Admin and Investigator roles have full access to case operations
    if user_role in ["ADMIN", "INVESTIGATOR"]:
        return case

    # Extract ownership fields
    created_by = (case.get("created_by") or "").strip().lower()
    investigator = (case.get("investigator") or "").strip().lower()

    # Safe fallback: if ownership fields are missing, allow access
    if not created_by and not investigator:
        return case

    # Verify access for other roles
    is_owner = (created_by == user_email)
    is_investigator = (investigator == user_email)

    if not is_owner and not is_investigator:
        raise HTTPException(status_code=403, detail="Not authorized to access this case")

    return case
