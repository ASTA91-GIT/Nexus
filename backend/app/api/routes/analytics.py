from fastapi import APIRouter, Depends
from typing import Any, Dict
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.graph.graph_builder import build_graph
from app.graph.community_detection import calculate_network_metrics

router = APIRouter()

@router.get("/{case_id}")
async def get_analytics(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    entities = await db["entities"].find({"case_id": case_id}).to_list(None)
    relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    
    G = build_graph(entities, relationships)
    metrics = calculate_network_metrics(G)
    
    return metrics
