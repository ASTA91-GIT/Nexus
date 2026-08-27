from app.ai.model_manager import hf_client

async def summarize_text(text: str) -> str:
    if not hf_client:
        return "Hugging Face API key not configured. Summary unavailable."
    
    try:
        model = "facebook/bart-large-cnn"
        # HF InferenceClient summarization
        result = hf_client.summarization(text, model=model)
        if result and isinstance(result, list) and len(result) > 0:
            return result[0]["summary_text"]
        return "No summary generated."
    except Exception as e:
        return f"Error generating summary: {str(e)}"
