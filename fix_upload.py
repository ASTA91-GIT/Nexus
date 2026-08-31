import json
import re

# 1. Update file_ingestion_service.py
file_path_ingest = 'backend/app/services/file_ingestion_service.py'
with open(file_path_ingest, 'r', encoding='utf-8') as f:
    content = f.read()

new_ingest = '''import os
import shutil
import uuid
from fastapi import UploadFile, HTTPException
from typing import Tuple
from datetime import datetime
from werkzeug.utils import secure_filename

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../../data/uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

async def ingest_file(file: UploadFile, case_id: str) -> Tuple[str, str, int]:
    """
    Saves the uploaded file to disk securely with UUID filename.
    """
    # Prevent path traversal in case_id
    safe_case_id = secure_filename(case_id)
    if not safe_case_id:
        raise HTTPException(status_code=400, detail="Invalid case ID")
        
    case_dir = os.path.join(UPLOAD_DIR, safe_case_id)
    os.makedirs(case_dir, exist_ok=True)

    # Safe UUID filename
    original_filename = secure_filename(file.filename)
    ext = os.path.splitext(original_filename)[1].lower()
    
    ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.csv', '.json', '.png', '.jpg', '.jpeg', '.docx', '.doc'}
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(case_dir, safe_filename)

    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (Max 50MB)")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return file_path, file.content_type or "application/octet-stream", size
'''
with open(file_path_ingest, 'w', encoding='utf-8') as f:
    f.write(new_ingest)
print('Updated file_ingestion_service.py')


# 2. Update auth.py for avatar upload limits
file_path_auth = 'backend/app/api/routes/auth.py'
with open(file_path_auth, 'r', encoding='utf-8') as f:
    auth_content = f.read()

old_upload = '''@router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user=Depends(get_current_user), db=Depends(get_database)):
    content = await file.read()
    b64 = base64.b64encode(content).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{b64}"'''

new_upload = '''@router.post("/profile/avatar")
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
    data_url = f"data:{file.content_type};base64,{b64}"'''

if old_upload in auth_content:
    auth_content = auth_content.replace(old_upload, new_upload)
    
    if 'import os' not in auth_content:
        auth_content = auth_content.replace('import base64', 'import base64\nimport os')
        
    with open(file_path_auth, 'w', encoding='utf-8') as f:
        f.write(auth_content)
    print('Updated auth.py')
else:
    print('Could not find old_upload in auth.py')

