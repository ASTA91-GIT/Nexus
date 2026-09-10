from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_database
from app.api.routes.auth import get_current_user
import httpx
import os
import json
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.ai.local_llm import generate

router = APIRouter()

@router.get("/")
async def generate_report(
    case_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    if not case_id:
        raise HTTPException(status_code=400, detail="case_id is required")
        
    # Fetch case details
    try:
        case = await db["cases"].find_one({"_id": ObjectId(case_id)})
    except Exception:
        case = await db["cases"].find_one({"_id": case_id})
        
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Handle variation in case ID storage
    query = {"$or": [{"case_id": case_id}, {"caseId": case_id}]}
    
    # Fetch entities
    cursor = db["entities"].find(query)
    entities = await cursor.to_list(length=1000)
    
    # Fetch relationships
    rel_cursor = db["relationships"].find(query)
    relationships = await rel_cursor.to_list(length=1000)
    
    # Fetch evidence
    ev_cursor = db["evidence"].find(query)
    evidence = await ev_cursor.to_list(length=100)
    
    # Section 1 & 4: Entities
    person_count = sum(1 for e in entities if e.get("type", "").upper() == "PERSON")
    org_count = sum(1 for e in entities if e.get("type", "").upper() == "ORGANIZATION")
    loc_count = sum(1 for e in entities if e.get("type", "").upper() == "LOCATION")
    veh_count = sum(1 for e in entities if e.get("type", "").upper() == "VEHICLE")
    
    important_entities = [
        {"name": e.get("name"), "type": e.get("type"), "risk_score": e.get("risk_score", 0)}
        for e in sorted(entities, key=lambda x: x.get("risk_score", 0), reverse=True)[:15]
    ]
    
    high_risk_entities = [e for e in important_entities if e.get("risk_score", 0) > 0.7]
    medium_risk_entities = [e for e in important_entities if 0.4 <= e.get("risk_score", 0) <= 0.7]

    # Section 5 & 10: Relationships & Network Analysis
    relationship_types = {}
    for r in relationships:
        rtype = r.get("type", "UNKNOWN")
        relationship_types[rtype] = relationship_types.get(rtype, 0) + 1
        
    entity_map = {str(e["_id"]): e.get("name") for e in entities}
    important_relationships = []
    for r in relationships[:20]:
        src_id = str(r.get("source_entity_id", ""))
        tgt_id = str(r.get("target_entity_id", ""))
        src_name = entity_map.get(src_id, src_id if src_id and src_id != 'None' else "Unknown")
        tgt_name = entity_map.get(tgt_id, tgt_id if tgt_id and tgt_id != 'None' else "Unknown")
        important_relationships.append({
            "source": src_name,
            "target": tgt_name,
            "type": r.get("type", "UNKNOWN")
        })

    # Section 7: Timeline Events
    timeline_events = [
        {
            "name": e.get("name"), 
            "date": e.get("properties", {}).get("timestamp") or e.get("properties", {}).get("date") or (e.get("created_at").isoformat() if hasattr(e.get("created_at"), "isoformat") else str(e.get("created_at"))),
            "type": e.get("type")
        }
        for e in entities if e.get("type") in ["EVENT", "COMMUNICATION"] or "date" in e.get("properties", {}) or "timestamp" in e.get("properties", {})
    ]
    
    # Sort timeline by date string (basic sort)
    timeline_events = sorted(timeline_events, key=lambda x: str(x.get("date", "")), reverse=True)

    # Section 8: Geographic Intelligence
    geographic_locations = [
        {"name": e.get("name"), "coordinates": e.get("properties", {}).get("coordinates", "Unknown")}
        for e in entities if e.get("type", "").upper() == "LOCATION"
    ]

    # Compile the final report JSON structure
    report = {
        "case_overview": {
            "name": case.get("name"),
            "description": case.get("description"),
            "status": case.get("status"),
            "priority": case.get("priority", "MEDIUM"),
            "created_at": str(case.get("created_at")),
            "investigator": case.get("investigator") or case.get("created_by", "UNASSIGNED")
        },
        "metadata_summary": {
            "total_entities": len(entities),
            "total_relationships": len(relationships),
            "total_evidence": len(evidence),
            "total_alerts": 0
        },
        "entity_intelligence": {
            "total": len(entities),
            "persons": person_count,
            "organizations": org_count,
            "locations": loc_count,
            "vehicles": veh_count,
            "high_risk_count": len(high_risk_entities),
            "important_entities": important_entities
        },
        "network_analysis": {
            "total_nodes": len(entities),
            "total_edges": len(relationships),
            "relationship_distribution": relationship_types
        },
        "risk_assessment": {
            "overall_risk": "HIGH" if len(high_risk_entities) > 3 else "MEDIUM",
            "critical_entities": high_risk_entities[:5],
            "medium_risk_entities": medium_risk_entities[:5]
        },
        "timeline_summary": {
            "total_events": len(timeline_events),
            "earliest_event": timeline_events[-1] if timeline_events else None,
            "latest_event": timeline_events[0] if timeline_events else None,
            "events": timeline_events[:15]
        },
        "geographic_intelligence": {
            "total_locations": len(geographic_locations),
            "locations": geographic_locations
        },
        "evidence_summary": {
            "total": len(evidence),
            "files": [{"title": ev.get("title"), "type": ev.get("source_type"), "date": str(ev.get("created_at"))} for ev in evidence]
        },
        "relationship_analysis": {
            "important_relationships": important_relationships
        },
        "ai_assessment": {
            "overall_assessment": "Insufficient data to generate assessment.",
            "key_findings": [],
            "network_assessment": "No network assessment available.",
            "risk_assessment": "No risk assessment available.",
            "geographic_timeline_observations": "No geographic/timeline information available.",
            "investigative_leads": []
        }
    }

    # Generate AI insights based on factual data
    context = (
        f"Case: {case.get('name', 'Unknown')}. Desc: {case.get('description', 'No description')}.\n"
        f"Metrics: {len(entities)} entities, {len(relationships)} relationships, {len(evidence)} evidence files.\n"
        f"High Risk Entities ({len(high_risk_entities)}): {json.dumps([e['name'] for e in high_risk_entities[:5]])}\n"
        f"Geographic Locations ({len(geographic_locations)}): {json.dumps([e['name'] for e in geographic_locations[:5]])}\n"
        f"Timeline Events ({len(timeline_events)}): {json.dumps([e['name'] for e in timeline_events[:5]])}\n"
        f"Important Relationships ({len(important_relationships)}): {json.dumps([str(r.get('source')) + ' ' + str(r.get('type')) + ' ' + str(r.get('target')) for r in important_relationships[:5]])}\n"
    )
    
    prompt = f"""Analyze the following factual case data and generate a professional AI Investigative Assessment.
Ground your response strictly in the provided data. DO NOT hallucinate. 
Never fabricate: people, organizations, accounts, transactions, relationships, locations, dates, evidence, criminal activity, investigative findings.
The AI must reason ONLY from this case context.
If evidence is 0, explicitly state that no evidence records are available.
If relationships is 0, explicitly state that no relationship records are available.
If locations or timeline events are 0, explicitly state that sufficient geographic/timeline information is unavailable.
Use professional investigative decision-support language (e.g., "The available case data indicates...").
Never state or imply legal guilt.

Data:
{context}

Format your response EXACTLY as JSON with the following structure:
{{
  "executive_summary": "string",
  "ai_insights": "string",
  "recommendations": "string",
  "overall_assessment": "string",
  "key_findings": ["string", "string"],
  "network_assessment": "string",
  "risk_assessment": "string",
  "geographic_timeline_observations": "string",
  "investigative_leads": ["string", "string"]
}}"""
    
    try:
        # Use a faster, smaller model (7B) for report generation to significantly increase generation speed
        ai_response = await generate("You are an expert investigation assistant.", prompt, format="json")
        if not ai_response:
            raise ValueError("AI returned an empty response. Falling back to rule-based summary.")
            
        # clean json
        ai_response = ai_response.replace("```json", "").replace("```", "").strip()
        # Find the first { and last } to handle extra text from LLM
        start_idx = ai_response.find("{")
        end_idx = ai_response.rfind("}")
        if start_idx != -1 and end_idx != -1:
            ai_response = ai_response[start_idx:end_idx+1]
            
        res_dict = json.loads(ai_response)
        
        # Restore backward compatibility fields at the top level
        report["executive_summary"] = res_dict.get("executive_summary", "Executive summary not available.")
        report["ai_insights"] = res_dict.get("ai_insights", "AI insights not available.")
        report["recommendations"] = res_dict.get("recommendations", "Recommendations not available.")
        
        report["ai_assessment"] = {
            "overall_assessment": res_dict.get("overall_assessment", "Failed to parse overall assessment."),
            "key_findings": res_dict.get("key_findings", []),
            "network_assessment": res_dict.get("network_assessment", "Failed to parse network assessment."),
            "risk_assessment": res_dict.get("risk_assessment", "Failed to parse risk assessment."),
            "geographic_timeline_observations": res_dict.get("geographic_timeline_observations", "Failed to parse observations."),
            "investigative_leads": res_dict.get("investigative_leads", [])
        }
    except Exception as e:
        print("AI generation failed or not configured, using fallback:", str(e))
        report["executive_summary"] = f"Executive summary for case '{case.get('name')}'. This case involves {len(entities)} entities and {len(relationships)} relationships."
        report["ai_insights"] = f"Initial analysis reveals {len(high_risk_entities)} high risk entities out of {len(entities)} total entities."
        report["recommendations"] = "Please review the high-risk entities and their relationships manually as AI generation is currently unavailable."
        report["ai_assessment"] = {
            "overall_assessment": f"This case '{case.get('name')}' contains {len(entities)} extracted entities and {len(relationships)} known relationships based on {len(evidence)} evidence files.",
            "key_findings": ["Review high-risk entities.", "Investigate heavily connected hubs.", "Verify geographic coordinates of known locations."],
            "network_assessment": "Fallback network assessment.",
            "risk_assessment": f"{len(high_risk_entities)} entities have been flagged as high risk.",
            "geographic_timeline_observations": "Geographic and timeline assessment could not be generated at this time.",
            "investigative_leads": ["Check evidence files manually."]
        }

    return report
