from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import List
from app.schemas.evidence import EvidenceCreate, EvidenceOut
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from bson import ObjectId
from app.services.file_ingestion_service import ingest_file
from app.services.document_extraction_service import extract_text_from_file
from app.services.rag_service import index_document

router = APIRouter()

from bson import ObjectId

async def process_evidence_text_background(db, file_path: str, filename: str, case_id: str, evidence_id: str):
    try:
        from app.services.document_extraction_service import extract_text_from_file
        from app.services.rag_service import index_document
        
        extracted_text = await extract_text_from_file(file_path, filename)
        
        status = "SUCCESS" if not extracted_text.startswith("Error") else "FAILED"
        
        await db["evidence"].update_one(
            {"_id": ObjectId(evidence_id)},
            {"$set": {
                "raw_content": extracted_text,
                "processing_status": "COMPLETED",
                "extraction_status": status
            }}
        )
        
        if status == "SUCCESS":
            index_document(case_id, evidence_id, extracted_text)
            
    except Exception as e:
        print(f"Background extraction failed: {e}")
        await db["evidence"].update_one(
            {"_id": ObjectId(evidence_id)},
            {"$set": {
                "processing_status": "COMPLETED",
                "extraction_status": "FAILED"
            }}
        )

@router.post("/", response_model=EvidenceOut)
async def create_evidence(evidence: EvidenceCreate, db=Depends(get_database), current_user=Depends(get_current_user)):
    ev_dict = evidence.dict()
    ev_dict["created_by"] = current_user["email"]
    from datetime import datetime
    ev_dict["created_at"] = datetime.utcnow()
    
    result = await db["evidence"].insert_one(ev_dict)
    created_ev = await db["evidence"].find_one({"_id": result.inserted_id})
    return created_ev

@router.post("/upload", response_model=EvidenceOut)
async def upload_evidence(
    file: UploadFile = File(...),
    case_id: str = Form(...),
    title: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    # 1. Ingest File
    file_path, content_type, size = await ingest_file(file, case_id)
    
    # 2. Create Initial Evidence Record
    from datetime import datetime
    ev_dict = {
        "case_id": case_id,
        "title": title,
        "source_type": "FILE",
        "file_type": content_type,
        "file_path": file_path,
        "raw_content": "Processing in background...",
        "processing_status": "PROCESSING",
        "extraction_status": "PENDING",
        "created_by": current_user["email"],
        "created_at": datetime.utcnow()
    }
    
    result = await db["evidence"].insert_one(ev_dict)
    evidence_id = str(result.inserted_id)
    
    # 3. Add Background Task
    background_tasks.add_task(
        process_evidence_text_background,
        db, file_path, file.filename, case_id, evidence_id
    )
    
    created_ev = await db["evidence"].find_one({"_id": result.inserted_id})
    return created_ev

@router.get("/case/{case_id}", response_model=List[EvidenceOut])
async def get_case_evidence(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    cursor = db["evidence"].find({"case_id": case_id})
    evidence_list = await cursor.to_list(length=100)
    return evidence_list

@router.get("/{evidence_id}", response_model=EvidenceOut)
async def get_evidence(evidence_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    try:
        ev = await db["evidence"].find_one({"_id": ObjectId(evidence_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid Evidence ID")
    
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return ev
