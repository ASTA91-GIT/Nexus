import asyncio
import os
import sys
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

sys.path.append(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
OLLAMA_URL = os.getenv("NEXUS_LOCAL_AI_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("NEXUS_LOCAL_AI_MODEL", "qwen2.5:7b")

async def main():
    print(f"Ollama URL Configured: {OLLAMA_URL}")
    print(f"Ollama Model Configured: {OLLAMA_MODEL}")
    
    print("\nTesting Ollama connection...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": "Return 'OK'",
                    "stream": False
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            print("Ollama Result:", data.get("response", "").strip())
    except Exception as e:
        print("Ollama Test Failed:", str(e))

    print("\nConnecting to MongoDB...")
    db_client = AsyncIOMotorClient(MONGO_URI)
    db = db_client.nexus
    
    evidences = await db.evidence.find({}).to_list(None)
    print(f"\nTotal Evidence Documents: {len(evidences)}")
    for ev in evidences:
        print(f" - Case ID: {ev.get('case_id')}, Title: {ev.get('title')}, Length: {len(ev.get('raw_content', ''))} chars")
        print(f"   Excerpt: {ev.get('raw_content', '')[:100]}...")
        
    db_client.close()

if __name__ == "__main__":
    asyncio.run(main())
