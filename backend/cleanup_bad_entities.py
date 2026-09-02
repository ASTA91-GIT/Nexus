import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import re

async def clean():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.nexus

    print("--- CLEANING DATABASE ENTITIES & RELATIONSHIPS ---")

    # Find entities matching container artifacts or pure evidence filenames
    pattern = r'\[?Content_Types\]?|\_rels/|word/|xl/|docProps/|^pk$|\.xml$|\.rels$|\.bin$'
    bad_entities = await db.entities.find({
        "$or": [
            {"name": {"$regex": pattern, "$options": "i"}},
            {"name": {"$regex": r'^evidence_\d+.*', "$options": "i"}}
        ]
    }).to_list(None)

    bad_ids = [str(e["_id"]) for e in bad_entities]
    print(f"Found {len(bad_entities)} container artifact/filename entities to clean up:")
    for b in bad_entities:
        print(f"  - Removing Entity: '{b.get('name')}' (ID: {b['_id']})")

    if bad_ids:
        # Delete bad entities
        del_ent = await db.entities.delete_many({"_id": {"$in": [b["_id"] for b in bad_entities]}})
        print(f"Deleted {del_ent.deleted_count} entities from MongoDB.")

        # Delete dangling relationships referencing bad entity IDs
        del_rel = await db.relationships.delete_many({
            "$or": [
                {"source_entity_id": {"$in": bad_ids}},
                {"target_entity_id": {"$in": bad_ids}},
                {"source": {"$in": bad_ids}},
                {"target": {"$in": bad_ids}}
            ]
        })
        print(f"Deleted {del_rel.deleted_count} dangling relationships from MongoDB.")

    client.close()

if __name__ == "__main__":
    asyncio.run(clean())
