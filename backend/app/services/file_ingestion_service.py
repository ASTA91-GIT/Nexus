import os
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
