import networkx as nx
from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.graph.graph_builder import build_graph, get_graph_data_for_frontend

router = APIRouter()

@router.get("/global", response_model=Dict[str, Any])
async def get_global_network(db=Depends(get_database), current_user=Depends(get_current_user)):
    cases = await db["cases"].find({}).to_list(None)
    case_map = {str(c["_id"]): c["name"] for c in cases}
    
    entities = await db["entities"].find({}).to_list(None)
    relationships = await db["relationships"].find({}).to_list(None)
    
    # Deduplicate entities by name and type
    unique_entities = {}
    entity_id_map = {} # Maps original ID to canonical ID
    
    for ent in entities:
        ent_id = str(ent["_id"])
        key = (ent.get("type", "PERSON").upper(), ent.get("name", "").strip().lower())
        case_name = case_map.get(ent.get("case_id"), "Unknown Case")
        
        if key not in unique_entities:
            canonical_id = ent_id
            ent_copy = dict(ent)
            ent_copy["_id"] = canonical_id
            ent_copy["cases"] = [case_name]
            unique_entities[key] = ent_copy
            entity_id_map[ent_id] = canonical_id
        else:
            canonical_id = unique_entities[key]["_id"]
            entity_id_map[ent_id] = canonical_id
            if case_name not in unique_entities[key]["cases"]:
                unique_entities[key]["cases"].append(case_name)
                
    # Build graph with canonical entities
    G = nx.Graph()
    for ent in unique_entities.values():
        G.add_node(
            ent["_id"],
            type=ent.get("type"),
            name=ent.get("name"),
            risk_score=ent.get("risk_score", 0),
            cases=ent.get("cases", [])
        )
        
    for rel in relationships:
        source_canonical = entity_id_map.get(str(rel.get("source_entity_id")))
        target_canonical = entity_id_map.get(str(rel.get("target_entity_id")))
        
        if source_canonical and target_canonical:
            if source_canonical != target_canonical:
                G.add_edge(
                    source_canonical,
                    target_canonical,
                    type=rel.get("type"),
                    rel_id=str(rel.get("_id", rel.get("id")))
                )
                
    graph_data = get_graph_data_for_frontend(G)
    return graph_data

@router.get("/{case_id}", response_model=Dict[str, Any])
async def get_network(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    entities = await db["entities"].find({"$or": [{"case_id": case_id}, {"caseId": case_id}]}).to_list(None)
    relationships = await db["relationships"].find({"$or": [{"case_id": case_id}, {"caseId": case_id}]}).to_list(None)
    
    G = build_graph(entities, relationships)
    graph_data = get_graph_data_for_frontend(G)
    
    print(f"[NETWORK_API] requested_case_id={case_id} raw_entities={len(entities)} raw_relationships={len(relationships)} nodes={len(graph_data.get('nodes', []))} links={len(graph_data.get('links', []))}")
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
