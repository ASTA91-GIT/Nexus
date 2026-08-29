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
        return {"status": "degraded", "mongodb": False, "error": str(exc)}
    return {"status": "ok" if mongo_ok else "starting", "mongodb": mongo_ok}

# Serve Next.js frontend static build if it exists
frontend_build_dir = os.path.join(os.path.dirname(__file__), "../../frontend/out")
if os.path.exists(frontend_build_dir):
    app.mount("/", StaticFiles(directory=frontend_build_dir, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Welcome to NEXUS API. Frontend build not found at " + frontend_build_dir}



