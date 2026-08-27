import os
from huggingface_hub import InferenceClient
from app.core.database import settings

# Initialize the client. This requires HUGGINGFACE_API_KEY in the environment.
def get_hf_client():
    api_key = settings.HUGGINGFACE_API_KEY
    if not api_key or api_key == "your_huggingface_key_here":
        # Return None or mock client if key is not configured
        return None
    return InferenceClient(token=api_key)

hf_client = get_hf_client()
