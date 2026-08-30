from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.user import PyObjectId

class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(default="Unknown User")
    role: str = "INVESTIGATOR"
    department: str = Field(default="N/A")
    phone_number: str = Field(default="N/A")
    badge_number: str = Field(default="N/A")
    clearance_level: str = Field(default="Standard")
    designation: str = Field(default="N/A")
    country: str = Field(default="N/A")
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: PyObjectId = Field(alias="_id")
    hashed_password: str
    created_at: datetime
    updated_at: datetime

class UserOut(UserBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
