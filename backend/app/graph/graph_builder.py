import networkx as nx
from typing import List, Dict

def build_graph(entities: List[Dict], relationships: List[Dict]) -> nx.Graph:
    G = nx.Graph()
    
    for entity in entities:
        # Convert ObjectId to string if needed
        node_id = str(entity.get("_id", entity.get("id")))
        G.add_node(
            node_id, 
            type=entity.get("type"), 
            name=entity.get("name"), 
            risk_score=entity.get("risk_score", 0)
        )
        
    for rel in relationships:
        source = str(rel.get("source_entity_id"))
        target = str(rel.get("target_entity_id"))
        G.add_edge(
            source, 
            target, 
            type=rel.get("type"),
            rel_id=str(rel.get("_id", rel.get("id")))
        )
        
    return G

def get_graph_data_for_frontend(G: nx.Graph) -> Dict:
    from networkx.readwrite import json_graph
    data = json_graph.node_link_data(G)
    return data
