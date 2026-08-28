from fastapi import APIRouter, Depends
from app.core.database import get_database
from app.api.routes.auth import get_current_user

from app.ai.investigator_agent import run_ai_investigator

router = APIRouter()

from datetime import datetime

@router.post("/")
async def chat_with_nexus(query: str, case_id: str = "all", db=Depends(get_database), current_user=Depends(get_current_user)):
    response = await run_ai_investigator(query, case_id, db)
    
    # Log interaction
    try:
        await db["ai_interactions"].insert_one({
            "email": current_user.get("email", "investigator@nexus.gov"),
            "case_id": case_id,
            "question": query,
            "response": response.get("answer", ""),
            "actions": response.get("actions", []),
            "timestamp": datetime.utcnow()
        })
    except Exception as e:
        print(f"Failed to log AI interaction: {e}")
        
    return response

@router.get("/history")
async def get_ai_history(case_id: str = None, db=Depends(get_database), current_user=Depends(get_current_user)):
    query = {}
    if case_id and case_id != "all":
        query["case_id"] = case_id
    
    logs = await db["ai_interactions"].find(query).sort("timestamp", -1).limit(50).to_list(None)
    for log in logs:
        log["_id"] = str(log["_id"])
    return logs
