"""
AI Service - Handles Perplexity AI API calls
"""
import httpx
from typing import Optional
from config import settings


async def call_perplexity_api(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "sonar",
    temperature: float = 0.7,
    max_tokens: int = 4000,
    timeout: float = 120.0
) -> str:
    """
    Call Perplexity AI API with retry logic for multiple API keys
    
    Args:
        prompt: User message/prompt
        system_prompt: Optional system prompt
        model: Model to use (default: sonar)
        temperature: Temperature for generation
        max_tokens: Maximum tokens to generate
        timeout: Request timeout in seconds
    
    Returns:
        Generated text response
    
    Raises:
        Exception: If all API keys fail
    """
    api_keys = settings.get_perplexity_keys()
    
    if not api_keys:
        raise ValueError("No PERPLEXITY_API_KEY found in environment")
    
    # Build messages array (no conversation history - single turn)
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    last_error = None
    
    for i, api_key in enumerate(api_keys):
        masked_key = f"{api_key[:8]}...{api_key[-4:]}"
        print(f"🔑 [PERPLEXITY {i + 1}/{len(api_keys)}] Trying: {masked_key}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.perplexity.ai/chat/completions",
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens
                    },
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {api_key}"
                    },
                    timeout=timeout
                )
                
                # Log response status for debugging
                if response.status_code != 200:
                    error_body = response.text
                    print(f"❌ [PERPLEXITY {i + 1}/{len(api_keys)}] HTTP {response.status_code}: {error_body[:500]}")
                    if i < len(api_keys) - 1:
                        print(f"   ⏭️  Trying next Perplexity key...")
                    continue
                
                data = response.json()
                
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                if content:
                    print(f"✅ [PERPLEXITY {i + 1}/{len(api_keys)}] SUCCESS!")
                    return content
                
        except Exception as e:
            last_error = e
            print(f"❌ [PERPLEXITY {i + 1}/{len(api_keys)}] FAILED: {str(e)}")
            
            if i < len(api_keys) - 1:
                print(f"   ⏭️  Trying next Perplexity key...")
    
    raise Exception(f"All Perplexity API keys failed. Last error: {last_error}")


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
        print(f"❌ OpenAI API Error: {str(e)}")
        raise e


def truncate_text(text: str, max_chars: int = 1500) -> str:
    """Truncate text to reduce token count"""
    if not text:
        return ""
    return text[:max_chars] + "..." if len(text) > max_chars else text

