"""
AI Service - Handles AI API calls
"""
from typing import Optional
from config import settings


async def call_openai_api(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "gpt-4o-mini",
    temperature: float = 0.7,
    max_tokens: int = 4000,
    timeout: float = 60.0,
    json_mode: bool = False
) -> str:
    """
    Call OpenAI API using the AsyncOpenAI client.
    """
    from openai import AsyncOpenAI
    
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        raise ValueError("No OPENAI_API_KEY found in environment")
        
    client = AsyncOpenAI(api_key=api_key, timeout=timeout)
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    response_format = {"type": "json_object"} if json_mode else None
    
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f" OpenAI API Error: {str(e)}")
        raise e


def truncate_text(text: str, max_chars: int = 1500) -> str:
    """Truncate text to reduce token count"""
    if not text:
        return ""
    return text[:max_chars] + "..." if len(text) > max_chars else text

