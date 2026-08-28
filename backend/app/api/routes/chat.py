from fastapi import APIRouter, Depends
from app.core.database import get_database
from app.api.routes.auth import get_current_user

from app.ai.investigator_agent import run_ai_investigator

router = APIRouter()

@router.post("/")
async def chat_with_nexus(query: str, case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    response = await run_ai_investigator(query, case_id, db)
    return response
