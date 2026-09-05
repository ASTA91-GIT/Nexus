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
        
        import os
        ext = os.path.splitext(filename)[1].lower()
        is_structured = False
        structured_text_preview = ""
        entities_created = 0
        relationships_created = 0
        
        # 1. Attempt structured schema detection
        if ext in [".csv", ".json"]:
            try:
                import pandas as pd
                if ext == ".csv":
                    df = pd.read_csv(file_path)
                else:
                    df = pd.read_json(file_path)
                
                parsed_data = df.to_dict(orient="records")
                if parsed_data and isinstance(parsed_data, list):
                    columns = set(parsed_data[0].keys())
                    
                    is_entity_schema = {"entity_id", "name", "type"}.issubset(columns)
                    is_rel_schema_ids = {"source_id", "target_id", "relationship_type"}.issubset(columns)
                    is_rel_schema_names = {"source", "target", "type"}.issubset(columns)
                    is_rel_schema = is_rel_schema_ids or is_rel_schema_names
                    
                    if is_entity_schema:
                        is_structured = True
                        for record in parsed_data:
                            try:
                                val_name = record.get("name")
                                if not val_name: continue
                                val_type = str(record.get("type", "PERSON")).upper()
                                properties = {k: v for k, v in record.items() if k not in ["name", "type", "case_id"]}
                                ent_doc = {
                                    "case_id": case_id, "type": val_type, "name": str(val_name), "properties": properties,
                                    "risk_score": float(record.get("risk_score", 0.0)), "created_by": current_user_email,
                                    "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
                                    "source": "STRUCTURED_IMPORT"
                                }
                                # Canonical deduplication
                                processed_ent = await process_entity_data(db, ent_doc, case_id, mode="APPLY")
                                norm_name = processed_ent.get("normalizedName") or str(val_name).lower().strip()
                                existing = await db["entities"].find_one({"$or": [{"case_id": case_id}, {"caseId": case_id}], "normalizedName": norm_name})
                                if not existing:
                                    await db["entities"].insert_one(processed_ent)
                                    entities_created += 1
                            except Exception as row_e:
                                print(f"Skipping invalid entity row: {row_e}")
                                continue
                                
                    elif is_rel_schema:
                        is_structured = True
                        src_key = "source_id" if is_rel_schema_ids else "source"
                        tgt_key = "target_id" if is_rel_schema_ids else "target"
                        type_key = "relationship_type" if is_rel_schema_ids else "type"
                        
                        for record in parsed_data:
                            try:
                                src_val = record.get(src_key)
                                tgt_val = record.get(tgt_key)
                                if not src_val or not tgt_val: continue
                                
                                src_val = str(src_val).strip()
                                tgt_val = str(tgt_val).strip()
                                
                                src_ent = None
                                tgt_ent = None
                                
                                if is_rel_schema_ids:
                                    # Resolve source and target by ID only
                                    src_ent = await db["entities"].find_one({"$or": [{"case_id": case_id}, {"caseId": case_id}], "properties.entity_id": src_val})
                                    tgt_ent = await db["entities"].find_one({"$or": [{"case_id": case_id}, {"caseId": case_id}], "properties.entity_id": tgt_val})
                                else:
                                    # Resolve source and target by normalizedName only
                                    src_ent = await db["entities"].find_one({"$or": [{"case_id": case_id}, {"caseId": case_id}], "normalizedName": src_val.lower()})
                                    tgt_ent = await db["entities"].find_one({"$or": [{"case_id": case_id}, {"caseId": case_id}], "normalizedName": tgt_val.lower()})
                                    
                                if src_ent and tgt_ent and str(src_ent["_id"]) != str(tgt_ent["_id"]):
                                    rel_type = str(record.get(type_key, "CONNECTED_TO")).upper()
                                    properties = {k: v for k, v in record.items() if k not in [src_key, tgt_key, type_key, "case_id"]}
                                    
                                    existing_rel = await db["relationships"].find_one({
                                        "$or": [{"case_id": case_id}, {"caseId": case_id}],
                                        "source_entity_id": str(src_ent["_id"]),
                                        "target_entity_id": str(tgt_ent["_id"]),
                                        "type": rel_type
                                    })
                                    if not existing_rel:
                                        rel_doc = {
                                            "case_id": case_id, "caseId": case_id, "source_entity_id": str(src_ent["_id"]),
                                            "target_entity_id": str(tgt_ent["_id"]), "type": rel_type,
                                            "properties": properties, "evidence_ids": [evidence_id],
                                            "source": "STRUCTURED_IMPORT", "created_by": current_user_email,
                                            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
                                        }
                                        await db["relationships"].insert_one(rel_doc)
                                        relationships_created += 1
                            except Exception as row_e:
                                print(f"Skipping invalid relationship row: {row_e}")
                                continue
                                    
                    if is_structured:
                        structured_text_preview = str(parsed_data)[:5000]
            except Exception as schema_e:
                print(f"Schema detection failed: {schema_e}")
                
        # 2. Extract Text
        if is_structured:
            extracted_text = structured_text_preview
            status = "SUCCESS"
        else:
            extracted_text = await extract_text_from_file(file_path, filename)
            
            if extracted_text == "UNSUPPORTED_MEDIA":
                status = "NOT_EXTRACTABLE"
                extracted_text = ""
            else:
                status = "SUCCESS" if extracted_text and not extracted_text.startswith("Error") else "FAILED"

        if status == "SUCCESS":
            import asyncio
            await asyncio.to_thread(index_document, case_id, evidence_id, extracted_text)
            
            if not is_structured:
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
                                entity_name_to_id[norm_name] = str(res.inserted_id)
                                entities_created += 1
                            else:
                                entity_name_to_id[ent_name.lower()] = str(existing["_id"])
                                entity_name_to_id[norm_name] = str(existing["_id"])
    
                        for rel in ai_results.get("relationships", []):
                            raw_source = rel.get("source", "")
                            raw_target = rel.get("target", "")
                            source_name = re.sub(r'\s+', ' ', raw_source).strip().lower()
                            target_name = re.sub(r'\s+', ' ', raw_target).strip().lower()
                            
                            source_id = entity_name_to_id.get(source_name)
                            target_id = entity_name_to_id.get(target_name)
                            
                            if not source_id:
                                s_doc = await db["entities"].find_one({"$or": [{"case_id": case_id}, {"caseId": case_id}], "normalizedName": source_name})
                                if s_doc: source_id = str(s_doc["_id"])
                                
                            if not target_id:
                                t_doc = await db["entities"].find_one({"$or": [{"case_id": case_id}, {"caseId": case_id}], "normalizedName": target_name})
                                if t_doc: target_id = str(t_doc["_id"])
                            
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

from app.api.dependencies import verify_case_access

@router.post("/upload", response_model=EvidenceOut)
async def upload_evidence(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    case_id: str = Form(...),
    title: str = Form(...),
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    await verify_case_access(case_id, db, current_user)
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
async def get_case_evidence(
    case_id: str, 
    db=Depends(get_database), 
    current_user=Depends(get_current_user)
):
    await verify_case_access(case_id, db, current_user)
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
        
    await verify_case_access(str(ev.get("case_id")), db, current_user)
    return ev
