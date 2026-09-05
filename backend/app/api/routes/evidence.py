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

async def process_evidence_text_background(db, file_path: str, filename: str, case_id: str, evidence_id: str, current_user_email: str = "system"):
    try:
        from app.services.document_extraction_service import extract_text_from_file
        from app.services.rag_service import index_document
        from app.ai.entity_extraction import extract_entities_and_relationships
        from app.services.data_processing.pipeline import process_entity_data
        from datetime import datetime
        import re
        
        extracted_text = await extract_text_from_file(file_path, filename)
        status = "SUCCESS" if extracted_text and not extracted_text.startswith("Error") else "FAILED"
        
        entities_created = 0
        relationships_created = 0

        if status == "SUCCESS":
            import asyncio
            await asyncio.to_thread(index_document, case_id, evidence_id, extracted_text)
            
            try:
                ai_results = await extract_entities_and_relationships(extracted_text)
                if "error" not in ai_results or ai_results.get("entities"):
                    entity_name_to_id = {}
                    
                    for ent in ai_results.get("entities", []):
                        ent_name = ent.get("name", "").strip()
                        if not ent_name: continue
                        ent_type = str(ent.get("type", "PERSON")).upper()
                        
                        ent_doc = {
                            "case_id": case_id,
                            "type": ent_type,
                            "name": ent_name,
                            "properties": {"description": ent.get("description", "")},
                            "risk_score": float(ent.get("risk_score", 0.0)),
                            "source": "AI_EXTRACTED",
                            "created_by": current_user_email,
                            "created_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow()
                        }
                        
                        # Process through canonical deduplication pipeline
                        processed_ent = await process_entity_data(db, ent_doc, case_id, mode="APPLY")
                        norm_name = processed_ent.get("normalizedName") or ent_name.lower().strip()
                        
                        existing = await db["entities"].find_one({
                            "$or": [{"case_id": case_id}, {"caseId": case_id}],
                            "normalizedName": norm_name
                        })
                        
                        if not existing:
                            res = await db["entities"].insert_one(processed_ent)
                            entity_name_to_id[ent_name.lower()] = str(res.inserted_id)
                            entities_created += 1
                        else:
                            entity_name_to_id[ent_name.lower()] = str(existing["_id"])

                    for rel in ai_results.get("relationships", []):
                        source_name = rel.get("source", "").strip().lower()
                        target_name = rel.get("target", "").strip().lower()
                        source_id = entity_name_to_id.get(source_name)
                        target_id = entity_name_to_id.get(target_name)
                        
                        if source_id and target_id and source_id != target_id:
                            rel_type = str(rel.get("type", "ASSOCIATED_WITH")).upper()
                            existing_rel = await db["relationships"].find_one({
                                "$or": [{"case_id": case_id}, {"caseId": case_id}],
                                "source_entity_id": source_id,
                                "target_entity_id": target_id,
                                "type": rel_type
                            })
                            if not existing_rel:
                                rel_doc = {
                                    "case_id": case_id,
                                    "caseId": case_id,
                                    "source_entity_id": source_id,
                                    "target_entity_id": target_id,
                                    "type": rel_type,
                                    "properties": {"description": rel.get("description", "")},
                                    "evidence_ids": [evidence_id],
                                    "source": "AI_EXTRACTED",
                                    "created_by": current_user_email,
                                    "created_at": datetime.utcnow(),
                                    "updated_at": datetime.utcnow()
                                }
                                await db["relationships"].insert_one(rel_doc)
                                relationships_created += 1

            except Exception as ai_e:
                print(f"AI Extraction during evidence background task failed: {ai_e}")

        await db["evidence"].update_one(
            {"_id": ObjectId(evidence_id)},
            {"$set": {
                "raw_content": extracted_text,
                "processing_status": "COMPLETED",
                "extraction_status": status
            }}
        )
        print(f"[EVIDENCE_BG] Evidence {evidence_id} processed. Entities created: {entities_created}, Relationships created: {relationships_created}")
        
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
        db, file_path, file.filename, case_id, evidence_id, current_user["email"]
    )
    
    created_ev = await db["evidence"].find_one({"_id": result.inserted_id})
    return created_ev

@router.get("/case/{case_id}", response_model=List[EvidenceOut])
async def get_case_evidence(case_id: str, db=Depends(get_database), current_user=Depends(get_current_user)):
    cursor = db["evidence"].find({"$or": [{"case_id": case_id}, {"caseId": case_id}]})
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
