import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['nexus']
    collections = await db.list_collection_names()
    counts = {}
    for c in collections:
        counts[c] = await db[c].count_documents({})
    print(counts)

asyncio.run(main())
