from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "OPEN"

class CaseCreate(CaseBase):
    pass

class CaseOut(CaseBase):
    id: str = Field(alias="_id")
    created_by: str
    created_at: datetime
    updated_at: datetime
