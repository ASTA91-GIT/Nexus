from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.database import get_database
from app.api.routes.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_system_stats(db=Depends(get_database), current_user=Depends(get_current_user)):
    """
    Returns global system statistics for the current user's dashboard and profile.
    """
    # In a real system, you might filter these by what the user has access to,
    # but for this admin/investigator dashboard we will return system-wide stats.
    
    cases_created = await db["cases"].count_documents({})
    # If the user is an investigator, we can filter by their email or ID if "investigator" matches
    if current_user.get("role") != "ADMIN":
        cases_assigned = await db["cases"].count_documents({"investigator": current_user.get("email")})
    else:
        cases_assigned = cases_created # Admins see all
        
    evidence_uploaded = await db["evidence"].count_documents({})
    reports_generated = 0 # Placeholder if reports collection doesn't exist yet
    ai_queries = 0 # Placeholder if audit log for AI doesn't track this specifically yet
    
    # Try to count AI queries from audit log if it exists
    ai_queries = await db["audit_logs"].count_documents({"action": "CHAT_QUERY"})
    
    return {
        "cases_created": cases_created,
        "cases_assigned": cases_assigned,
        "evidence_uploaded": evidence_uploaded,
        "reports_generated": reports_generated,
        "ai_queries": ai_queries
    }
