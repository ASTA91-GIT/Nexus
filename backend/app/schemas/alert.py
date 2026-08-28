from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.user import PyObjectId

class AlertBase(BaseModel):
    case_id: str
    entity_id: Optional[str] = None
    type: str
    severity: str
    message: str
    status: str = "ACTIVE"

class AlertCreate(AlertBase):
    pass

class AlertOut(AlertBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }
