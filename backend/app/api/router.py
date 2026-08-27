from fastapi import APIRouter
from app.api.routes import auth, cases, entities, relationships, evidence, ingestion, ai, network, analytics, alerts, chat

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(entities.router, prefix="/entities", tags=["entities"])
api_router.include_router(relationships.router, prefix="/relationships", tags=["relationships"])
api_router.include_router(evidence.router, prefix="/evidence", tags=["evidence"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["ingestion"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(network.router, prefix="/network", tags=["network"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
