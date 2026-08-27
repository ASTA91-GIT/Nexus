import networkx as nx
from typing import Dict, Any

def calculate_centrality(G: nx.Graph) -> Dict[str, Any]:
    degree = nx.degree_centrality(G)
    betweenness = nx.betweenness_centrality(G)
    closeness = nx.closeness_centrality(G)
    
    # Format for frontend
    results = {}
    for node in G.nodes():
        results[node] = {
            "degree": degree.get(node, 0),
            "betweenness": betweenness.get(node, 0),
            "closeness": closeness.get(node, 0)
        }
    return results
