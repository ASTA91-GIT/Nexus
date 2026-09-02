import asyncio
import pymongo
from datetime import datetime
from bson import ObjectId
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from app.ai.entity_extraction import extract_entities_and_relationships
from app.services.data_processing.pipeline import process_entity_data

async def main():
    client = pymongo.MongoClient('mongodb://localhost:27017')
    db = client['nexus']

    # 1. Dynamically locate canonical case for "State VS Vinit"
    case = db.cases.find_one({'name': {'$regex': 'Vinit', '$options': 'i'}})
    if not case:
        case = db.cases.find_one({'title': {'$regex': 'Vinit', '$options': 'i'}})
    
    if not case:
        print("ERROR: Case 'State VS Vinit' not found in MongoDB cases collection.")
        return

    case_id = str(case['_id'])
    case_name = case.get('name') or case.get('title')
    print(f"Found canonical Case: '{case_name}' with case_id: '{case_id}'")

    # 2. Find evidence records for this case
    evidences = list(db.evidence.find({'$or': [{'case_id': case_id}, {'caseId': case_id}]}))
    print(f"Found {len(evidences)} evidence records for case {case_id}")

    total_entities_inserted = 0
    total_relationships_inserted = 0

    for ev in evidences:
        ev_id = str(ev['_id'])
        raw_text = ev.get('raw_content', '')
        print(f"\nProcessing evidence document {ev_id} ({ev.get('title')}), raw_text len: {len(raw_text)}")

        if not raw_text or raw_text.startswith("Processing") or len(raw_text) < 10:
            print("  Skipping evidence with empty/invalid content.")
            continue

        ai_results = await extract_entities_and_relationships(raw_text)
        extracted_ents = ai_results.get('entities', [])
        extracted_rels = ai_results.get('relationships', [])
        print(f"  Extracted {len(extracted_ents)} entities, {len(extracted_rels)} relationships")

        entity_name_to_id = {}

        # Process and deduplicate entities using canonical process_entity_data
        for ent in extracted_ents:
            ent_name = ent.get('name', '').strip()
            if not ent_name: continue
            ent_type = str(ent.get('type', 'PERSON')).upper()

            ent_doc = {
                "case_id": case_id,
                "type": ent_type,
                "name": ent_name,
                "properties": {"description": ent.get("description", "")},
                "risk_score": float(ent.get("risk_score", 0.0)),
                "source": "AI_EXTRACTED",
                "created_by": ev.get("created_by", "system"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Canonical deduplication & normalization via process_entity_data
            processed_ent = await process_entity_data(db, ent_doc, case_id, mode="APPLY")
            norm_name = processed_ent.get("normalizedName") or ent_name.lower().strip()

            existing = db.entities.find_one({
                "$or": [{"case_id": case_id}, {"caseId": case_id}],
                "normalizedName": norm_name
            })

            if not existing:
                res = db.entities.insert_one(processed_ent)
                ent_id_str = str(res.inserted_id)
                entity_name_to_id[ent_name.lower()] = ent_id_str
                total_entities_inserted += 1
                print(f"    [NEW ENTITY] {ent_name} ({ent_type}) -> ID: {ent_id_str}")
            else:
                ent_id_str = str(existing['_id'])
                entity_name_to_id[ent_name.lower()] = ent_id_str
                print(f"    [EXISTING ENTITY DEDUPLICATED] {ent_name} -> ID: {ent_id_str}")

        # Process and deduplicate relationships
        for rel in extracted_rels:
            source_name = rel.get("source", "").strip().lower()
            target_name = rel.get("target", "").strip().lower()
            source_id = entity_name_to_id.get(source_name)
            target_id = entity_name_to_id.get(target_name)

            if source_id and target_id and source_id != target_id:
                rel_type = str(rel.get("type", "ASSOCIATED_WITH")).upper()
                existing_rel = db.relationships.find_one({
                    "$or": [{"case_id": case_id}, {"caseId": case_id}],
                    "source_entity_id": source_id,
                    "target_entity_id": target_id,
                    "type": rel_type
                })

                if not existing_rel:
                    rel_doc = {
                        "case_id": case_id,
                        "caseId": case_id,
                        "source_entity_id": source_id,
                        "target_entity_id": target_id,
                        "type": rel_type,
                        "properties": {"description": rel.get("description", "")},
                        "evidence_ids": [ev_id],
                        "source": "AI_EXTRACTED",
                        "created_by": ev.get("created_by", "system"),
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    db.relationships.insert_one(rel_doc)
                    total_relationships_inserted += 1
                    print(f"    [NEW RELATIONSHIP] {source_name} --({rel_type})--> {target_name}")

        # Update evidence processing status
        db.evidence.update_one(
            {"_id": ObjectId(ev_id)},
            {"$set": {
                "processing_status": "COMPLETED",
                "extraction_status": "SUCCESS"
            }}
        )

    print(f"\nBackfill completed for case '{case_name}' ({case_id}):")
    print(f"  Total New Entities Inserted: {total_entities_inserted}")
    print(f"  Total New Relationships Inserted: {total_relationships_inserted}")
    print(f"  Current Entities Count in Mongo: {db.entities.count_documents({'$or': [{'case_id': case_id}, {'caseId': case_id}]})}")
    print(f"  Current Relationships Count in Mongo: {db.relationships.count_documents({'$or': [{'case_id': case_id}, {'caseId': case_id}]})}")

if __name__ == "__main__":
    asyncio.run(main())
