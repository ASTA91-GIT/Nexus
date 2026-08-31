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

    user_email = current_user.get("email")
    user_role = current_user.get("role", "USER")

    # If the user is an admin, grant access
    if user_role == "ADMIN":
        return case

    # Extract ownership fields
    created_by = case.get("created_by")
    investigator = case.get("investigator")

    # Safe fallback: if ownership fields are entirely missing, it's a legacy case.
    # The requirement is NOT to lock legitimate users out. 
    # For a legacy case, we will allow access if neither field exists, 
    # preserving backward compatibility.
    if not created_by and not investigator:
        return case

    # Verify access
    is_owner = (created_by == user_email)
    is_investigator = (investigator == user_email)

    if not is_owner and not is_investigator:
        raise HTTPException(status_code=403, detail="Not authorized to access this case")

    return case
