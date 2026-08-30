import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from huggingface_hub import InferenceClient

sys.path.append(os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")

async def main():
    print(f"HF_API_KEY Loaded: {'Yes' if HF_API_KEY else 'No'} ({HF_API_KEY[:5]}...)")
    
    if HF_API_KEY:
        try:
            client = InferenceClient(token=HF_API_KEY)
            print("Testing meta-llama/Llama-3.2-3B-Instruct...")
            response = client.chat_completion(
                messages=[{"role": "user", "content": "Return 'OK'"}],
                model="meta-llama/Llama-3.2-3B-Instruct",
                max_tokens=10
            )
            print("Llama-3.2-3B-Instruct Result:", response.choices[0].message.content.strip())
        except Exception as e:
            print("Llama-3.2-3B-Instruct Failed:", str(e))
            
            print("\nTesting mistralai/Mistral-Nemo-Instruct-2407...")
            try:
                response = client.chat_completion(
                    messages=[{"role": "user", "content": "Return 'OK'"}],
                    model="mistralai/Mistral-Nemo-Instruct-2407",
                    max_tokens=10
                )
                print("Mistral-Nemo Result:", response.choices[0].message.content.strip())
            except Exception as e2:
                print("Mistral-Nemo Failed:", str(e2))
                
            print("\nTesting Qwen/Qwen2.5-72B-Instruct...")
            try:
                response = client.chat_completion(
                    messages=[{"role": "user", "content": "Return 'OK'"}],
                    model="Qwen/Qwen2.5-72B-Instruct",
                    max_tokens=10
                )
                print("Qwen2.5-72B Result:", response.choices[0].message.content.strip())
            except Exception as e3:
                print("Qwen2.5-72B Failed:", str(e3))

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
