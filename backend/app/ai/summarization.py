async def summarize_text(text: str) -> str:
    try:
        from app.ai.local_llm import generate
        system_prompt = "You are an expert summarizer. Summarize the provided text concisely."
        user_prompt = f"Text:\n{text}"
        result = await generate(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.2,
            max_tokens=500
        )
        return result if result else "No summary generated."
    except Exception as e:
        return f"Error generating summary: {str(e)}"
