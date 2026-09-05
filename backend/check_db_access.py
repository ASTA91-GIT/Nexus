import asyncio
import motor.motor_asyncio

async def run():
    db = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')['nexus']
    user = await db.users.find_one({'email': 'ramkhandekar8@gmail.com'})
    print('User:', user)
    case = await db.cases.find_one({})
    print('Case:', case)

asyncio.run(run())
