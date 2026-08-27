from fastapi import APIRouter, Depends
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from typing import List

router = APIRouter()

@router.get("/")
async def get_alerts(case_id: str = None, db=Depends(get_database), current_user=Depends(get_current_user)):
    query = {}
    if case_id:
        query["case_id"] = case_id
    alerts = await db["alerts"].find(query).to_list(100)
    return alerts

@router.post("/calculate-risk/{case_id}")
async def calculate_case_risk(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    # Placeholder for actual risk calculation logic
    # e.g., anomaly detection based on centrality + relationship types
    return {"message": "Risk calculation triggered"}
