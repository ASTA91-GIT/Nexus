from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.graph.graph_builder import build_graph, get_graph_data_for_frontend

router = APIRouter()

@router.get("/{case_id}", response_model=Dict[str, Any])
async def get_network(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    entities = await db["entities"].find({"case_id": case_id}).to_list(None)
    relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    
    G = build_graph(entities, relationships)
    graph_data = get_graph_data_for_frontend(G)
    
    return graph_data
