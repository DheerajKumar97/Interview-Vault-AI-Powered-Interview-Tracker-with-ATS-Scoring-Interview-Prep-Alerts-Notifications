"""
Policy Knowledge Base - Provides Interview Vault policy information to the chatbot.
Uses a local JSON cache file for reliability.
"""
import logging
import json
import os

# Configure logging
logger = logging.getLogger(__name__)

# Path to the cache file
CACHE_FILE = os.path.join(os.path.dirname(__file__), "policy_cache.json")

def _load_cache() -> dict:
    """Load policy data from the local JSON cache file."""
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load policy cache: {e}")
    return {}

def _format_policy_text(cache_data: dict) -> str:
    """Format the cached policy data into a readable string for the LLM."""
    if not cache_data:
        return "## POLICY KNOWLEDGE BASE\n\nPolicy information is currently unavailable.\n"
    
    text = "## INTERVIEW VAULT POLICY KNOWLEDGE BASE\n\n"
    for name, content in cache_data.items():
        text += f"### {name}\n{content}\n\n"
    return text

# Pre-load the cache at module import time for fast access
_POLICY_CACHE = _load_cache()
_FORMATTED_POLICY_TEXT = _format_policy_text(_POLICY_CACHE)

async def get_policy_knowledge_base() -> str:
    """
    Returns the policy knowledge base string.
    This is loaded from a local cache file for reliability.
    """
    return _FORMATTED_POLICY_TEXT


def refresh_policy_cache():
    """
    Manually refresh the policy cache from the file.
    Call this if the policy_cache.json file is updated at runtime.
    """
    global _POLICY_CACHE, _FORMATTED_POLICY_TEXT
    _POLICY_CACHE = _load_cache()
    _FORMATTED_POLICY_TEXT = _format_policy_text(_POLICY_CACHE)
    logger.info("Policy cache refreshed from file.")
