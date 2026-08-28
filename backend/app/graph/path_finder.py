import networkx as nx
from typing import List

def find_shortest_path(G: nx.Graph, source_id: str, target_id: str) -> List[str]:
    """
    Finds the shortest path between source_id and target_id in the networkx graph.
    Returns a list of node IDs forming the path, or empty list if no path exists.
    """
    try:
        path = nx.shortest_path(G, source=source_id, target=target_id)
        return path
    except nx.NodeNotFound:
        return []
    except nx.NetworkXNoPath:
        return []
    except Exception as e:
        print(f"Error finding shortest path: {e}")
        return []
