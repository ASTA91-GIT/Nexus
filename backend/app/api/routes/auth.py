from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.schemas.auth import UserCreate, UserOut, Token
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.database import get_database
from datetime import timedelta
import logging

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

ACCESS_TOKEN_EXPIRE_MINUTES = 30

import re

def validate_password(password: str):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character."
    return True, ""

@router.post("/register", response_model=UserOut)
async def register_user(user: UserCreate, db=Depends(get_database)):
    if await db["users"].find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    is_valid, msg = validate_password(user.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
    
    user_dict = user.dict()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    from datetime import datetime
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()
    
    user_count = await db["users"].count_documents({})
    if user_count == 0:
        user_dict["role"] = "ADMIN"
    else:
        user_dict["role"] = "INVESTIGATOR"
    
    result = await db["users"].insert_one(user_dict)
    created_user = await db["users"].find_one({"_id": result.inserted_id})
    return created_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_database)):
    user = await db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user.get("role", "USER")}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db=Depends(get_database)):
    from jose import JWTError, jwt
    from app.core.database import settings
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db["users"].find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

async def get_admin_user(current_user=Depends(get_current_user)):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user=Depends(get_current_user)):
    return current_user

from fastapi import UploadFile, File
import base64
import os

@router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user=Depends(get_current_user), db=Depends(get_database)):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid image format. Allowed: jpeg, png, webp")
        
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    if size > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")
        
    content = await file.read()
    b64 = base64.b64encode(content).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{b64}"
    
    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {"avatar": data_url}}
    )
    return {"message": "Avatar updated successfully", "avatar_url": data_url}

@router.delete("/profile/avatar")
async def remove_avatar(current_user=Depends(get_current_user), db=Depends(get_database)):
    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"avatar": ""}}
    )
    return {"message": "Avatar removed successfully"}
