from app.ai.model_manager import hf_client
from typing import List, Dict

async def extract_entities(text: str) -> List[Dict]:
    if not hf_client:
        return [{"error": "Hugging Face API key not configured"}]
    
    try:
        # Use a generic NER model
        model = "dslim/bert-base-NER"
        results = hf_client.token_classification(text, model=model)
        
        entities = []
        for res in results:
            entities.append({
                "word": res["word"],
                "entity_group": res["entity_group"],
                "score": res["score"]
            })
        return entities
    except Exception as e:
        return [{"error": str(e)}]
