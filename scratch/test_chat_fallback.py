import os
import sys
import re

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

import pymongo
from app.services.rag_service import query_case_context

client = pymongo.MongoClient('mongodb://localhost:27017')
db = client['nexus']

vinit_cid = '6a971ef425f0b38746bbe8e7'
entities = list(db.entities.find({'$or': [{'case_id': vinit_cid}, {'caseId': vinit_cid}]}))
relationships = list(db.relationships.find({'$or': [{'case_id': vinit_cid}, {'caseId': vinit_cid}]}))

def generate_fallback_answer(query: str, case_id: str, entities: list, relationships: list, evidence_context: str) -> str:
    query_words = [w.lower() for w in re.findall(r'\b[a-zA-Z0-9]+\b', query) if len(w) > 2 and w.lower() not in ['who', 'what', 'where', 'when', 'how', 'why', 'is', 'are', 'the', 'this', 'that', 'for', 'about']]
    
    # 1. Search evidence context for matching sentences
    matching_sentences = []
    if evidence_context:
        lines = [line.strip() for line in evidence_context.split('\n') if line.strip()]
        for line in lines:
            line_lower = line.lower()
            if any(qw in line_lower for qw in query_words):
                # Clean up line numbers or boilerplate if present
                clean_line = re.sub(r'^\d+\.\s*', '', line)
                if clean_line not in matching_sentences:
                    matching_sentences.append(clean_line)
                    
    # 2. Search matching entities in MongoDB
    matching_entities = []
    for ent in entities:
        ent_name = ent.get('name', '')
        if any(qw in ent_name.lower() for qw in query_words):
            matching_entities.append(ent)
            
    # 3. Build response
    if matching_sentences:
        answer = f"Based on investigation evidence:\n\n"
        answer += "\n".join([f"• {s}" for s in matching_sentences[:4]])
        if matching_entities:
            ent_summary = ", ".join([f"{e['name']} ({e.get('type', 'ENTITY')})" for e in matching_entities[:3]])
            answer += f"\n\nAssociated Entity Profile(s): {ent_summary}."
        return answer

    if matching_entities:
        ent = matching_entities[0]
        ent_name = ent.get('name')
        ent_type = ent.get('type', 'ENTITY')
        desc = ent.get('properties', {}).get('description') or ent.get('description', '')
        risk = ent.get('risk_score', 0.5)
        
        answer = f"Suspect/Entity Profile: **{ent_name}** ({ent_type})\n"
        if desc:
            answer += f"Description: {desc}\n"
        answer += f"Threat Risk Score: {risk:.2f}\n"
        
        # Find related entities
        ent_id = str(ent['_id'])
        rel_strs = []
        for r in relationships:
            src = str(r.get('source_entity_id'))
            tgt = str(r.get('target_entity_id'))
            r_type = r.get('type', 'LINKED')
            if src == ent_id or tgt == ent_id:
                other_id = tgt if src == ent_id else src
                other_ent = next((e for e in entities if str(e['_id']) == other_id), None)
                if other_ent:
                    rel_strs.append(f"{r_type} -> {other_ent['name']}")
        if rel_strs:
            answer += f"Connections: {', '.join(rel_strs[:5])}."
        return answer

    return f"No specific evidence or entity matching '{query}' was found in the current investigation records for this case."

query = "who is mohit delivery"
ev_ctx = query_case_context(vinit_cid, query)
ans = generate_fallback_answer(query, vinit_cid, entities, relationships, ev_ctx)
print("=== FALLBACK ANSWER OUTPUT FOR QUERY: '" + query + "' ===")
print(ans)
