import pymongo

client = pymongo.MongoClient('mongodb://localhost:27017')
db = client['nexus']

case_id = '6a971ef425f0b38746bbe8e7'
ents = list(db.entities.find({'$or': [{'case_id': case_id}, {'caseId': case_id}]}))

print(f"Starting deduplication for {len(ents)} entities...")
seen = {}
deleted_count = 0
updated_count = 0

for ent in ents:
    ent_id = ent['_id']
    name = str(ent.get('name', '')).strip()
    ent_type = str(ent.get('type', 'PERSON')).upper()
    norm_name = name.lower()
    
    key = (norm_name, ent_type)
    if key in seen:
        db.entities.delete_one({'_id': ent_id})
        deleted_count += 1
        canonical_id = str(seen[key])
        db.relationships.update_many({'source_entity_id': str(ent_id)}, {'$set': {'source_entity_id': canonical_id}})
        db.relationships.update_many({'target_entity_id': str(ent_id)}, {'$set': {'target_entity_id': canonical_id}})
    else:
        seen[key] = ent_id
        db.entities.update_one(
            {'_id': ent_id},
            {'$set': {
                'normalizedName': norm_name,
                'normalizedType': ent_type,
                'caseId': case_id,
                'case_id': case_id
            }}
        )
        updated_count += 1

print(f"Retained: {updated_count} | Deleted Duplicates: {deleted_count}")

# Deduplicate relationships
rels = list(db.relationships.find({'$or': [{'case_id': case_id}, {'caseId': case_id}]}))
print(f"Starting relationship deduplication for {len(rels)} relationships...")
seen_rels = set()
deleted_rels = 0
retained_rels = 0

for rel in rels:
    rel_id = rel['_id']
    src = str(rel.get('source_entity_id'))
    tgt = str(rel.get('target_entity_id'))
    r_type = str(rel.get('type')).upper()
    
    key = (src, tgt, r_type)
    if key in seen_rels:
        db.relationships.delete_one({'_id': rel_id})
        deleted_rels += 1
    else:
        seen_rels.add(key)
        db.relationships.update_one(
            {'_id': rel_id},
            {'$set': {'caseId': case_id, 'case_id': case_id}}
        )
        retained_rels += 1

print(f"Relationship Retained: {retained_rels} | Deleted Duplicates: {deleted_rels}")
print(f"Final entities count for Vinit case: {db.entities.count_documents({'$or': [{'case_id': case_id}, {'caseId': case_id}]})}")
print(f"Final relationships count for Vinit case: {db.relationships.count_documents({'$or': [{'case_id': case_id}, {'caseId': case_id}]})}")
