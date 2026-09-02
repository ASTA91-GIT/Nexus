from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "nexus"
    JWT_SECRET: str = "supersecretkey"
    HUGGINGFACE_API_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = (".env", "../.env")
        extra = "ignore"

import os
settings = Settings()

if os.getenv("ENVIRONMENT") == "production" and settings.JWT_SECRET == "supersecretkey":
    raise RuntimeError("Insecure JWT_SECRET in production! Please configure it securely.")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_state = Database()

async def ensure_indexes():
    if db_state.db is not None:
        try:
            await db_state.db["entities"].create_index("case_id", background=True)
            await db_state.db["entities"].create_index("caseId", background=True)
            await db_state.db["relationships"].create_index("case_id", background=True)
            await db_state.db["relationships"].create_index("caseId", background=True)
            await db_state.db["relationships"].create_index("source_entity_id", background=True)
            await db_state.db["relationships"].create_index("target_entity_id", background=True)
            await db_state.db["evidence"].create_index("case_id", background=True)
            await db_state.db["evidence"].create_index("caseId", background=True)
            await db_state.db["alerts"].create_index("case_id", background=True)
            await db_state.db["alerts"].create_index("caseId", background=True)
            await db_state.db["timeline"].create_index("case_id", background=True)
            await db_state.db["timeline"].create_index("caseId", background=True)
            print("[DATABASE] Successfully created/verified background indexes for performance.")
        except Exception as e:
            print(f"[DATABASE] Index creation notice: {e}")

async def connect_to_mongo():
    db_state.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_state.db = db_state.client[settings.DATABASE_NAME]
    print(f"Connected to MongoDB at {settings.MONGODB_URI}, Database: {settings.DATABASE_NAME}")
    await ensure_indexes()

async def close_mongo_connection():
    if db_state.client:
        db_state.client.close()
        print("Closed MongoDB connection")

def get_database():
    return db_state.db
