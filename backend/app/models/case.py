from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from bson import ObjectId
from app.models.user import PyObjectId

class Case(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    status: str = "OPEN"
    created_by: str  # user email or ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }
