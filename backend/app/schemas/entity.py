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

class EntityCreate(EntityBase):
    pass

class EntityOut(EntityBase):
    id: PyObjectId = Field(alias="_id")
    risk_score: float
    created_by: str
    created_at: datetime
    updated_at: datetime
