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

@router.get("/{case_id}/path")
async def get_shortest_path(
    case_id: str,
    source: str,
    target: str,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    entities = await db["entities"].find({"case_id": case_id}).to_list(None)
    relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    
    G = build_graph(entities, relationships)
    
    from app.graph.path_finder import find_shortest_path
    path_node_ids = find_shortest_path(G, source, target)
    
    if not path_node_ids:
        return {"path": [], "entities": [], "relationships": []}
        
    path_entities = []
    entity_map = {str(e["_id"]): e for e in entities}
    for node_id in path_node_ids:
        ent = entity_map.get(node_id)
        if ent:
            ent_copy = dict(ent)
            ent_copy["_id"] = str(ent["_id"])
            path_entities.append(ent_copy)
            
    path_relationships = []
    for i in range(len(path_node_ids) - 1):
        u = path_node_ids[i]
        v = path_node_ids[i + 1]
        
        connecting_rels = [
            r for r in relationships 
            if (str(r["source_entity_id"]) == u and str(r["target_entity_id"]) == v) or
               (str(r["source_entity_id"]) == v and str(r["target_entity_id"]) == u)
        ]
        if connecting_rels:
            rel = dict(connecting_rels[0])
            rel["_id"] = str(rel["_id"])
            rel["source_entity_id"] = str(rel["source_entity_id"])
            rel["target_entity_id"] = str(rel["target_entity_id"])
            path_relationships.append(rel)
            
    return {
        "path": path_node_ids,
        "entities": path_entities,
        "relationships": path_relationships
    }
