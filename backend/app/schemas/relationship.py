from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class RelationshipBase(BaseModel):
    case_id: str
    source_entity_id: str
    target_entity_id: str
    type: str
    properties: Optional[Dict[str, Any]] = {}
    evidence_ids: Optional[List[str]] = []

class RelationshipCreate(RelationshipBase):
    pass

class RelationshipOut(RelationshipBase):
    id: str = Field(alias="_id")
    created_by: str
    created_at: datetime
    updated_at: datetime
