from app.ai.model_manager import hf_client
from typing import Dict, Any, List
import json
import re

EXTRACTION_PROMPT = """
You are an expert intelligence analyst. Your task is to extract meaningful investigation entities and their relationships from the provided evidence text.

Supported Entity Types:
- PERSON
- ORGANIZATION
- LOCATION
- COMMUNICATION
- ACCOUNT
- VEHICLE
- PHONE_NUMBER
- EMAIL
- EVENT
- DOCUMENT

Instructions:
1. Identify all key entities in the text matching the supported types.
2. Identify relationships between these entities (e.g., PERSON "KNOWS" PERSON, PERSON "WORKS_FOR" ORGANIZATION).
3. Return the result strictly as a JSON object with two keys: "entities" and "relationships".
4. Do not include markdown formatting, explanations, or any other text outside the JSON object.

JSON Format:
{{
  "entities": [
    {{
      "name": "Entity Name",
      "type": "ENTITY_TYPE",
      "description": "Brief description based on text",
      "risk_score": 0.5
    }}
  ],
  "relationships": [
    {{
      "source": "Source Entity Name",
      "target": "Target Entity Name",
      "type": "RELATIONSHIP_TYPE",
      "description": "Brief description of connection"
    }}
  ]
}}

Text to analyze:
{text}
"""

async def extract_entities_and_relationships(text: str) -> Dict[str, Any]:
    if not hf_client:
        return {"error": "Hugging Face API key not configured", "entities": [], "relationships": []}
    
    # Simple chunking if text is too long (HuggingFace free API often limits context)
    # We will just take the first 4000 characters for now to avoid context limits,
    # or chunk it. For this implementation, we will process up to 6000 chars.
    process_text = text[:6000]
    
    messages = [
        {"role": "system", "content": "You are a precise data extraction system that outputs only valid JSON."},
        {"role": "user", "content": EXTRACTION_PROMPT.format(text=process_text)}
    ]
    
    try:
        response = hf_client.chat_completion(
            messages=messages,
            model="Qwen/Qwen2.5-72B-Instruct",
            max_tokens=4000,
            temperature=0.1
        )
        
        reply = response.choices[0].message.content.strip()
        
        # Robust JSON parsing
        # Strip markdown fences if present
        if reply.startswith("```"):
            reply = re.sub(r"^```(?:json)?\n?", "", reply)
            reply = re.sub(r"\n?```$", "", reply)
            
        # Try to find the JSON object if there's extra text
        start_idx = reply.find("{")
        end_idx = reply.rfind("}")
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            reply = reply[start_idx:end_idx+1]
            
        data = json.loads(reply)
        
        entities = data.get("entities", [])
        relationships = data.get("relationships", [])
        
        return {
            "entities": entities,
            "relationships": relationships
        }
        
    except json.JSONDecodeError as e:
        error_msg = f"JSON Parse Error in extraction: {e}. Raw reply: {reply[:500]}"
        print(error_msg)
        return {"error": "Failed to parse JSON from AI", "entities": [], "relationships": [], "raw": reply, "details": error_msg}
    except Exception as e:
        error_msg = f"AI Extraction API Error: {str(e)}"
        print(error_msg)
        return {"error": str(e), "entities": [], "relationships": [], "details": error_msg}

# For backward compatibility if anything else calls the old function
async def extract_entities(text: str) -> List[Dict]:
    res = await extract_entities_and_relationships(text)
    if "error" in res and not res.get("entities"):
        return [{"error": res["error"]}]
        
    # Map back to old NER format if needed, but preferably callers are updated.
    # The old format was: [{"word": "name", "entity_group": "TYPE", "score": 0.99}]
    old_format = []
    for ent in res.get("entities", []):
        old_format.append({
            "word": ent.get("name"),
            "entity_group": ent.get("type"),
            "score": ent.get("risk_score", 0.5)
        })
    return old_format
