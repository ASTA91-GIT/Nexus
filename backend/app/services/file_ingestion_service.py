import os
import shutil
from fastapi import UploadFile
from typing import Tuple
from datetime import datetime

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../../data/uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

async def ingest_file(file: UploadFile, case_id: str) -> Tuple[str, str, int]:
    """
    Saves the uploaded file to disk and returns the file path, content type, and size.
    """
    case_dir = os.path.join(UPLOAD_DIR, case_id)
    os.makedirs(case_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(case_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size = os.path.getsize(file_path)
    
    return file_path, file.content_type or "application/octet-stream", size
