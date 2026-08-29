import networkx as nx
from typing import Any, Dict, List


def build_graph(entities: List[Dict], relationships: List[Dict]) -> nx.Graph:
    G = nx.Graph()

    for entity in entities:
        node_id = str(entity.get("_id", entity.get("id")))
        G.add_node(
            node_id,
            type=entity.get("type"),
            name=entity.get("name"),
            risk_score=entity.get("risk_score", 0),
            cases=entity.get("cases", []),
        )

    for rel in relationships:
        source = str(rel.get("source_entity_id"))
        target = str(rel.get("target_entity_id"))
        if not source or not target or source == "None" or target == "None":
            continue
        G.add_edge(
            source,
            target,
            type=rel.get("type"),
            rel_id=str(rel.get("_id", rel.get("id", ""))),
        )

    return G


def _node_id(value: Any) -> str:
    if isinstance(value, dict):
        return str(value.get("id", value.get("_id", "")))
    return str(value)


def get_graph_data_for_frontend(G: nx.Graph) -> Dict:
    """Stable {nodes, links} payload — never rely on NetworkX json_graph key names."""
    nodes = []
    for node_id, attrs in G.nodes(data=True):
        nodes.append({
            "id": str(node_id),
            "name": attrs.get("name") or str(node_id),
            "type": attrs.get("type") or "UNKNOWN",
            "risk_score": float(attrs.get("risk_score") or 0),
            "cases": attrs.get("cases") or [],
        })

    links = []
    for source, target, attrs in G.edges(data=True):
        links.append({
            "source": _node_id(source),
            "target": _node_id(target),
            "type": attrs.get("type") or "LINKED",
            "rel_id": str(attrs.get("rel_id") or f"{source}-{target}"),
        })

    return {"nodes": nodes, "links": links}
