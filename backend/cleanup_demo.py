import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

async def cleanup_demo_data():
    if not os.path.exists("demo_ids.json"):
        print("No demo_ids.json found.")
        return
        
    with open("demo_ids.json", "r") as f:
        demo_ids = json.load(f)
        
    client = AsyncIOMotorClient(MONGO_URI)
    db = client.nexus
    
    # Delete exact IDs
    await db.cases.delete_one({"_id": ObjectId(demo_ids["case_id"])})
    
    for eid in demo_ids["entities"]:
        await db.entities.delete_one({"_id": ObjectId(eid)})
        
    for rid in demo_ids["relationships"]:
        await db.relationships.delete_one({"_id": ObjectId(rid)})
        
    print("Cleanup successful. Deleted exactly:")
    print(f"- Case: {demo_ids['case_id']}")
    print(f"- Entities: {len(demo_ids['entities'])}")
    print(f"- Relationships: {len(demo_ids['relationships'])}")
    
    # Remove the file itself
    os.remove("demo_ids.json")

if __name__ == "__main__":
    asyncio.run(cleanup_demo_data())
