from app.ai.local_llm import generate
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
        messages = [
            {"role": "system", "content": "You are a precise data extraction system that outputs only valid JSON."},
            {"role": "user", "content": EXTRACTION_PROMPT.format(text=process_text)}
        ]
        
        try:
            from app.ai.local_llm import generate
            reply = await generate(
                system_prompt="You are a precise data extraction system that outputs only valid JSON.",
                user_prompt=EXTRACTION_PROMPT.format(text=process_text),
                temperature=0.1,
                max_tokens=4000,
                format="json"
            )
            
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
            print(f"Local AI Extraction API unavailable for chunk ({e}), using pattern extraction fallback...")

        if not chunk_result or (not chunk_result.get("entities") and not chunk_result.get("relationships")):
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

    # General Name pattern for standalone persons
    gen_names = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b', text)
    for gn in gen_names:
        # Ignore if it has more than 3 words or starts with a sentence-starting word
        words = gn.split()
        if len(words) <= 3 and words[0].lower() not in ['the', 'this', 'that', 'a', 'an', 'he', 'she', 'they', 'it', 'we', 'you', 'if', 'when', 'while', 'to', 'for']:
            add_entity(gn, 'PERSON', 'Person', 0.4)

    works_for_matches = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:works\s+for|is\s+employed\s+by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', text)
    for p, o in works_for_matches:
        p_added = add_entity(p, 'PERSON', 'Employee', 0.4)
        o_added = add_entity(o, 'ORGANIZATION', 'Employer', 0.4)
        if p_added and o_added:
            add_rel(p_added, o_added, 'WORKS_FOR', f'{p_added} works for {o_added}')

    # Organizations
    org_matches = re.findall(r'\b((?:[A-Z][a-zA-Z]+\s*){1,4}(?:Systems|Services|Trading|Logistics|Corp|Inc|Ltd|Company|Bank|Hospital|School|College|University|Works|Enterprises))\b', text)
    for org in org_matches:
        if len(org.strip()) > 3:
            add_entity(org, 'ORGANIZATION', 'Organization', 0.5)

    # Locations
    loc_matches = re.findall(r'\b(?:in|at|near|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b', text)
    for loc in loc_matches:
        loc_clean = loc.strip()
        # Filter out common false positives
        if loc_clean.lower() not in ['the', 'this', 'that', 'a', 'an', 'my', 'his', 'her', 'their', 'our'] and len(loc_clean) > 3:
            add_entity(loc_clean, 'LOCATION', 'Location', 0.4)
            
    # Explicit locations list fallback (common cities)
    cities = ['Mumbai', 'Delhi', 'Pune', 'Nashik', 'Nagpur', 'Vashi', 'Andheri', 'Bengaluru', 'Chennai', 'Kolkata']
    for city in cities:
        if re.search(rf'\b{city}\b', text, re.IGNORECASE):
            add_entity(city, 'LOCATION', 'City', 0.4)

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
    
    # Dates / Timelines
    dates = re.findall(r'\b(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\b', text)
    for d in dates:
        add_entity(d, 'DATE', 'Date', 0.3)
        
    times = re.findall(r'\b(\d{1,2}:\d{2}(?:\s*[apAP][mM])?)\b', text)
    for t in times:
        add_entity(t, 'TIME', 'Time', 0.3)

    phone_numbers = re.findall(r'\b(\+?\d{1,3}[-.\s]?\(?\d{1,4}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9})\b', text)
    for ph in phone_numbers:
        # Prevent standard dates, amounts, etc. from being classified as phone numbers
        ph_clean = ph.strip()
        if re.match(r'^\d{2,4}[-/. ]\d{2}[-/. ]\d{2,4}$', ph_clean):
            continue
        if re.match(r'^\d{2}:\d{2}$', ph_clean):
            continue
        if re.match(r'^AC-?\d+$', ph_clean, re.IGNORECASE):
            continue
        if len(re.sub(r'\D', '', ph)) >= 7 and len(re.sub(r'\D', '', ph)) <= 15:
            add_entity(ph, 'PHONE_NUMBER', 'Phone number', 0.5)
            
    emails = re.findall(r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b', text)
    for em in emails:
        add_entity(em, 'EMAIL', 'Email address', 0.5)
        
    amounts = re.findall(r'\b((?:Rs\.?|₹|\$|USD|INR)\s*[\d,]+(?:\.\d{2})?)\b', text, re.IGNORECASE)
    for amt in amounts:
        add_entity(amt, 'FINANCIAL_AMOUNT', 'Financial amount', 0.5)

    accounts = re.findall(r'\b(?:Account|A/c|Acct|AC-)\s*(?:No\.|Number)?\s*[:\-]?\s*([A-Z0-9-]{4,20})\b', text, re.IGNORECASE)
    for acc in accounts:
        add_entity(acc, 'ACCOUNT', 'Account number', 0.7)

    # Documents
    doc_matches = re.findall(r'\b(FIR\s+No\.\s*\d+/\d+|SC\s+No\.\s*\d+/\d+|MLC\s+No\.\s*[\d/]+)\b', text, re.IGNORECASE)
    for doc in doc_matches:
        add_entity(doc, 'DOCUMENT', 'Legal case document', 0.5)

    # Basic generic relationship extraction heuristics based on proximity
    for i, e1 in enumerate(entities):
        if e1["type"] == "PERSON":
            for e2 in entities[i+1:]:
                if e2["type"] == "VEHICLE" and e1["name"].lower() in text.lower() and e2["name"].lower() in text.lower():
                    # Check distance
                    pos1 = text.lower().find(e1["name"].lower())
                    pos2 = text.lower().find(e2["name"].lower())
                    if abs(pos1 - pos2) < 50:
                        add_rel(e1["name"], e2["name"], "USED", f"{e1['name']} associated with {e2['name']}")
                elif e2["type"] == "ACCOUNT" and abs(text.lower().find(e1["name"].lower()) - text.lower().find(e2["name"].lower())) < 50:
                    add_rel(e1["name"], e2["name"], "OWNS", f"{e1['name']} owns {e2['name']}")

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

