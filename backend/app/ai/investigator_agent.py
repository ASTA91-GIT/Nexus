import re
from typing import Dict, Any, List
from app.graph.graph_builder import build_graph
from app.graph.path_finder import find_shortest_path
from app.ai.model_manager import get_hf_client
from app.services.rag_service import query_case_context

async def run_ai_investigator(query: str, case_id: str, db, current_user, history_context: str = "") -> Dict[str, Any]:
    """
    Orchestrates the grounded AI investigation. Intercepts intent, retrieves MongoDB/NetworkX facts,
    and queries Hugging Face API (or falls back to rule-based grounding) to generate factual reports.
    """
    # Helper to clean queries
    query_clean = re.sub(r'[^\w\s]', '', query.lower()).strip()
    query_lower = query.lower()

    # --- 12 INTENT DETECTION ROUTERS ---
    
    # 1. OUT_OF_SCOPE
    out_of_scope_patterns = [
        r"\b(?:weather|sports|celebrity|homework|math|mathematics|stock|stocks|movie|recipe)\b"
    ]
    if any(re.search(p, query_lower) for p in out_of_scope_patterns):
        return {
            "answer": "I'm NEXUS AI, an investigation and intelligence assistant. That topic falls outside my area of expertise. I can help you analyze cases, evidence, entities, relationships, network connections, suspicious activity, and investigation data.",
            "actions": [],
            "supporting_evidence": []
        }

    # 2. GENERAL_CONVERSATION
    conversational_patterns = [
        r"^(hi|hello|hey|greetings)(?:\s+nexus)?$",
        r"^(good morning|good afternoon|good evening)$",
        r"^how are you(?:\s+doing)?$",
        r"^(who are you|what are you)$",
        r"^(what can you do|help(?: me)?|how can you help)$",
        r"^(thanks|thank you)$"
    ]
    if any(re.match(p, query_clean) for p in conversational_patterns):
        system_persona = (
            "System: You are NEXUS, an elite AI forensic analyst and investigator. "
            "Respond to the user naturally and professionally, explaining your capabilities if asked."
        )
        prompt = f"{system_persona}\n{history_context}\nUser: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            if "can you do" in query_clean or "help" in query_clean:
                answer = "I can help investigate case data, analyze uploaded evidence, identify entities and relationships, trace network connections, explain risk indicators, and answer questions about your active investigation."
            else:
                answer = "Hello! I'm the NEXUS AI Investigator. I can help you explore your investigations, analyze evidence, identify relationships, summarize cases, and answer questions about your investigation data."
                
        return {
            "answer": answer,
            "actions": [],
            "supporting_evidence": []
        }

    # 3. APP_STATISTICS & CASE_LISTING
    app_stat_patterns = [
        r"how many cases", r"how many investigations", r"show my cases", r"list cases", 
        r"what cases do i have", r"show open investigations", r"summary of all my investigations",
        r"what cases are currently open", r"what cases are high priority"
    ]
    if any(p in query_lower for p in app_stat_patterns):
        # Fetch global case stats (unscoped based on existing DB logic which didn't scope cases)
        all_cases = await db["cases"].find().to_list(None)
        open_cases = sum(1 for c in all_cases if c.get("status") == "OPEN")
        closed_cases = sum(1 for c in all_cases if c.get("status") == "CLOSED")
        high_priority = sum(1 for c in all_cases if c.get("priority") == "HIGH")
        
        case_names = [c.get("name", "Unnamed") for c in all_cases[:5]] # sample up to 5
        
        fallback_msg = f"You currently have {len(all_cases)} investigation cases ({open_cases} open, {closed_cases} closed). There are {high_priority} high priority cases."
        if case_names:
            fallback_msg += f" Some of your cases include: {', '.join(case_names)}."
            
        system_persona = "System: You are NEXUS AI. Answer the user's question regarding their cases based on the facts."
        prompt = f"{system_persona}\n{history_context}\nFacts: {fallback_msg}\nUser: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = fallback_msg
            
        return {
            "answer": answer,
            "actions": [],
            "supporting_evidence": ["Global MongoDB Cases queried."]
        }

    # If active case questions, we must ensure case_id is valid
    if case_id != "all":
        # Fetch Entities and Relationships for this case
        entities = await db["entities"].find({"case_id": case_id}).to_list(None)
        relationships = await db["relationships"].find({"case_id": case_id}).to_list(None)
    else:
        entities = await db["entities"].find({}).to_list(None)
        relationships = await db["relationships"].find({}).to_list(None)
        
    if not entities: entities = []
    if not relationships: relationships = []
    
    # 4. ACTIVE_CASE_INFO
    active_case_patterns = [
        r"what is my active case", r"what case am i working on", r"what is this case about",
        r"summarize this investigation", r"what is the case status", r"summarize this case"
    ]
    if any(p in query_lower for p in active_case_patterns):
        if case_id == "all":
            return {
                "answer": "You don't currently have an active case selected. Please select a case before asking for case-specific analysis.",
                "actions": [],
                "supporting_evidence": []
            }
            
        active_case = await db["cases"].find_one({"_id": case_id}) if len(case_id) < 24 else None
        # the case_id in UI might be the string ObjectId. We can fetch name if we parse it, but we also can just use entities/relationships
        from bson import ObjectId
        case_doc = None
        try:
            case_doc = await db["cases"].find_one({"_id": ObjectId(case_id)})
        except:
            pass
            
        case_name = case_doc.get("name", case_id) if case_doc else case_id
        case_status = case_doc.get("status", "Unknown") if case_doc else "Unknown"
        case_desc = case_doc.get("description", "No description provided.") if case_doc else ""
        
        fallback_msg = f"Your active case is '{case_name}' (Status: {case_status}). {case_desc} This investigation contains {len(entities)} entities and {len(relationships)} relationships."
        
        system_persona = "System: You are NEXUS AI. Summarize the active case context for the user."
        prompt = f"{system_persona}\n{history_context}\nFacts: {fallback_msg}\nUser: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = fallback_msg
            
        return {
            "answer": answer,
            "actions": [],
            "supporting_evidence": [f"Case '{case_name}' metadata retrieved."]
        }
        
    # 5. APP_STATISTICS (Case scoped)
    case_stats_patterns = [
        r"how many entities", r"how many relationships", r"how much evidence", r"entity types", r"who are the investigators"
    ]
    if any(p in query_lower for p in case_stats_patterns):
        evidence_count = await db["evidence"].count_documents({"case_id": case_id} if case_id != "all" else {})
        
        ent_types = {}
        for e in entities:
            t = e.get("type", "UNKNOWN")
            ent_types[t] = ent_types.get(t, 0) + 1
            
        type_str = ", ".join([f"{count} {t.lower()}s" for t, count in ent_types.items()])
        
        fallback_msg = f"This investigation currently contains {len(entities)} entities, {len(relationships)} relationships, and {evidence_count} evidence records."
        if type_str:
            fallback_msg += f" Entity breakdown: {type_str}."
            
        system_persona = "System: You are NEXUS AI. Answer the user's statistical query about the case data."
        prompt = f"{system_persona}\n{history_context}\nFacts: {fallback_msg}\nUser: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = fallback_msg
            
        return {
            "answer": answer,
            "actions": [],
            "supporting_evidence": ["Database aggregation counts retrieved."]
        }

    # Deduplication block for Graph logic
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

    # 6. ENTITY_QUERY & RELATIONSHIP_QUERY (General check before path tracer)
    # Check if there is a pronoun in history (FOLLOW_UP_CONTEXT)
    pronouns = [r"\bhe\b", r"\bshe\b", r"\bthey\b", r"\bhim\b", r"\bher\b", r"\bit\b", r"\bthis\b"]
    is_follow_up = any(re.search(p, query_lower) for p in pronouns)
    
    # Existing PATH_TRACING
    path_match = re.search(r"(?:connected to|connection between|link between|path between)\s+([a-zA-Z\s]+)\s+(?:and|to)\s+([a-zA-Z\s\?]+)", query_lower)
    if path_match:
        name1 = path_match.group(1).strip().replace("?", "")
        name2 = path_match.group(2).strip().replace("?", "")
        
        ent1 = next((e for e in entities if name1 in e["name"].lower()), None)
        ent2 = next((e for e in entities if name2 in e["name"].lower()), None)
        
        if not ent1 or not ent2:
            # Maybe it's a follow-up? "who is he connected to?" 
            # If so, it doesn't match this regex cleanly, or it matches name1 = "he". We let it fall through to RAG.
            if not is_follow_up:
                missing = []
                if not ent1: missing.append(f"'{name1}'")
                if not ent2: missing.append(f"'{name2}'")
                scope_text = "database" if case_id == "all" else "case directory"
                return {
                    "answer": f"I couldn't locate {' and '.join(missing)} in the {scope_text}. Please verify suspect names.",
                    "actions": [],
                    "supporting_evidence": []
                }
        else:
            if case_id == "all":
                import networkx as nx
                G = nx.Graph()
                for ent in unique_entities.values():
                    G.add_node(ent["_id"], type=ent.get("type"), name=ent.get("name"), risk_score=ent.get("risk_score", 0))
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
                
            chain = []
            entity_map = {str(e["_id"]): e for e in unique_entities.values()} if case_id == "all" else {str(e["_id"]): e for e in entities}
            for i, node_id in enumerate(path):
                curr_ent = entity_map.get(node_id)
                if curr_ent:
                    chain.append(curr_ent["name"])
                    
            path_str = " -> ".join(chain)
            grounding_context = f"A path exists between {ent1['name']} and {ent2['name']}: {path_str}."
            
            prompt = f"System: You are NEXUS Forensic AI. Explain the connection path between the suspects clearly.\n{history_context}\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
            answer = call_hf_api(prompt)
            if not answer:
                answer = f"The connection path between {ent1['name']} and {ent2['name']} has been traced. They are linked via: {path_str}."
                
            return {
                "answer": answer,
                "actions": [{"type": "TRACE_PATH", "source": start_id, "target": target_id, "scope": case_id}],
                "supporting_evidence": [path_str]
            }

    # 7. RISK_ANALYSIS
    risk_match = re.search(r"(?:why is|explain risk of|risk score of)\s+([a-zA-Z\s\?]+)", query_lower)
    if risk_match:
        target_name = risk_match.group(1).strip().replace("?", "")
        ent = next((e for e in entities if target_name in e["name"].lower()), None)
        if ent:
            risk = ent.get("risk_score", 0.0)
            properties = ent.get("properties", {})
            classification = ent.get("type", "PERSON")
            grounding_context = f"Suspect '{ent['name']}' classified as {classification} has a threat risk index of {risk:.2f}. Attributes: {properties}."
            
            prompt = f"System: You are NEXUS Forensic AI. Explain why this suspect is marked with risk index {risk:.2f} based strictly on facts.\n{history_context}\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
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

    # 8. HIGH THREAT
    if "high risk" in query_lower or "threats" in query_lower:
        high_risk_ents = [e for e in (unique_entities.values() if case_id == "all" else entities) if e.get("risk_score", 0.0) > 0.7]
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
        prompt = f"System: You are NEXUS Forensic AI. Present the list of high threat targets professionally.\n{history_context}\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
        answer = call_hf_api(prompt)
        if not answer:
            answer = f"The following high-risk suspect profiles require immediate review: {list_str}."
        return {
            "answer": answer,
            "actions": [{"type": "FILTER_RISK", "min_risk": 0.7, "scope": case_id}],
            "supporting_evidence": [e["name"] for e in high_risk_ents]
        }

    # 9. KILLED/ORDERED/FINANCED
    killed_match = re.search(r"who\s+(?:killed|murdered|assassinated)\s+([a-zA-Z\s\?]+)", query_lower)
    ordered_match = re.search(r"who\s+(?:ordered|planned)\s+(?:the\s+(?:killing|murder|assassination)\s+of\s+)?([a-zA-Z\s\?]+)", query_lower)
    financed_match = re.search(r"who\s+(?:financed|paid\s+for|funded)\s+(?:the\s+(?:killing|murder|assassination)\s+of\s+)?([a-zA-Z\s\?]+)", query_lower)
    
    intent_match = None
    rel_type = None
    if killed_match:
        intent_match = killed_match; rel_type = "KILLED"
    elif ordered_match:
        intent_match = ordered_match; rel_type = "ORDERED"
    elif financed_match:
        intent_match = financed_match; rel_type = "FINANCED"
        
    if intent_match:
        target_name = intent_match.group(1).strip().replace("?", "")
        target_ent = next((e for e in entities if target_name in e["name"].lower()), None)
        if not target_ent:
            if not is_follow_up:
                scope_text = "database" if case_id == "all" else "case directory"
                return {
                    "answer": f"I couldn't locate '{target_name}' in the {scope_text}. Please verify the name.",
                    "actions": [],
                    "supporting_evidence": []
                }
        else:
            target_id_str = str(target_ent["_id"])
            relevant_rels = []
            for r in relationships:
                t_id = str(r.get("target_entity_id"))
                if t_id == target_id_str and r.get("type", "").upper() == rel_type:
                    relevant_rels.append(r)
            if not relevant_rels and rel_type in ["ORDERED", "FINANCED"]:
                killers = [r.get("source_entity_id") for r in relationships if str(r.get("target_entity_id")) == target_id_str and r.get("type", "").upper() == "KILLED"]
                for killer_id in killers:
                    indirect_rels = [r for r in relationships if str(r.get("target_entity_id")) == str(killer_id) and r.get("type", "").upper() == rel_type]
                    relevant_rels.extend(indirect_rels)
            if not relevant_rels:
                scope_text = "across cases" if case_id == "all" else "in this case"
                return {
                    "answer": f"Analysis complete: No records found indicating who {rel_type.lower()} '{target_ent['name']}' {scope_text}.",
                    "actions": [],
                    "supporting_evidence": []
                }
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
            prompt = f"System: You are NEXUS Forensic AI. Report the findings based strictly on the facts.\n{history_context}\nFact: {grounding_context}\nQuestion: {query}\nAnswer:"
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

    # 10. GENERAL_RAG / FOLLOW_UP_CONTEXT / ENTITY_QUERY / RELATIONSHIP_QUERY / EVIDENCE_QUERY
    # (Fallback query for any case context that requires RAG, graph traversal, or history pronoun tracking)
    if case_id == "all":
        suspects_count = len(unique_entities)
        linkages_count = len(relationships)
        case_summary = f"The global database holds {suspects_count} unique suspects and {linkages_count} linkages across all cases."
    else:
        case_summary = f"Active case file holds {len(entities)} suspects and {len(relationships)} linkages."
        
    try:
        evidence_context = query_case_context(case_id, query)
        if not evidence_context:
            return {
                "answer": "No processed evidence is available for this case yet. Upload and process evidence before asking questions about the case.",
                "actions": [],
                "supporting_evidence": []
            }
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        evidence_context = "Evidence search unavailable."
    
    # We allow the LLM to process FOLLOW_UP_CONTEXT internally using `history_context` and `evidence_context`.
    # To improve intelligence, we also inject a list of known entities into the prompt if there are fewer than 20 entities.
    entity_names = [e["name"] for e in entities[:20]]
    if entity_names:
        case_summary += f" Known entities include: {', '.join(entity_names)}."

    system_persona = (
        "System: You are NEXUS, an elite, highly intelligent AI forensic analyst and investigator. "
        "You analyze case files, suspects, and raw evidence (PDFs, logs). "
        "Provide professional, sharp, and accurate answers based strictly on the provided facts, evidence, and conversation history. "
        "You understand follow-up questions referencing previous messages (e.g. 'he', 'they', 'it'). "
        "Do not hallucinate."
    )
    
    prompt = f"{system_persona}\n\nCase Metrics: {case_summary}\n{history_context}\nEvidence Context: {evidence_context}\n\nQuestion: {query}\nAnswer:"
    answer = call_hf_api(prompt)
    if not answer:
        if case_id == "all":
            answer = f"I am connected to the global NEXUS intelligence database. Currently, we have registered {suspects_count} unique suspect profiles and {linkages_count} connections across all investigation files."
        else:
            answer = f"I am connected to the active investigation database. Currently, we have registered {len(entities)} suspect profiles and {len(relationships)} connections in this case file."
        
    return {
        "answer": answer,
        "actions": [],
        "supporting_evidence": ["Consulted vectorized case evidence in ChromaDB."] if "No specific evidence" not in evidence_context else []
    }

def call_hf_api(prompt: str) -> str:
    """
    Calls Hugging Face Inference Client text generation, handles fallbacks.
    """
    client = get_hf_client()
    if not client:
        return ""
        
    try:
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
