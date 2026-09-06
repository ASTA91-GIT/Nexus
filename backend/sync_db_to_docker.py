"""
Sync data from Local MongoDB (localhost:27017) to Docker MongoDB (localhost:27018)
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def sync_data():
    source_client = AsyncIOMotorClient("mongodb://localhost:27017")
    target_client = AsyncIOMotorClient("mongodb://localhost:27018")
    
    source_db = source_client["nexus"]
    target_db = target_client["nexus"]
    
    print("Testing connection to source (local: 27017)...")
    try:
        await source_client.admin.command("ping")
        print("Connected to source MongoDB.")
    except Exception as e:
        print(f"Source MongoDB error: {e}")
        return

    print("Testing connection to target (Docker: 27018)...")
    try:
        await target_client.admin.command("ping")
        print("Connected to target Docker MongoDB.")
    except Exception as e:
        print(f"Target Docker MongoDB error: {e}")
        return

    collections = await source_db.list_collection_names()
    print(f"Collections to transfer: {collections}")
    
    for coll_name in collections:
        if coll_name.startswith("system."):
            continue
        docs = await source_db[coll_name].find().to_list(length=100000)
        count = len(docs)
        if count == 0:
            print(f"  - {coll_name}: 0 records, skipping.")
            continue
        
        target_count = await target_db[coll_name].count_documents({})
        if target_count > 0:
            print(f"  - {coll_name}: already has {target_count} documents in target. Skipping to avoid overwrite.")
            continue
            
        print(f"  - Copying {count} documents into {coll_name}...")
        await target_db[coll_name].insert_many(docs)
        print(f"    [OK] {coll_name} migrated successfully.")

    print("\nDatabase sync completed successfully!")

if __name__ == "__main__":
    asyncio.run(sync_data())
