from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.user import PyObjectId

class EvidenceBase(BaseModel):
    case_id: str
    title: str
    source_type: str
    file_path: Optional[str] = None
    raw_content: Optional[str] = None

class EvidenceCreate(EvidenceBase):
    pass

class EvidenceOut(EvidenceBase):
    id: PyObjectId = Field(alias="_id")
    created_by: str
    created_at: datetime
