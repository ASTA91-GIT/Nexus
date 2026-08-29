import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json
import os
from datetime import datetime

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

async def setup_demo_data():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.nexus
    
    # 1. Create Case
    case = {
        "name": "DEMO_TEST_CASE_1",
        "description": "Temporary demo case for graph verification.",
        "status": "OPEN",
        "priority": "LOW",
        "investigator": "admin@nexus-intel.gov",
        "created_by": "admin@nexus-intel.gov",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    case_result = await db.cases.insert_one(case)
    case_id = str(case_result.inserted_id)
    
    # 2. Create Entities
    alice = {
        "case_id": case_id,
        "name": "DEMO_TEST_Alice",
        "type": "PERSON",
        "risk_score": 0.8,
        "properties": {"role": "Suspect"},
        "created_by": "admin@nexus-intel.gov",
        "created_at": datetime.utcnow()
    }
    bob = {
        "case_id": case_id,
        "name": "DEMO_TEST_Bob",
        "type": "PERSON",
        "risk_score": 0.5,
        "properties": {"role": "Associate"},
        "created_by": "admin@nexus-intel.gov",
        "created_at": datetime.utcnow()
    }
    org = {
        "case_id": case_id,
        "name": "DEMO_TEST_Organization",
        "type": "ORGANIZATION",
        "risk_score": 0.9,
        "properties": {"type": "Front Company"},
        "created_by": "admin@nexus-intel.gov",
        "created_at": datetime.utcnow()
    }
    
    alice_result = await db.entities.insert_one(alice)
    bob_result = await db.entities.insert_one(bob)
    org_result = await db.entities.insert_one(org)
    
    alice_id = str(alice_result.inserted_id)
    bob_id = str(bob_result.inserted_id)
    org_id = str(org_result.inserted_id)
    
    # 3. Create Relationships
    rel1 = {
        "case_id": case_id,
        "source_entity_id": alice_id,
        "target_entity_id": bob_id,
        "type": "KNOWS",
        "status": "CONFIRMED",
        "created_by": "admin@nexus-intel.gov",
        "created_at": datetime.utcnow()
    }
    rel2 = {
        "case_id": case_id,
        "source_entity_id": bob_id,
        "target_entity_id": org_id,
        "type": "WORKS_FOR",
        "status": "CONFIRMED",
        "created_by": "admin@nexus-intel.gov",
        "created_at": datetime.utcnow()
    }
    
    r1 = await db.relationships.insert_one(rel1)
    r2 = await db.relationships.insert_one(rel2)
    
    demo_ids = {
        "case_id": case_id,
        "entities": [alice_id, bob_id, org_id],
        "relationships": [str(r1.inserted_id), str(r2.inserted_id)]
    }
    
    with open("demo_ids.json", "w") as f:
        json.dump(demo_ids, f)
        
    print(f"Created demo data successfully! Case ID: {case_id}")

if __name__ == "__main__":
    asyncio.run(setup_demo_data())
