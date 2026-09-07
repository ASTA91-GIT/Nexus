from datetime import datetime

def _get_timestamp(time_str: str) -> str:
    # Use a fixed date for the timeline sorting
    return f"2023-10-15T{time_str}:00Z"

def get_riverfront_data():
    case_id = "CASE-RIVERFRONT-001"
    now = datetime.utcnow()
    creator = "system"
    
    case = {
        "_id": case_id,
        "name": "Riverfront Incident",
        "description": "A fictional murder investigation.",
        "status": "OPEN",
        "created_by": creator,
        "created_at": now,
        "updated_at": now
    }
    
    entities = [
        {"_id": f"{case_id}-E1", "case_id": case_id, "type": "PERSON", "name": "Tanmay Kulkarni", "properties": {"description": "Person of interest"}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.8},
        {"_id": f"{case_id}-E2", "case_id": case_id, "type": "PERSON", "name": "Vinayak Rao", "properties": {"description": "Victim"}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.0},
        {"_id": f"{case_id}-E3", "case_id": case_id, "type": "ORGANIZATION", "name": "Northstar Supplies", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.2},
        {"_id": f"{case_id}-E4", "case_id": case_id, "type": "LOCATION", "name": "Shivajinagar Café", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.1},
        {"_id": f"{case_id}-E5", "case_id": case_id, "type": "LOCATION", "name": "Riverfront Service Road, Pune", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.5},
        {"_id": f"{case_id}-E6", "case_id": case_id, "type": "VEHICLE", "name": "White Sedan MH12 XY 4821", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.6},
        
        # Timeline Events (Events are mapped to timeline)
        {"_id": f"{case_id}-EV1", "case_id": case_id, "type": "EVENT", "name": "Vinayak Rao left the meeting", "properties": {"timestamp": _get_timestamp("19:20")}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.0},
        {"_id": f"{case_id}-EV2", "case_id": case_id, "type": "EVENT", "name": "White Sedan MH12 XY 4821 observed near Riverfront Service Road", "properties": {"timestamp": _get_timestamp("19:55")}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.0},
        {"_id": f"{case_id}-EV3", "case_id": case_id, "type": "EVENT", "name": "Vinayak Rao found near riverfront", "properties": {"timestamp": _get_timestamp("20:15")}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.0},
    ]
    
    relationships = [
        {"_id": f"{case_id}-R1", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E3", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R2", "case_id": case_id, "source_entity_id": f"{case_id}-E2", "target_entity_id": f"{case_id}-E3", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R3", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E2", "type": "MET", "properties": {"timestamp": _get_timestamp("18:40")}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R4", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E6", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R5", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E5", "type": "LOCATED_AT", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R6", "case_id": case_id, "source_entity_id": f"{case_id}-E2", "target_entity_id": f"{case_id}-E4", "type": "LAST_SEEN_AT", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
    ]
    
    return {"case": case, "entities": entities, "relationships": relationships}

def get_meridian_data():
    case_id = "CASE-MERIDIAN-002"
    now = datetime.utcnow()
    creator = "system"
    
    case = {
        "_id": case_id,
        "name": "Meridian Transfer Trail",
        "description": "A fictional financial investigation.",
        "status": "OPEN",
        "created_by": creator,
        "created_at": now,
        "updated_at": now
    }
    
    entities = [
        {"_id": f"{case_id}-E1", "case_id": case_id, "type": "PERSON", "name": "Aarav Mehta", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.4},
        {"_id": f"{case_id}-E2", "case_id": case_id, "type": "PERSON", "name": "Neha Kapoor", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.3},
        {"_id": f"{case_id}-E3", "case_id": case_id, "type": "PERSON", "name": "Rohan Desai", "properties": {"description": "Director of Apex Meridian Trading"}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.7},
        {"_id": f"{case_id}-E4", "case_id": case_id, "type": "ACCOUNT", "name": "ACC-78421", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.5},
        {"_id": f"{case_id}-E5", "case_id": case_id, "type": "ACCOUNT", "name": "ACC-55218", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.5},
        {"_id": f"{case_id}-E6", "case_id": case_id, "type": "ORGANIZATION", "name": "Apex Meridian Trading", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.6},
        {"_id": f"{case_id}-E7", "case_id": case_id, "type": "ORGANIZATION", "name": "Blue Horizon Logistics", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.2},
    ]
    
    relationships = [
        {"_id": f"{case_id}-R1", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E4", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R2", "case_id": case_id, "source_entity_id": f"{case_id}-E2", "target_entity_id": f"{case_id}-E5", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R3", "case_id": case_id, "source_entity_id": f"{case_id}-E3", "target_entity_id": f"{case_id}-E6", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R4", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E3", "type": "CONNECTED_TO", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R5", "case_id": case_id, "source_entity_id": f"{case_id}-E4", "target_entity_id": f"{case_id}-E5", "type": "TRANSFERRED_MONEY", "properties": {"amount": "₹8,75,000", "timestamp": _get_timestamp("10:00")}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R6", "case_id": case_id, "source_entity_id": f"{case_id}-E5", "target_entity_id": f"{case_id}-E6", "type": "TRANSFERRED_MONEY", "properties": {"amount": "₹4,20,000", "timestamp": _get_timestamp("12:00")}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R7", "case_id": case_id, "source_entity_id": f"{case_id}-E5", "target_entity_id": f"{case_id}-E7", "type": "TRANSFERRED_MONEY", "properties": {"amount": "₹2,10,000", "timestamp": _get_timestamp("14:00")}, "created_by": creator, "created_at": now, "updated_at": now},
    ]
    
    return {"case": case, "entities": entities, "relationships": relationships}

def get_vehicle_data():
    case_id = "CASE-VEHICLE-003"
    now = datetime.utcnow()
    creator = "system"
    
    case = {
        "_id": case_id,
        "name": "Vehicle Route Investigation",
        "description": "A fictional vehicle-movement investigation.",
        "status": "OPEN",
        "created_by": creator,
        "created_at": now,
        "updated_at": now
    }
    
    entities = [
        {"_id": f"{case_id}-E1", "case_id": case_id, "type": "PERSON", "name": "Rohan Desai", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.4},
        {"_id": f"{case_id}-E2", "case_id": case_id, "type": "PERSON", "name": "Kabir Shah", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.5},
        {"_id": f"{case_id}-E3", "case_id": case_id, "type": "PERSON", "name": "Meera Joshi", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.3},
        {"_id": f"{case_id}-E4", "case_id": case_id, "type": "ORGANIZATION", "name": "Harbor Auto Works", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.6},
        {"_id": f"{case_id}-E5", "case_id": case_id, "type": "VEHICLE", "name": "Vehicle MH04 AB 7123", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.7},
        {"_id": f"{case_id}-E6", "case_id": case_id, "type": "LOCATION", "name": "Andheri East, Mumbai", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.2},
        {"_id": f"{case_id}-E7", "case_id": case_id, "type": "LOCATION", "name": "Vashi, Navi Mumbai", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.2},
        {"_id": f"{case_id}-E8", "case_id": case_id, "type": "LOCATION", "name": "Pune", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.2},
        {"_id": f"{case_id}-E9", "case_id": case_id, "type": "LOCATION", "name": "Pune Transport Yard", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now, "risk_score": 0.5},
    ]
    
    relationships = [
        {"_id": f"{case_id}-R1", "case_id": case_id, "source_entity_id": f"{case_id}-E5", "target_entity_id": f"{case_id}-E6", "type": "LOCATED_AT", "properties": {"timestamp": _get_timestamp("08:00")}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R2", "case_id": case_id, "source_entity_id": f"{case_id}-E5", "target_entity_id": f"{case_id}-E7", "type": "LOCATED_AT", "properties": {"timestamp": _get_timestamp("09:30")}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R3", "case_id": case_id, "source_entity_id": f"{case_id}-E5", "target_entity_id": f"{case_id}-E8", "type": "LOCATED_AT", "properties": {"timestamp": _get_timestamp("11:45")}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R4", "case_id": case_id, "source_entity_id": f"{case_id}-E5", "target_entity_id": f"{case_id}-E9", "type": "LOCATED_AT", "properties": {"timestamp": _get_timestamp("12:30")}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R5", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E5", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R6", "case_id": case_id, "source_entity_id": f"{case_id}-E2", "target_entity_id": f"{case_id}-E5", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R7", "case_id": case_id, "source_entity_id": f"{case_id}-E3", "target_entity_id": f"{case_id}-E5", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R8", "case_id": case_id, "source_entity_id": f"{case_id}-E4", "target_entity_id": f"{case_id}-E5", "type": "ASSOCIATED_WITH", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R9", "case_id": case_id, "source_entity_id": f"{case_id}-E1", "target_entity_id": f"{case_id}-E2", "type": "CONNECTED_TO", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
        {"_id": f"{case_id}-R10", "case_id": case_id, "source_entity_id": f"{case_id}-E2", "target_entity_id": f"{case_id}-E3", "type": "CONNECTED_TO", "properties": {}, "created_by": creator, "created_at": now, "updated_at": now},
    ]
    
    return {"case": case, "entities": entities, "relationships": relationships}


async def setup_presentation_cases(db):
    cases_to_seed = [
        get_riverfront_data(),
        get_meridian_data(),
        get_vehicle_data()
    ]
    
    for data in cases_to_seed:
        case_id = data["case"]["_id"]
        try:
            existing = await db["cases"].find_one({"_id": case_id})
            if existing:
                print(f"[NEXUS] Presentation case {case_id} already present.")
                continue
                
            print(f"[NEXUS] Initializing presentation case {case_id}...")
            await db["cases"].insert_one(data["case"])
            if data["entities"]:
                await db["entities"].insert_many(data["entities"])
            if data["relationships"]:
                await db["relationships"].insert_many(data["relationships"])
            print(f"[NEXUS] Presentation case {case_id} initialized.")
        except Exception as e:
            print(f"[NEXUS] Error setting up presentation case {case_id}: {e}")
