from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Any
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.ingestion.parsers import parse_csv, parse_json, parse_txt, parse_pdf

router = APIRouter()

@router.post("/upload")
async def upload_file(
    case_id: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_database), 
    current_user=Depends(get_current_user)
):
    contents = await file.read()
    filename = file.filename.lower()
    
    parsed_data = None
    if filename.endswith(".csv"):
        parsed_data = await parse_csv(contents)
    elif filename.endswith(".json"):
        parsed_data = await parse_json(contents)
    elif filename.endswith(".txt"):
        parsed_data = {"text": await parse_txt(contents)}
    elif filename.endswith(".pdf"):
        parsed_data = {"text": await parse_pdf(contents)}
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    # Store as evidence
    ev_dict = {
        "case_id": case_id,
        "title": file.filename,
        "source_type": filename.split(".")[-1].upper(),
        "raw_content": str(parsed_data)[:5000], # store a snippet or full if small
        "created_by": current_user["email"],
    }
    from datetime import datetime
    ev_dict["created_at"] = datetime.utcnow()
    
    result = await db["evidence"].insert_one(ev_dict)
    
    return {
        "message": "File processed successfully",
        "evidence_id": str(result.inserted_id),
        "preview": parsed_data if isinstance(parsed_data, list) else [parsed_data]
    }
