import networkx as nx
from typing import Dict, Any

def calculate_network_metrics(G: nx.Graph) -> Dict[str, Any]:
    """
    Computes all advanced network centrality and clustering statistics.
    """
    n_nodes = len(G.nodes)
    if n_nodes == 0:
        return {
            "nodes": 0,
            "edges": 0,
            "density": 0.0,
            "degree_centrality": {},
            "betweenness_centrality": {},
            "closeness_centrality": {},
            "pagerank": {},
            "communities": []
        }
        
    # Density
    density = nx.density(G)
    
    # Degree Centrality
    degree_cent = nx.degree_centrality(G)
    
    # Betweenness Centrality
    try:
        between_cent = nx.betweenness_centrality(G)
    except Exception as e:
        print(f"Betweenness centrality calculation error: {e}")
        between_cent = {n: 0.0 for n in G.nodes}
        
    # Closeness Centrality
    try:
        close_cent = nx.closeness_centrality(G)
    except Exception as e:
        print(f"Closeness centrality calculation error: {e}")
        close_cent = {n: 0.0 for n in G.nodes}
        
    # PageRank
    try:
        if len(G.edges) > 0:
            pagerank_val = nx.pagerank(G, alpha=0.85)
        else:
            pagerank_val = {n: 1.0 / n_nodes for n in G.nodes}
    except Exception as e:
        print(f"PageRank calculation error: {e}")
        pagerank_val = {n: 1.0 / n_nodes for n in G.nodes}
        
    # Louvain Communities
    communities = []
    try:
        from networkx.algorithms.community import louvain_communities
        comms = louvain_communities(G)
        communities = [list(c) for c in comms]
    except Exception as e:
        print(f"Community detection error: {e}")
        communities = [list(G.nodes)]
        
    return {
        "nodes": n_nodes,
        "edges": len(G.edges),
        "density": density,
        "degree_centrality": degree_cent,
        "betweenness_centrality": between_cent,
        "closeness_centrality": close_cent,
        "pagerank": pagerank_val,
        "communities": communities
    }
