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
    if case_id == "all":
        entities = await db["entities"].find({}).to_list(None)
        relationships = await db["relationships"].find({}).to_list(None)
    else:
        entities = await db["entities"].find({"case_id": case_id}).to_list(None)
        relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    
    if not entities:
        scope_text = "in the database yet" if case_id == "all" else "recorded in this case yet"
        return {
            "answer": f"There are no entities {scope_text}. Please upload case evidence first.",
            "actions": [],
            "supporting_evidence": []
        }
        
    query_lower = query.lower()
    
    # Pre-build deduplication data if case_id == "all"
    unique_entities = {}
    entity_id_map = {}
    if case_id == "all":
        for ent in entities:
            ent_id = str(ent["_id"])
            key = (ent.get("type", "PERSON").upper(), ent.get("name", "").strip().lower())
            if key not in unique_entities:
                canonical_id = ent_id
                ent_copy = dict(ent)
                ent_copy["_id"] = canonical_id
                unique_entities[key] = ent_copy
                entity_id_map[ent_id] = canonical_id
            else:
                canonical_id = unique_entities[key]["_id"]
                entity_id_map[ent_id] = canonical_id
    
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
            scope_text = "database" if case_id == "all" else "case directory"
            return {
                "answer": f"I couldn't locate {' and '.join(missing)} in the {scope_text}. Please verify suspect names.",
                "actions": [],
                "supporting_evidence": []
            }
            
        # Build Graph
        if case_id == "all":
            import networkx as nx
            G = nx.Graph()
            for ent in unique_entities.values():
                G.add_node(
                    ent["_id"],
                    type=ent.get("type"),
                    name=ent.get("name"),
                    risk_score=ent.get("risk_score", 0)
                )
            for rel in relationships:
                src = entity_id_map.get(str(rel.get("source_entity_id")))
                tgt = entity_id_map.get(str(rel.get("target_entity_id")))
                if src and tgt and src != tgt:
                    G.add_edge(src, tgt, type=rel.get("type"))
            
            start_id = entity_id_map.get(str(ent1["_id"]), str(ent1["_id"]))
            target_id = entity_id_map.get(str(ent2["_id"]), str(ent2["_id"]))
            path = find_shortest_path(G, start_id, target_id)
        else:
            G = build_graph(entities, relationships)
            start_id = str(ent1["_id"])
            target_id = str(ent2["_id"])
            path = find_shortest_path(G, start_id, target_id)
        
        if not path:
            scope_text = "across cases" if case_id == "all" else "in this case"
            return {
                "answer": f"Analysis complete: No network path was found linking suspect '{ent1['name']}' to '{ent2['name']}' {scope_text}.",
                "actions": [],
                "supporting_evidence": []
            }
            
        # Compile path descriptions
        chain = []
        entity_map = {str(e["_id"]): e for e in unique_entities.values()} if case_id == "all" else {str(e["_id"]): e for e in entities}
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
            "actions": [{"type": "TRACE_PATH", "source": start_id, "target": target_id, "scope": case_id}],
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
                
            node_id = entity_id_map.get(str(ent["_id"]), str(ent["_id"])) if case_id == "all" else str(ent["_id"])
            return {
                "answer": answer,
                "actions": [{"type": "FOCUS_NODE", "node_id": node_id, "scope": case_id}],
                "supporting_evidence": [f"Risk score: {risk}"]
            }

    # 3. INTENT DETECT: List High Threat Targets
    # e.g., "who are the high risk entities?"
    if "high risk" in query_lower or "threats" in query_lower:
        if case_id == "all":
            high_risk_ents = [e for e in unique_entities.values() if e.get("risk_score", 0.0) > 0.7]
        else:
            high_risk_ents = [e for e in entities if e.get("risk_score", 0.0) > 0.7]
            
        if not high_risk_ents:
            scope_text = "database" if case_id == "all" else "active case file"
            return {
                "answer": f"No high-risk entities (risk index > 0.70) are currently recorded in the {scope_text}.",
                "actions": [],
                "supporting_evidence": []
            }
            
        list_str = ", ".join([f"'{e['name']}' (Risk: {e['risk_score']:.2f})" for e in high_risk_ents])
        scope_text = "all combined cases" if case_id == "all" else "this case"
        grounding_context = f"High-risk suspects detected in {scope_text}: {list_str}."
        
        prompt = f"System: You are NEXUS Forensic AI. Present the list of high threat targets professionally.\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = f"The following high-risk suspect profiles require immediate review: {list_str}."
            
        return {
            "answer": answer,
            "actions": [{"type": "FILTER_RISK", "min_risk": 0.7, "scope": case_id}],
            "supporting_evidence": [e["name"] for e in high_risk_ents]
        }

    # 3.5 INTENT DETECT: Who Killed / Who Ordered / Who Financed
    killed_match = re.search(r"who\s+(?:killed|murdered|assassinated)\s+([a-zA-Z\s\?]+)", query_lower)
    ordered_match = re.search(r"who\s+(?:ordered|planned)\s+(?:the\s+(?:killing|murder|assassination)\s+of\s+)?([a-zA-Z\s\?]+)", query_lower)
    financed_match = re.search(r"who\s+(?:financed|paid\s+for|funded)\s+(?:the\s+(?:killing|murder|assassination)\s+of\s+)?([a-zA-Z\s\?]+)", query_lower)
    
    intent_match = None
    rel_type = None
    target_name = None
    
    if killed_match:
        intent_match = killed_match
        rel_type = "KILLED"
    elif ordered_match:
        intent_match = ordered_match
        rel_type = "ORDERED"
    elif financed_match:
        intent_match = financed_match
        rel_type = "FINANCED"
        
    if intent_match:
        target_name = intent_match.group(1).strip().replace("?", "")
        target_ent = next((e for e in entities if target_name in e["name"].lower()), None)
        
        if not target_ent:
            scope_text = "database" if case_id == "all" else "case directory"
            return {
                "answer": f"I couldn't locate '{target_name}' in the {scope_text}. Please verify the name.",
                "actions": [],
                "supporting_evidence": []
            }
            
        target_id_str = str(target_ent["_id"])
        
        # Find relationships pointing to the target with rel_type
        relevant_rels = []
        for r in relationships:
            # We want source -> target where target is target_ent and type matches, or type is similar
            # For ordered/financed, we might need a longer chain, but let's check direct first
            t_id = str(r.get("target_entity_id"))
            if t_id == target_id_str and r.get("type", "").upper() == rel_type:
                relevant_rels.append(r)
                
        # If no direct rel, let's search for chains if it's ordered/financed (e.g. A->ORDERED->B->KILLED->Target)
        if not relevant_rels and rel_type in ["ORDERED", "FINANCED"]:
            # Find who killed the target
            killers = [r.get("source_entity_id") for r in relationships if str(r.get("target_entity_id")) == target_id_str and r.get("type", "").upper() == "KILLED"]
            for killer_id in killers:
                # Find who ordered/financed the killer
                indirect_rels = [r for r in relationships if str(r.get("target_entity_id")) == str(killer_id) and r.get("type", "").upper() == rel_type]
                relevant_rels.extend(indirect_rels)

        if not relevant_rels:
            scope_text = "across cases" if case_id == "all" else "in this case"
            return {
                "answer": f"Analysis complete: No records found indicating who {rel_type.lower()} '{target_ent['name']}' {scope_text}.",
                "actions": [],
                "supporting_evidence": []
            }
            
        # Compile actors
        actors = []
        entity_map = {str(e["_id"]): e for e in unique_entities.values()} if case_id == "all" else {str(e["_id"]): e for e in entities}
        
        for r in relevant_rels:
            source_id = str(r.get("source_entity_id"))
            source_ent = entity_map.get(source_id)
            if source_ent:
                status = r.get("status", "CONFIRMED")
                actors.append(f"{source_ent['name']} ({status})")
                
        actors_str = ", ".join(actors)
        grounding_context = f"Entities who {rel_type.lower()} {target_ent['name']}: {actors_str}."
        
        prompt = f"System: You are NEXUS Forensic AI. Report the findings based strictly on the facts.\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = f"The following entities are recorded as having {rel_type.lower()} {target_ent['name']}: {actors_str}."
            
        action_node = str(relevant_rels[0].get("source_entity_id")) if relevant_rels else target_id_str
        node_id_to_focus = entity_id_map.get(action_node, action_node) if case_id == "all" else action_node
        
        return {
            "answer": answer,
            "actions": [{"type": "FOCUS_NODE", "node_id": node_id_to_focus, "scope": case_id}],
            "supporting_evidence": [f"{rel_type} -> {target_ent['name']}"]
        }

    # 4. DEFAULT: General Case Summary facts
    if case_id == "all":
        suspects_count = len(unique_entities)
        linkages_count = len(relationships)
        case_summary = f"The global database holds {suspects_count} unique suspects and {linkages_count} linkages across all cases."
    else:
        case_summary = f"Active case file holds {len(entities)} suspects and {len(relationships)} linkages."
        
    prompt = f"System: You are NEXUS Forensic AI. Answer the question based on the case metrics.\nFact: {case_summary}\nQuestion: {query}\nAnswer:"
    answer = call_hf_api(prompt)
    if not answer:
        if case_id == "all":
            answer = f"I am connected to the global NEXUS intelligence database. Currently, we have registered {suspects_count} unique suspect profiles and {linkages_count} connections across all investigation files."
        else:
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
