from app.ai.model_manager import hf_client
from typing import Dict, Any, List
import json
import re

EXTRACTION_PROMPT = """
You are an expert intelligence analyst. Your task is to extract meaningful investigation entities and their relationships from the provided evidence text. 

CRITICAL RULES:
1. STRICTLY extract ONLY entities that are EXPLICITLY mentioned in the text. Do NOT hallucinate, infer, or guess entities that are not present.
2. Ensure that the identified text actually represents a specific, named entity (e.g., "John Smith" not "a man", "Apple Inc" not "a company").
3. Assign each entity to one of the strictly supported types below. If an entity does not fit, do NOT extract it.
4. Extract relationships ONLY if they are explicitly stated or clearly implied by the text.

Supported Entity Types:
- PERSON
- ORGANIZATION
- LOCATION
- COMMUNICATION
- ACCOUNT
- VEHICLE
- PHONE_NUMBER
- EMAIL
- EVENT
- DOCUMENT

Instructions:
1. Identify all key entities in the text matching the supported types.
2. Identify relationships between these entities (e.g., PERSON "KNOWS" PERSON, PERSON "WORKS_FOR" ORGANIZATION).
3. Return the result strictly as a JSON object with two keys: "entities" and "relationships".
4. Do not include markdown formatting, explanations, or any other text outside the JSON object.

JSON Format:
{{
  "entities": [
    {{
      "name": "Entity Name",
      "type": "ENTITY_TYPE",
      "description": "Brief description based on text",
      "risk_score": 0.5
    }}
  ],
  "relationships": [
    {{
      "source": "Source Entity Name",
      "target": "Target Entity Name",
      "type": "RELATIONSHIP_TYPE",
      "description": "Brief description of connection"
    }}
  ]
}}

Text to analyze:
{text}
"""

async def extract_entities_and_relationships(text: str) -> Dict[str, Any]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=5500, chunk_overlap=200, length_function=len)
    chunks = text_splitter.split_text(text)
    
    all_entities = []
    all_relationships = []
    seen_entity_keys = set()
    seen_rel_keys = set()

    for process_text in chunks:
        chunk_result = None
        if hf_client:
            messages = [
                {"role": "system", "content": "You are a precise data extraction system that outputs only valid JSON."},
                {"role": "user", "content": EXTRACTION_PROMPT.format(text=process_text)}
            ]
            
            try:
                import asyncio
                response = await asyncio.to_thread(
                    hf_client.chat_completion,
                    messages=messages,
                    model="Qwen/Qwen2.5-72B-Instruct",
                    max_tokens=4000,
                    temperature=0.1
                )
                
                reply = response.choices[0].message.content.strip()
                
                if reply.startswith("```"):
                    reply = re.sub(r"^```(?:json)?\n?", "", reply)
                    reply = re.sub(r"\n?```$", "", reply)
                    
                start_idx = reply.find("{")
                end_idx = reply.rfind("}")
                
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    reply = reply[start_idx:end_idx+1]
                    
                data = json.loads(reply)
                
                chunk_result = {
                    "entities": data.get("entities", []),
                    "relationships": data.get("relationships", [])
                }
                
            except Exception as e:
                print(f"Hugging Face AI Extraction API unavailable for chunk ({e}), using pattern extraction fallback...")

        if not chunk_result:
            import asyncio
            chunk_result = await asyncio.to_thread(extract_entities_and_relationships_fallback, process_text)

        for ent in chunk_result.get("entities", []):
            ekey = (ent.get("name", "").strip().lower(), ent.get("type", "").strip().upper())
            if ekey not in seen_entity_keys and ekey[0]:
                seen_entity_keys.add(ekey)
                all_entities.append(ent)
                
        for rel in chunk_result.get("relationships", []):
            rkey = (rel.get("source", "").strip().lower(), rel.get("target", "").strip().lower(), rel.get("type", "").strip().upper())
            if rkey not in seen_rel_keys and rkey[0] and rkey[1] and rkey[0] != rkey[1]:
                seen_rel_keys.add(rkey)
                all_relationships.append(rel)

    return {
        "entities": all_entities,
        "relationships": all_relationships
    }

def clean_entity_name(name: str) -> str:
    c = re.sub(r'\s+', ' ', name).strip()
    c = re.sub(r'\s+(?:Wife|Husband|Father|Mother|Son|Daughter|Injured|Accused|Complainant|Victim|Witness|Constable|Employee|Friend|Security Guard|He|She|Delhi|PW-\d+)\b', '', c, flags=re.IGNORECASE)
    return c.strip()

def extract_entities_and_relationships_fallback(text: str) -> Dict[str, Any]:
    entities = []
    relationships = []
    seen_entities = {}
    
    def add_entity(name: str, ent_type: str, desc: str = "", risk: float = 0.5):
        cname = clean_entity_name(name)
        if not cname or len(cname) < 3: return None
        if any(w in cname.lower() for w in ['court', 'section', 'state vs', 'page', 'prosecution', 'defence', 'statement', 'exhibit', 'versus', 'learned']):
            if ent_type == 'PERSON': return None
            
        key = (cname.lower(), ent_type.upper())
        if key not in seen_entities:
            ent = {
                "name": cname,
                "type": ent_type.upper(),
                "description": desc,
                "risk_score": risk
            }
            seen_entities[key] = ent
            entities.append(ent)
            return cname
        return seen_entities[key]["name"]

    def add_rel(src: str, tgt: str, rel_type: str, desc: str = ""):
        csrc = clean_entity_name(src)
        ctgt = clean_entity_name(tgt)
        if csrc and ctgt and csrc.lower() != ctgt.lower():
            relationships.append({
                "source": csrc,
                "target": ctgt,
                "type": rel_type.upper(),
                "description": desc
            })

    # Persons
    persons = set()
    person_matches = re.findall(r'\b(?:Accused|Complainant|Witness|Victim|Judge|Ms\.|Mr\.|Sh\.|Smt\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
    for p in person_matches:
        added = add_entity(p, 'PERSON', 'Person identified in case document', 0.6)
        if added: persons.add(added)
        
    so_matches = re.findall(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:S/o|D/o|W/o)\s+(?:Late\s+)?(?:Sh\.|Smt\.|Mr\.|Ms\.)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
    for son, father in so_matches:
        s_added = add_entity(son, 'PERSON', 'Subject/Accused', 0.7)
        f_added = add_entity(father, 'PERSON', 'Parent/Family Member', 0.3)
        if s_added and f_added:
            persons.add(s_added)
            persons.add(f_added)
            add_rel(s_added, f_added, 'FAMILY_RELATION', f'{s_added} is related to {f_added}')

    # Vehicles
    vehicles = set()
    plates = re.findall(r'\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,4}[-\s]?\d{4})\b', text)
    for plate in plates:
        v_added = add_entity(plate, 'VEHICLE', 'Vehicle registration plate', 0.8)
        if v_added: vehicles.add(v_added)

    # Weapons
    weapons = set()
    w_matches = re.findall(r'\b((?:Pistol|Revolver|Rifle|Country-made\s+Pistol|Katta|Knife)\s*(?:No\.|number|bearing\s+number)?\s*[\d/]*)\b', text, re.IGNORECASE)
    for w in w_matches:
        if len(w.strip()) > 3:
            w_added = add_entity(w, 'WEAPON', 'Seized weapon/ammunition', 0.9)
            if w_added: weapons.add(w_added)

    # Generic pattern-based entities
    phone_numbers = re.findall(r'\b(\+?\d{1,3}[-.\s]?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})\b', text)
    for ph in phone_numbers:
        # Prevent standard dates from being classified as phone numbers
        if re.match(r'^\d{2,4}[-/. ]\d{2}[-/. ]\d{2,4}$', ph.strip()):
            continue
        if len(re.sub(r'\D', '', ph)) >= 7:
            add_entity(ph, 'PHONE_NUMBER', 'Phone number', 0.5)
            
    emails = re.findall(r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b', text)
    for em in emails:
        add_entity(em, 'EMAIL', 'Email address', 0.5)
        
    amounts = re.findall(r'\b((?:Rs\.?|₹|\$|USD|INR)\s*[\d,]+(?:\.\d{2})?)\b', text, re.IGNORECASE)
    for amt in amounts:
        add_entity(amt, 'FINANCIAL_AMOUNT', 'Financial amount', 0.5)

    accounts = re.findall(r'\b(?:Account|A/c|Acct)\s*(?:No\.|Number)?\s*[:\-]?\s*([A-Z0-9-]{6,20})\b', text, re.IGNORECASE)
    for acc in accounts:
        add_entity(acc, 'ACCOUNT', 'Account number', 0.7)

    # Documents
    doc_matches = re.findall(r'\b(FIR\s+No\.\s*\d+/\d+|SC\s+No\.\s*\d+/\d+|MLC\s+No\.\s*[\d/]+)\b', text, re.IGNORECASE)
    for doc in doc_matches:
        add_entity(doc, 'DOCUMENT', 'Legal case document', 0.5)

    return {"entities": entities, "relationships": relationships}

# For backward compatibility if anything else calls the old function
async def extract_entities(text: str) -> List[Dict]:
    res = await extract_entities_and_relationships(text)
    if "error" in res and not res.get("entities"):
        return [{"error": res["error"]}]
        
    old_format = []
    for ent in res.get("entities", []):
        old_format.append({
            "word": ent.get("name"),
            "entity_group": ent.get("type"),
            "score": ent.get("risk_score", 0.5)
        })
    return old_format

