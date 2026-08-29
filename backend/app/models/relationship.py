from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class Relationship(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    case_id: str
    source_entity_id: str
    target_entity_id: str
    type: str # CALLED, MET, TRANSFERRED_MONEY, WORKED_FOR
    properties: Dict[str, Any] = {}
    description: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    confidence: Optional[float] = 1.0
    evidence_ids: list[str] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }
