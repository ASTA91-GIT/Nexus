from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List, Any, Optional, Dict
from app.core.database import get_database
from app.api.routes.auth import get_current_user
from app.ingestion.parsers import parse_csv, parse_json, parse_txt, parse_pdf
from datetime import datetime
from pydantic import BaseModel

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
    try:
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    entities_created = 0
    relationships_created = 0

    # Auto-extract entities and relationships from CSV/JSON lists of dicts
    if isinstance(parsed_data, list):
        for record in parsed_data:
            # Check for Entity row (has 'name' and 'type')
            if "name" in record and "type" in record:
                entity_doc = {
                    "case_id": case_id,
                    "type": str(record["type"]).upper(),
                    "name": str(record["name"]),
                    "properties": {k: v for k, v in record.items() if k not in ["name", "type", "case_id"]},
                    "risk_score": float(record.get("risk_score", 0.0)),
                    "created_by": current_user["email"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                # Check for duplicate
                existing = await db["entities"].find_one({"case_id": case_id, "name": entity_doc["name"]})
                if not existing:
                    await db["entities"].insert_one(entity_doc)
                    entities_created += 1
            
            # Check for Relationship row (has 'source' and 'target' and 'type')
            elif "source" in record and "target" in record and "type" in record:
                # Find or create source entity
                src_name = str(record["source"])
                src_ent = await db["entities"].find_one({"case_id": case_id, "name": src_name})
                if not src_ent:
                    src_res = await db["entities"].insert_one({
                        "case_id": case_id,
                        "type": "PERSON",
                        "name": src_name,
                        "properties": {},
                        "risk_score": 0.0,
                        "created_by": current_user["email"],
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    })
                    src_ent_id = str(src_res.inserted_id)
                    entities_created += 1
                else:
                    src_ent_id = str(src_ent["_id"])
                    
                # Find or create target entity
                tgt_name = str(record["target"])
                tgt_ent = await db["entities"].find_one({"case_id": case_id, "name": tgt_name})
                if not tgt_ent:
                    tgt_res = await db["entities"].insert_one({
                        "case_id": case_id,
                        "type": "PERSON",
                        "name": tgt_name,
                        "properties": {},
                        "risk_score": 0.0,
                        "created_by": current_user["email"],
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    })
                    tgt_ent_id = str(tgt_res.inserted_id)
                    entities_created += 1
                else:
                    tgt_ent_id = str(tgt_ent["_id"])
                
                # Check for duplicate relationship
                rel_type = str(record["type"]).upper()
                existing_rel = await db["relationships"].find_one({
                    "case_id": case_id,
                    "source_entity_id": src_ent_id,
                    "target_entity_id": tgt_ent_id,
                    "type": rel_type
                })
                
                if not existing_rel:
                    rel_doc = {
                        "case_id": case_id,
                        "source_entity_id": src_ent_id,
                        "target_entity_id": tgt_ent_id,
                        "type": rel_type,
                        "properties": {k: v for k, v in record.items() if k not in ["source", "target", "type", "case_id"]},
                        "evidence_ids": [],
                        "created_by": current_user["email"],
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                    await db["relationships"].insert_one(rel_doc)
                    relationships_created += 1

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
    
    return {
        "message": f"File processed successfully. Ingested {entities_created} entities and {relationships_created} relationships.",
        "evidence_id": str(result.inserted_id),
        "entities_created": entities_created,
        "relationships_created": relationships_created
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
    try:
        if filename.endswith(".csv"):
            parsed_data = await parse_csv(contents)
        elif filename.endswith(".json"):
            parsed_data = await parse_json(contents)
        elif filename.endswith(".txt"):
            parsed_data = [{"text": line} for line in (await parse_txt(contents)).split("\n") if line.strip()]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format for preview")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
        
    if not parsed_data:
        raise HTTPException(status_code=400, detail="No data parsed from file")
        
    columns = []
    if isinstance(parsed_data, list) and len(parsed_data) > 0:
        columns = list(parsed_data[0].keys())
        
    return {
        "filename": file.filename,
        "columns": columns,
        "preview": parsed_data[:10],  # first 10 rows
        "total_rows": len(parsed_data) if isinstance(parsed_data, list) else 1,
        "raw_data": parsed_data
    }

@router.post("/import-mapped")
async def import_mapped_data(
    req: ImportMappedRequest,
    db=Depends(get_database),
    current_user=Depends(get_current_user)
):
    case_id = req.case_id
    import_type = req.import_type.upper()
    data = req.data
    mappings = req.mappings
    
    entities_created = 0
    relationships_created = 0
    
    if import_type == "ENTITIES":
        name_key = mappings.get("name")
        type_key = mappings.get("type")
        
        if not name_key:
            raise HTTPException(status_code=400, detail="Name mapping field is required for Entity imports")
            
        for record in data:
            val_name = record.get(name_key)
            if not val_name:
                continue
            
            val_type = record.get(type_key, "PERSON") if type_key else "PERSON"
            val_type = str(val_type).upper()
            
            properties = {k: v for k, v in record.items() if k not in [name_key, type_key]}
            
            entity_doc = {
                "case_id": case_id,
                "type": val_type,
                "name": str(val_name),
                "properties": properties,
                "risk_score": float(record.get("risk_score", 0.0)),
                "created_by": current_user["email"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            existing = await db["entities"].find_one({"case_id": case_id, "name": entity_doc["name"]})
            if not existing:
                await db["entities"].insert_one(entity_doc)
                entities_created += 1
                
    elif import_type == "RELATIONSHIPS":
        src_key = mappings.get("source")
        tgt_key = mappings.get("target")
        type_key = mappings.get("type")
        
        if not src_key or not tgt_key:
            raise HTTPException(status_code=400, detail="Source and Target mapping fields are required for Relationship imports")
            
        for record in data:
            src_name = record.get(src_key)
            tgt_name = record.get(tgt_key)
            if not src_name or not tgt_name:
                continue
                
            src_name = str(src_name)
            tgt_name = str(tgt_name)
            
            src_ent = await db["entities"].find_one({"case_id": case_id, "name": src_name})
            if not src_ent:
                src_res = await db["entities"].insert_one({
                    "case_id": case_id,
                    "type": "PERSON",
                    "name": src_name,
                    "properties": {},
                    "risk_score": 0.0,
                    "created_by": current_user["email"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
                src_ent_id = str(src_res.inserted_id)
                entities_created += 1
            else:
                src_ent_id = str(src_ent["_id"])
                
            tgt_ent = await db["entities"].find_one({"case_id": case_id, "name": tgt_name})
            if not tgt_ent:
                tgt_res = await db["entities"].insert_one({
                    "case_id": case_id,
                    "type": "PERSON",
                    "name": tgt_name,
                    "properties": {},
                    "risk_score": 0.0,
                    "created_by": current_user["email"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
                tgt_ent_id = str(tgt_res.inserted_id)
                entities_created += 1
            else:
                tgt_ent_id = str(tgt_ent["_id"])
                
            rel_type = record.get(type_key, "CONNECTED_TO") if type_key else "CONNECTED_TO"
            rel_type = str(rel_type).upper()
            
            properties = {k: v for k, v in record.items() if k not in [src_key, tgt_key, type_key]}
            
            existing_rel = await db["relationships"].find_one({
                "case_id": case_id,
                "source_entity_id": src_ent_id,
                "target_entity_id": tgt_ent_id,
                "type": rel_type
            })
            
            if not existing_rel:
                rel_doc = {
                    "case_id": case_id,
                    "source_entity_id": src_ent_id,
                    "target_entity_id": tgt_ent_id,
                    "type": rel_type,
                    "properties": properties,
                    "evidence_ids": [],
                    "created_by": current_user["email"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                await db["relationships"].insert_one(rel_doc)
                relationships_created += 1
                
    ev_dict = {
        "case_id": case_id,
        "title": req.filename,
        "source_type": req.filename.split(".")[-1].upper(),
        "raw_content": f"Imported {import_type} with custom mapping. Records count: {len(data)}",
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
    }
    ev_result = await db["evidence"].insert_one(ev_dict)
    
    return {
        "message": f"Mapped import processed successfully. Ingested {entities_created} entities and {relationships_created} relationships.",
        "evidence_id": str(ev_result.inserted_id),
        "entities_created": entities_created,
        "relationships_created": relationships_created
    }
