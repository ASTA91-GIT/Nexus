from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.api.router import api_router
import os

app = FastAPI(title="NEXUS Investigation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    try:
        from app.services.presentation_fallback_data import setup_presentation_cases
        await setup_presentation_cases(get_database())
    except Exception as e:
        print(f"[NEXUS] Could not initialize presentation cases: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

@app.get("/api/health")
async def health():
    db = get_database()
    mongo_ok = False
    try:
        if db is not None:
            await db.command("ping")
            mongo_ok = True
    except Exception as exc:
        print(f"MongoDB health check failed: {exc}")
        
    local_ai_server_ready = False
    local_ai_model_ready = False
    
    import httpx
    ollama_url = os.getenv("NEXUS_LOCAL_AI_URL", "http://localhost:11434")
    model = os.getenv("NEXUS_LOCAL_AI_MODEL", "qwen2.5:7b")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{ollama_url}/api/tags", timeout=2.0)
            if resp.status_code == 200:
                local_ai_server_ready = True
                models = resp.json().get("models", [])
                if any(m.get("name") == model or m.get("name") == model + ":latest" for m in models):
                    local_ai_model_ready = True
    except Exception as exc:
        print(f"Ollama health check failed: {exc}")
        
    status = "ok" if (mongo_ok and local_ai_server_ready and local_ai_model_ready) else "degraded"
    
    return {
        "status": status,
        "APPLICATION_READY": True,
        "DATABASE_READY": mongo_ok,
        "LOCAL_AI_SERVER_READY": local_ai_server_ready,
        "LOCAL_AI_MODEL_READY": local_ai_model_ready
    }

# Serve Next.js frontend static build if it exists
frontend_build_dir = os.path.join(os.path.dirname(__file__), "../../frontend/out")
if os.path.exists(frontend_build_dir):
    app.mount("/", StaticFiles(directory=frontend_build_dir, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Welcome to NEXUS API. Frontend build not found at " + frontend_build_dir}



