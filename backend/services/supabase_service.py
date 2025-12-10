"""
Supabase Service - Python client for Supabase operations
"""
from supabase import create_client, Client
from config import settings


def get_supabase_client() -> Client:
    """Get Supabase client with service role key for admin operations"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase URL and Service Role Key are required")
    
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )


def get_supabase_anon_client() -> Client:
    """Get Supabase client with publishable key for public operations"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        raise ValueError("Supabase URL and Publishable Key are required")
    
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_PUBLISHABLE_KEY
    )


# Singleton instances
_admin_client: Client | None = None
_anon_client: Client | None = None


def get_admin_client() -> Client:
    """Get or create admin Supabase client (singleton)"""
    global _admin_client
    if _admin_client is None:
        _admin_client = get_supabase_client()
    return _admin_client


def get_anon_client() -> Client:
    """Get or create anonymous Supabase client (singleton)"""
    global _anon_client
    if _anon_client is None:
        _anon_client = get_supabase_anon_client()
    return _anon_client
