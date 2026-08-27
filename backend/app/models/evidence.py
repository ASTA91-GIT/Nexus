from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.models.user import PyObjectId

class Evidence(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    case_id: str
    title: str
    source_type: str # CSV, PDF, TXT, MANUAL
    file_path: Optional[str] = None
    raw_content: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
