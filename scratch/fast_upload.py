import re

with open('backend/app/api/routes/ingestion.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to change process_file_background to accept contents and filename
old_func_def = "async def process_file_background(db, case_id: str, parsed_data: Any, current_user: dict, evidence_id: str, is_supported_format: bool):"
new_func_def = """async def process_file_background(db, case_id: str, contents: bytes, filename: str, current_user: dict, evidence_id: str):
    parsed_data = None
    is_supported_format = True
    try:
        if filename.endswith(".csv"):
            parsed_data = await parse_csv(contents)
        elif filename.endswith(".json"):
            parsed_data = await parse_json(contents)
        elif filename.endswith(".txt"):
            parsed_data = {"text": await parse_txt(contents)}
        elif filename.endswith(".pdf"):
            parsed_data = {"text": await parse_pdf(contents)}
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            parsed_data = {"text": await parse_docx(contents)}
        elif filename.endswith(".png") or filename.endswith(".jpg") or filename.endswith(".jpeg") or filename.endswith(".webp"):
            parsed_data = {"text": await parse_image(contents)}
        else:
            is_supported_format = False
            parsed_data = {"text": "Binary file or unsupported format. No automated intelligence extraction available."}
    except Exception as e:
        is_supported_format = False
        parsed_data = {"text": f"Failed to parse file: {str(e)}"}

    # Update evidence record with parsed content now that it's parsed
    raw_content = str(parsed_data)[:5000]
    from bson import ObjectId
    try:
        await db["evidence"].update_one(
            {"_id": ObjectId(evidence_id)},
            {"$set": {"raw_content": raw_content}}
        )
    except Exception as e:
        print("Failed to update evidence content:", e)
"""

content = content.replace(old_func_def, new_func_def)

# Now rewrite upload_file
old_upload = """@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    case_id: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_database), 
    current_user=Depends(get_current_user)
):
    contents = await file.read()
    filename = file.filename.lower()
    
    parsed_data = None
    is_supported_format = True
    try:
        if filename.endswith(".csv"):
            parsed_data = await parse_csv(contents)
        elif filename.endswith(".json"):
            parsed_data = await parse_json(contents)
        elif filename.endswith(".txt"):
            parsed_data = {"text": await parse_txt(contents)}
        elif filename.endswith(".pdf"):
            parsed_data = {"text": await parse_pdf(contents)}
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            parsed_data = {"text": await parse_docx(contents)}
        elif filename.endswith(".png") or filename.endswith(".jpg") or filename.endswith(".jpeg") or filename.endswith(".webp"):
            parsed_data = {"text": await parse_image(contents)}
        else:
            is_supported_format = False
            parsed_data = {"text": "Binary file or unsupported format. No automated intelligence extraction available."}
    except Exception as e:
        is_supported_format = False
        parsed_data = {"text": f"Failed to parse file: {str(e)}"}

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
        process_file_background,
        db, case_id, parsed_data, current_user, str(result.inserted_id), is_supported_format
    )
    
    return {
        "message": f"File uploaded and processing in background.",
        "evidence_id": str(result.inserted_id),
        "entities_created": 0,
        "relationships_created": 0
    }"""

new_upload = """@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    case_id: str = Form(...),
    file: UploadFile = File(...),
    db=Depends(get_database), 
    current_user=Depends(get_current_user)
):
    contents = await file.read()
    filename = file.filename.lower()
    
    ev_dict = {
        "case_id": case_id,
        "title": file.filename,
        "source_type": filename.split(".")[-1].upper(),
        "raw_content": "Processing file in background...",
        "created_by": current_user["email"],
        "created_at": datetime.utcnow(),
    }
    result = await db["evidence"].insert_one(ev_dict)
    
    background_tasks.add_task(
        process_file_background,
        db, case_id, contents, filename, current_user, str(result.inserted_id)
    )
    
    return {
        "message": f"File uploaded and processing in background.",
        "evidence_id": str(result.inserted_id),
        "entities_created": 0,
        "relationships_created": 0
    }"""

if old_upload in content:
    content = content.replace(old_upload, new_upload)
else:
    print("Could not find upload_file to replace!")

with open('backend/app/api/routes/ingestion.py', 'w', encoding='utf-8') as f:
    f.write(content)
