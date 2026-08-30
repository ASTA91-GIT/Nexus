from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_database
from app.api.routes.auth import get_current_user
import httpx
import os
import json
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.ai.investigator_agent import call_hf_api

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

    # Fetch entities
    cursor = db["entities"].find({"case_id": case_id})
    entities = await cursor.to_list(length=1000)
    
    # Fetch relationships
    rel_cursor = db["relationships"].find({"case_id": case_id})
    relationships = await rel_cursor.to_list(length=1000)
    
    # Fetch evidence
    ev_cursor = db["evidence"].find({"case_id": case_id})
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
        
    important_relationships = [
        {"source": r.get("source"), "target": r.get("target"), "type": r.get("type")}
        for r in relationships[:20] # Sample up to 20 for the report
    ]

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
        "ai_insights": "Insufficient data for insights.",
        "executive_summary": "Insufficient data to generate executive summary.",
        "recommendations": "No recommendations available."
    }

    # Generate AI insights based on factual data
    context = f"Case: {case.get('name')}. Desc: {case.get('description')}. Entities: {len(entities)}. High Risk: {len(high_risk_entities)}. Relationships: {len(relationships)}. Top Entities: {json.dumps([e['name'] for e in high_risk_entities])}"
    
    prompt = f"Analyze the following factual case data and generate a short, professional executive summary, some key investigation insights, and actionable investigation recommendations. Ground your response strictly in the provided data. DO NOT hallucinate. Do not invent names, crimes, or facts.\n\nData:\n{context}\n\nFormat your response EXACTLY as JSON with keys 'executive_summary' (string), 'investigation_insights' (string), and 'recommendations' (string)."
    
    try:
        ai_response = call_hf_api("You are an expert investigation assistant.", prompt)
        if ai_response:
            # clean json
            ai_response = ai_response.replace("```json", "").replace("```", "").strip()
            res_dict = json.loads(ai_response)
            report["executive_summary"] = res_dict.get("executive_summary", "Failed to parse executive summary.")
            report["ai_insights"] = res_dict.get("investigation_insights", "Failed to parse investigation insights.")
            report["recommendations"] = res_dict.get("recommendations", "Failed to parse recommendations.")
    except Exception as e:
        print("AI generation failed or not configured, using fallback:", str(e))
        report["executive_summary"] = f"This case '{case.get('name')}' contains {len(entities)} extracted entities and {len(relationships)} known relationships based on {len(evidence)} evidence files. {len(high_risk_entities)} entities have been flagged as high risk."
        report["ai_insights"] = "AI insights could not be generated at this time."
        report["recommendations"] = "1. Review high-risk entities.\n2. Investigate heavily connected hubs.\n3. Verify geographic coordinates of known locations."

    return report
