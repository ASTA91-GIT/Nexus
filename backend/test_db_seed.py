import asyncio
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.services.presentation_fallback_data import setup_presentation_cases

async def run_test():
    await connect_to_mongo()
    db = get_database()
    await setup_presentation_cases(db)
    # Run again to test idempotency
    await setup_presentation_cases(db)
    
    # Check count
    r = await db["cases"].count_documents({"_id": "CASE-RIVERFRONT-001"})
    print("Riverfront case count:", r)
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_test())
