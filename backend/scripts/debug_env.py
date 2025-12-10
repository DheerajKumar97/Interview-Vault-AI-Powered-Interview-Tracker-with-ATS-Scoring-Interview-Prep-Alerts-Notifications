
import os
from pathlib import Path
from dotenv import load_dotenv

def debug_env():
    # Try loading from project root
    root_env = Path(__file__).parent.parent.parent / '.env'
    print(f"Checking root .env at: {root_env}")
    print(f"Exists: {root_env.exists()}")
    
    load_dotenv(root_env)
    
    # List all keys looking like OPENAI
    print("\n🔍 Searching for OpenAI-like keys in environment:")
    found = False
    for key, val in os.environ.items():
        if "OPEN" in key.upper() or "GPT" in key.upper() or "AI" in key.upper():
            masked_val = f"{val[:5]}..." if val else "Empty"
            print(f"   {key}: {masked_val}")
            if "OPENAI" in key.upper() and val:
                found = True
                
    if not found:
        print("\n❌ No OpenAI-related keys found!")

if __name__ == "__main__":
    debug_env()
