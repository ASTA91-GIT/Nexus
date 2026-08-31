import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['nexus']
    cases = await db["cases"].find().to_list(100)
    for c in cases:
        print(c.keys())

asyncio.run(main())
