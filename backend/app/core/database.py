from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "nexus"
    JWT_SECRET: str = "supersecretkey"
    HUGGINGFACE_API_KEY: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_state = Database()

async def connect_to_mongo():
    db_state.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_state.db = db_state.client[settings.DATABASE_NAME]
    print(f"Connected to MongoDB at {settings.MONGODB_URI}, Database: {settings.DATABASE_NAME}")

async def close_mongo_connection():
    if db_state.client:
        db_state.client.close()
        print("Closed MongoDB connection")

def get_database():
    return db_state.db
