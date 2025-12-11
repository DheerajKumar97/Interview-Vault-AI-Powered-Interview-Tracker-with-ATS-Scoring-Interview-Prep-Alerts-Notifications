import asyncio
import logging
import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Policy_Knowledge_Base import get_policy_knowledge_base

logging.basicConfig(level=logging.INFO)

async def main():
    print("Testing Policy Knowledge Base...")
    try:
        text = await get_policy_knowledge_base()
        print(f"Result length: {len(text)}")
        print("First 500 chars:")
        print(text[:500])
        
        if "Error fetching" in text:
            print("WARNING: Errors occurred during fetching.")
        elif "INTERVIEW VAULT POLICY KNOWLEDGE BASE" in text:
            print("SUCCESS: Policy knowledge base loaded correctly!")
        else:
            print("WARNING: Expected header not found.")
            
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
