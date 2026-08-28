import re
from typing import Dict, Any, List
from app.graph.graph_builder import build_graph
from app.graph.path_finder import find_shortest_path
from app.ai.model_manager import get_hf_client

async def run_ai_investigator(query: str, case_id: str, db) -> Dict[str, Any]:
    """
    Orchestrates the grounded AI investigation. Intercepts intent, retrieves MongoDB/NetworkX facts,
    and queries Hugging Face API (or falls back to rule-based grounding) to generate factual reports.
    """
    # Retrieve all entities and relationships for grounding context
    entities = await db["entities"].find({"case_id": case_id}).to_list(None)
    relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    
    if not entities:
        return {
            "answer": "There are no entities recorded in this case yet. Please upload case evidence first.",
            "actions": [],
            "supporting_evidence": []
        }
        
    query_lower = query.lower()
    
    # 1. INTENT DETECT: Path Connection Tracing
    # e.g., "how is John Doe connected to Alice Smith?" or "find connection between A and B"
    path_match = re.search(r"(?:connected to|connection between|link between|path between)\s+([a-zA-Z\s]+)\s+(?:and|to)\s+([a-zA-Z\s\?]+)", query_lower)
    if path_match:
        name1 = path_match.group(1).strip().replace("?", "")
        name2 = path_match.group(2).strip().replace("?", "")
        
        # Match names against database entities
        ent1 = next((e for e in entities if name1 in e["name"].lower()), None)
        ent2 = next((e for e in entities if name2 in e["name"].lower()), None)
        
        if not ent1 or not ent2:
            missing = []
            if not ent1: missing.append(f"'{name1}'")
            if not ent2: missing.append(f"'{name2}'")
            return {
                "answer": f"I couldn't locate {' and '.join(missing)} in the case directory. Please verify suspect names.",
                "actions": [],
                "supporting_evidence": []
            }
            
        G = build_graph(entities, relationships)
        path = find_shortest_path(G, str(ent1["_id"]), str(ent2["_id"]))
        
        if not path:
            return {
                "answer": f"Analysis complete: No network path was found linking suspect '{ent1['name']}' to '{ent2['name']}' in this case.",
                "actions": [],
                "supporting_evidence": []
            }
            
        # Compile path descriptions
        chain = []
        entity_map = {str(e["_id"]): e for e in entities}
        for i, node_id in enumerate(path):
            curr_ent = entity_map.get(node_id)
            if curr_ent:
                chain.append(curr_ent["name"])
                
        path_str = " -> ".join(chain)
        grounding_context = f"A path exists between {ent1['name']} and {ent2['name']}: {path_str}."
        
        # Call Hugging Face or fallback
        prompt = f"System: You are NEXUS Forensic AI. Explain the connection path between the suspects clearly.\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = f"The connection path between {ent1['name']} and {ent2['name']} has been traced. They are linked via: {path_str}."
            
        return {
            "answer": answer,
            "actions": [{"type": "TRACE_PATH", "source": str(ent1["_id"]), "target": str(ent2["_id"])}],
            "supporting_evidence": [path_str]
        }

    # 2. INTENT DETECT: Suspect Risk Score Explanation
    # e.g., "why is John Doe high risk?"
    risk_match = re.search(r"(?:why is|explain risk of|risk score of)\s+([a-zA-Z\s\?]+)", query_lower)
    if risk_match:
        target_name = risk_match.group(1).strip().replace("?", "")
        ent = next((e for e in entities if target_name in e["name"].lower()), None)
        
        if ent:
            risk = ent.get("risk_score", 0.0)
            properties = ent.get("properties", {})
            classification = ent.get("type", "PERSON")
            
            grounding_context = f"Suspect '{ent['name']}' classified as {classification} has a threat risk index of {risk:.2f}. Attributes: {properties}."
            
            prompt = f"System: You are NEXUS Forensic AI. Explain why this suspect is marked with risk index {risk:.2f} based strictly on facts.\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
            answer = call_hf_api(prompt)
            if not answer:
                status_flag = "suspicious attributes" if properties.get("flagged") else "network positions"
                answer = f"Suspect '{ent['name']}' has a risk score of {risk:.2f} due to {status_flag}. Attributes recorded: {properties}."
                
            return {
                "answer": answer,
                "actions": [{"type": "FOCUS_NODE", "node_id": str(ent["_id"])}],
                "supporting_evidence": [f"Risk score: {risk}"]
            }

    # 3. INTENT DETECT: List High Threat Targets
    # e.g., "who are the high risk entities?"
    if "high risk" in query_lower or "threats" in query_lower:
        high_risk_ents = [e for e in entities if e.get("risk_score", 0.0) > 0.7]
        if not high_risk_ents:
            return {
                "answer": "No high-risk entities (risk index > 0.70) are currently recorded in the active case file.",
                "actions": [],
                "supporting_evidence": []
            }
            
        list_str = ", ".join([f"'{e['name']}' (Risk: {e['risk_score']:.2f})" for e in high_risk_ents])
        grounding_context = f"High-risk suspects detected in this case: {list_str}."
        
        prompt = f"System: You are NEXUS Forensic AI. Present the list of high threat targets professionally.\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = f"The following high-risk suspect profiles require immediate review: {list_str}."
            
        return {
            "answer": answer,
            "actions": [{"type": "FILTER_RISK", "min_risk": 0.7}],
            "supporting_evidence": [e["name"] for e in high_risk_ents]
        }

    # 4. DEFAULT: General Case Summary facts
    case_summary = f"Active case file holds {len(entities)} suspects and {len(relationships)} linkages."
    prompt = f"System: You are NEXUS Forensic AI. Answer the question based on the case metrics.\nFact: {case_summary}\nQuestion: {query}\nAnswer:"
    answer = call_hf_api(prompt)
    if not answer:
        answer = f"I am connected to the active investigation database. Currently, we have registered {len(entities)} suspect profiles and {len(relationships)} connections in this case file."
        
    return {
        "answer": answer,
        "actions": [],
        "supporting_evidence": []
    }

def call_hf_api(prompt: str) -> str:
    """
    Calls Hugging Face Inference Client text generation, handles fallbacks.
    """
    client = get_hf_client()
    if not client:
        return ""
        
    try:
        # Generate answer using instruction model
        response = client.text_generation(
            model="meta-llama/Llama-3-8B-Instruct",
            prompt=prompt,
            max_new_tokens=200,
            temperature=0.3
        )
        return response.strip()
    except Exception as e:
        print(f"Hugging Face Client inference failure: {e}")
        return ""
