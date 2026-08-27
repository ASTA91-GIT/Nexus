from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class Entity(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    case_id: str
    type: str # PERSON, PHONE, VEHICLE, ORGANIZATION, LOCATION, ACCOUNT
    name: str
    properties: Dict[str, Any] = {}
    risk_score: float = 0.0
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
