import datetime
from typing import Dict, Any
from app.services.data_processing.cleaners import clean_structured_field
from app.services.data_processing.normalizers import normalize_name, normalize_email, normalize_phone, normalize_date
from app.services.data_processing.validators import validate_entity
from app.services.data_processing.duplicate_detector import detect_duplicates
from app.services.data_processing.quality_analyzer import calculate_entity_quality

async def process_entity_data(db, raw_data: Dict[str, Any], case_id: str, mode: str = "APPLY", exclude_id: str = None) -> Dict[str, Any]:
    """
    Processes raw entity data through the pipeline.
    Modes:
    - PREVIEW: Analyzes data and returns preview without modifying raw_data.
    - APPLY: Safely applies normalization, stores original values, and returns modified data + processing report.
    """
    
    # Make a copy for processing
    processed_data = raw_data.copy()
    original_values = {}
    actions = []
    
    # 1. Cleaning & Normalization
    name = raw_data.get("name", "")
    if name and isinstance(name, str):
        cleaned_name = clean_structured_field(name)
        norm_name = normalize_name(cleaned_name)
        if norm_name != name:
            processed_data["name"] = norm_name
            original_values["name"] = name
            actions.append("Trimmed whitespace and normalized name.")
            
    properties = raw_data.get("properties", {})
    processed_properties = properties.copy() if properties else {}
    
    email = properties.get("email", "")
    if email and isinstance(email, str):
        norm_email = normalize_email(email)
        if norm_email != email:
            processed_properties["email"] = norm_email
            original_values["properties.email"] = email
            actions.append("Normalized email to lowercase and trimmed whitespace.")
            
    phone = properties.get("phone", "")
    if phone and isinstance(phone, str):
        norm_phone = normalize_phone(phone)
        if norm_phone != phone:
            processed_properties["phone"] = norm_phone
            original_values["properties.phone"] = phone
            actions.append("Normalized phone number format.")
            
    date = properties.get("date", "")
    if date and isinstance(date, str):
        norm_date, is_ambiguous = normalize_date(date)
        if norm_date != date and not is_ambiguous:
            processed_properties["date"] = norm_date
            original_values["properties.date"] = date
            actions.append("Normalized date to ISO 8601.")
            
    processed_data["properties"] = processed_properties

    # 2. Validation
    status, warnings, errors = validate_entity(processed_data)
    
    # 3. Duplicate Detection
    duplicates = await detect_duplicates(db, case_id, processed_data, exclude_id=exclude_id)
    
    # 4. Data Quality Analysis
    quality_report = calculate_entity_quality(processed_data, status, len(duplicates) > 0)
    
    # 5. Build Report
    report = {
        "status": status,
        "warnings": warnings,
        "errors": errors,
        "quality_score": quality_report["overall_score"],
        "duplicates_found": len(duplicates)
    }
    
    if mode == "PREVIEW":
        return {
            "processed_data": processed_data,
            "original_values": original_values,
            "actions": actions,
            "report": report,
            "duplicates": duplicates,
            "quality": quality_report
        }
        
    # APPLY MODE
    if original_values:
        processed_data["original_values"] = original_values
        
    processed_data["processing_metadata"] = {
        "normalized": len(actions) > 0,
        "processed_at": datetime.datetime.utcnow().isoformat(),
        "actions": actions
    }
    
    processed_data["data_quality"] = quality_report
    processed_data["processing_report"] = report
    
    return processed_data
