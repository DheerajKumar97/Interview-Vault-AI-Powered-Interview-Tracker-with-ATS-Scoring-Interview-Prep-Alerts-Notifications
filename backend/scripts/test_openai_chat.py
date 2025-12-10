
import sys
import os
from pathlib import Path
import asyncio

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import settings
from services.ai_service import call_openai_api

async def test():
    print("🧪 Testing OpenAI Integration...")
    
    if not settings.OPENAI_API_KEY:
        print("❌ No OPENAI_API_KEY found in settings!")
        return

    print(f"🔑 API Key found (starts with): {settings.OPENAI_API_KEY[:8]}...")
    
    try:
        print("📡 Sending request to OpenAI (gpt-4o-mini)...")
        response = await call_openai_api(
            prompt="Hello! succinctly confirm you are gpt-4o-mini.", 
            model="gpt-4o-mini",
            max_tokens=50
        )
        print("\n✅ OpenAI Response:")
        print(f"   {response}")
        print("\n✨ Service layer verification PASSED")
    except Exception as e:
        print(f"\n❌ OpenAI verification FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test())
