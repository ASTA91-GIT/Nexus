from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import List, Any, Optional, Dict
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.ingestion.parsers import parse_csv, parse_json, parse_txt, parse_pdf, parse_docx, parse_image
from app.services.rag_service import index_document
from datetime import datetime
import re
from pydantic import BaseModel

router = APIRouter()

async def process_evidence_background(db, case_id: str, parsed_data: Any, is_supported_format: bool, current_user: dict, evidence_id: str):
    # Store evidence file record
    ev_dict = {
        "case_id": case_id,
        "title": file.filename,
        "source_type": filename.split(".")[-1].upper(),
        "raw_content": str(parsed_data)[:5000],
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
    }
    result = await db["evidence"].insert_one(ev_dict)
    
    background_tasks.add_task(
        process_evidence_background,
        db, case_id, parsed_data, is_supported_format, current_user, str(result.inserted_id)
    )
    
    return {
        "message": "File processed successfully. Extraction running in background.",
        "evidence_id": str(result.inserted_id),
        "entities_created": 0,
        "relationships_created": 0
    }

class ImportMappedRequest(BaseModel):
    case_id: str
    import_type: str  # "ENTITIES" or "RELATIONSHIPS"
    data: List[Dict[str, Any]]
    mappings: Dict[str, str]  # e.g., {"name": "NodeId", "type": "Category"}
    filename: Optional[str] = "dataset.csv"

@router.post("/preview")
async def preview_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    contents = await file.read()
    filename = file.filename.lower()
    
    parsed_data = None
    is_structured = False
    try:
        if filename.endswith(".csv"):
            parsed_data = await parse_csv(contents)
            is_structured = True
        elif filename.endswith(".json"):
            parsed_data = await parse_json(contents)
            is_structured = True
        elif filename.endswith(".txt"):
            text = await parse_txt(contents)
            parsed_data = [{"text": text[:1000] + ("..." if len(text) > 1000 else "")}]
        elif filename.endswith(".pdf"):
            text = await parse_pdf(contents)
            parsed_data = [{"text": text[:1000] + ("..." if len(text) > 1000 else "")}]
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            text = await parse_docx(contents)
            parsed_data = [{"text": text[:1000] + ("..." if len(text) > 1000 else "")}]
        elif filename.endswith(".png") or filename.endswith(".jpg") or filename.endswith(".jpeg"):
            text = await parse_image(contents)
            parsed_data = [{"text": text[:1000] + ("..." if len(text) > 1000 else "")}]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format for preview")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
        
    if not parsed_data:
        raise HTTPException(status_code=400, detail="No data parsed from file")
        
    columns = []
    if is_structured and isinstance(parsed_data, list) and len(parsed_data) > 0:
        columns = list(parsed_data[0].keys())
        
    return {
        "filename": file.filename,
        "columns": columns,
        "preview": parsed_data[:10] if is_structured else parsed_data,
        "total_rows": len(parsed_data) if isinstance(parsed_data, list) else 1,
        "raw_data": parsed_data,
        "is_structured": is_structured
    }

@router.post("/import-mapped")

async def process_mapped_import_background(db, case_id: str, import_type: str, data: List[Dict[str, Any]], mappings: Dict[str, str], current_user: dict, evidence_id: str):
    ev_dict = {
        "case_id": case_id,
        "title": req.filename,
        "source_type": req.filename.split(".")[-1].upper(),
        "raw_content": f"Imported {import_type} with custom mapping. Records count: {len(data)}",
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
    }
    ev_result = await db["evidence"].insert_one(ev_dict)
    
    background_tasks.add_task(
        process_mapped_import_background,
        db, case_id, import_type, data, mappings, current_user, str(ev_result.inserted_id)
    )
    
    return {
        "message": f"Mapped import processed successfully. Extraction running in background.",
        "evidence_id": str(ev_result.inserted_id),
        "entities_created": 0,
        "relationships_created": 0
    }
