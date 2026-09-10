import os
import httpx
import json
import asyncio
from typing import Optional

OLLAMA_URL = os.getenv("NEXUS_LOCAL_AI_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("NEXUS_LOCAL_AI_MODEL", "qwen2.5:7b")

async def generate(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 4000,
    model: str = OLLAMA_MODEL,
    format: Optional[str] = None
) -> str:
    """
    Central local AI service for communicating with Ollama.
    """
    try:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        if format:
            payload["format"] = format
            
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{OLLAMA_URL}/api/chat",
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "").strip()
            except httpx.ReadTimeout:
                print(f"[LOCAL_AI] Timeout communicating with Ollama at {OLLAMA_URL}")
                raise TimeoutError("LOCAL_AI_TIMEOUT")
            except httpx.RequestError as exc:
                print(f"[LOCAL_AI] Request error: {exc}")
                raise ConnectionError("LOCAL_AI_UNAVAILABLE")
                
    except TimeoutError:
        raise
    except ConnectionError:
        raise
    except Exception as e:
        print(f"[LOCAL_AI] Unexpected error: {e}")
        raise RuntimeError(f"LOCAL_AI_ERROR: {e}")
