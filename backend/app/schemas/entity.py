from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class EntityBase(BaseModel):
    case_id: str
    type: str
    name: str
    properties: Optional[Dict[str, Any]] = {}
    description: Optional[str] = ""
    source: Optional[str] = "UNKNOWN"
    notes: Optional[str] = ""
    position: Optional[Dict[str, float]] = None

class EntityCreate(EntityBase):
    pass

class EntityUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    properties: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    position: Optional[Dict[str, float]] = None
    risk_score: Optional[float] = None

class EntityPositionUpdate(BaseModel):
    entity_id: str
    position: Dict[str, float]

class BulkPositionUpdate(BaseModel):
    case_id: str
    positions: list[EntityPositionUpdate]

class EntityOut(EntityBase):
    id: PyObjectId = Field(alias="_id")
    risk_score: float
    created_by: str
    created_at: datetime
    updated_at: datetime
