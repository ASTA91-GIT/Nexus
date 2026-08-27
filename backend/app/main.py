from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.router import api_router
import os

app = FastAPI(title="NEXUS Investigation API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since we are serving on the same port, this can be relaxed
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

# Serve Next.js frontend static build if it exists
frontend_build_dir = os.path.join(os.path.dirname(__file__), "../../frontend/out")
if os.path.exists(frontend_build_dir):
    app.mount("/", StaticFiles(directory=frontend_build_dir, html=True), name="frontend")
else:
    @app.get("/")
    async def root():
        return {"message": "Welcome to NEXUS API. Frontend build not found at " + frontend_build_dir}



