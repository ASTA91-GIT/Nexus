from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from app.api.routes.auth import get_current_user
from app.ai.entity_extraction import extract_entities
from app.ai.summarization import summarize_text

router = APIRouter()

class TextPayload(BaseModel):
    text: str

@router.post("/extract-entities")
async def api_extract_entities(payload: TextPayload, current_user=Depends(get_current_user)):
    results = await extract_entities(payload.text)
    return {"entities": results}

@router.post("/summarize")
async def api_summarize(payload: TextPayload, current_user=Depends(get_current_user)):
    summary = await summarize_text(payload.text)
    return {"summary": summary}
