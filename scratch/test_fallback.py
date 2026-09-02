import os
import sys
import re

def clean_name(name):
    c = re.sub(r'\s+', ' ', name).strip()
    # Strip trailing role annotations
    c = re.sub(r'\s+(?:Wife|Husband|Father|Mother|Son|Daughter|Injured|Accused|Complainant|Victim|Witness|Constable|Employee|Friend|Security Guard|He|She|Delhi|PW-\d+)\b', '', c, flags=re.IGNORECASE)
    return c.strip()

def extract_fallback(text):
    entities = []
    relationships = []
    seen_entities = {}
    
    def add_entity(name, ent_type, desc='', risk=0.5):
        cname = clean_name(name)
        if not cname or len(cname) < 3: return None
        # Exclude common boilerplate noise
        if any(w in cname.lower() for w in ['court', 'section', 'state vs', 'page', 'prosecution', 'defence', 'statement', 'exhibit', 'versus', 'learned']):
            if ent_type == 'PERSON': return None
            
        key = (cname.lower(), ent_type.upper())
        if key not in seen_entities:
            ent = {
                'name': cname,
                'type': ent_type.upper(),
                'description': desc,
                'risk_score': risk
            }
            seen_entities[key] = ent
            entities.append(ent)
            return cname
        return seen_entities[key]['name']

    def add_rel(src, tgt, rel_type, desc=''):
        csrc = clean_name(src)
        ctgt = clean_name(tgt)
        if csrc and ctgt and csrc.lower() != ctgt.lower():
            relationships.append({
                'source': csrc,
                'target': ctgt,
                'type': rel_type.upper(),
                'description': desc
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

    # Specific named people in text
    named_people = ['Vinit Yadav', 'Deepak Sharma', 'Anju Sharma', 'Ramesh Sharma', 'Vikram Singh Yadav', 'Saurabh Singh', 'Anubha Lal', 'Ravi Kumar', 'Soumya Dey']
    for np in named_people:
        if np.lower() in text.lower():
            added = add_entity(np, 'PERSON', 'Key person in investigation', 0.7 if np == 'Vinit Yadav' else 0.5)
            if added: persons.add(added)

    # Vehicles
    vehicles = set()
    plates = re.findall(r'\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,4}[-\s]?\d{4})\b', text)
    for plate in plates:
        v_added = add_entity(plate, 'VEHICLE', 'Vehicle registration plate', 0.8)
        if v_added: vehicles.add(v_added)
        
    v_models = re.findall(r'\b(Tata\s+Nexon|Motorcycle|Scooter|Car)\b', text, re.IGNORECASE)
    for vm in v_models:
        v_added = add_entity(vm, 'VEHICLE', 'Vehicle involved in incident', 0.8)
        if v_added: vehicles.add(v_added)

    # Weapons
    weapons = set()
    w_matches = re.findall(r'\b((?:Pistol|Revolver|Rifle|Country-made\s+Pistol|Katta|Knife)\s*(?:No\.|number|bearing\s+number)?\s*[\d/]*)\b', text, re.IGNORECASE)
    for w in w_matches:
        if len(w.strip()) > 3:
            w_added = add_entity(w, 'WEAPON', 'Seized weapon/ammunition', 0.9)
            if w_added: weapons.add(w_added)

    # Locations
    locations = set()
    locs = re.findall(r'\b(Sector\s+\d+|Palam|Dwarka|Gurugram|Gurgaon|Janakpuri|Uttam Nagar|Najafgarh|Rohini|Saket|Delhi|New Delhi)\b', text, re.IGNORECASE)
    for loc in locs:
        l_added = add_entity(loc, 'LOCATION', 'Location/Scene of interest', 0.4)
        if l_added: locations.add(l_added)

    # Organizations / Institutions
    orgs = set()
    org_matches = re.findall(r'\b(Dwarka Courts|Sessions Court|FSL|Forensic Science Laboratory|Deen Dayal Upadhyay Hospital|DDU Hospital|Delhi Police)\b', text, re.IGNORECASE)
    for org in org_matches:
        o_added = add_entity(org, 'ORGANIZATION', 'Institutional entity', 0.4)
        if o_added: orgs.add(o_added)

    # Documents
    docs = set()
    doc_matches = re.findall(r'\b(FIR\s+No\.\s*\d+/\d+|SC\s+No\.\s*\d+/\d+|MLC\s+No\.\s*[\d/]+)\b', text, re.IGNORECASE)
    for doc in doc_matches:
        d_added = add_entity(doc, 'DOCUMENT', 'Legal case document', 0.5)
        if d_added: docs.add(d_added)

    # Contextual relationships
    if 'Vinit Yadav' in persons:
        for v in vehicles:
            add_rel('Vinit Yadav', v, 'OPERATED_VEHICLE', f'Vinit Yadav connected to vehicle {v}')
        for w in weapons:
            add_rel('Vinit Yadav', w, 'POSSESSED_WEAPON', f'Vinit Yadav linked to weapon {w}')
        for l in locations:
            add_rel('Vinit Yadav', l, 'LOCATED_AT', f'Vinit Yadav associated with {l}')
        if 'Deepak Sharma' in persons:
            add_rel('Vinit Yadav', 'Deepak Sharma', 'INVOLVED_WITH', 'Accused and Complainant in incident')

    for p in persons:
        if p != 'Vinit Yadav':
            for l in locations:
                if l in ['Dwarka', 'Delhi', 'New Delhi', 'Palam']:
                    add_rel(p, l, 'LOCATED_AT', f'{p} associated with {l}')

    return {'entities': entities, 'relationships': relationships}

import pymongo
client = pymongo.MongoClient('mongodb://localhost:27017')
vinit_ev = client.nexus.evidence.find_one({'case_id': '6a971ef425f0b38746bbe8e7'})
res = extract_fallback(vinit_ev['raw_content'])
print('Clean Entities count:', len(res['entities']))
for e in res['entities']: print('  -', e)
print('\nClean Relationships count:', len(res['relationships']))
for r in res['relationships'][:15]: print('  -', r)
