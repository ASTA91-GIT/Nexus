import asyncio
import motor.motor_asyncio

async def verify():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.nexus
    print('Cases:', await db.cases.count_documents({}))
    print('Entities:', await db.entities.count_documents({}))
    print('Relationships:', await db.relationships.count_documents({}))
    print('Evidence:', await db.evidence.count_documents({}))

asyncio.run(verify())
