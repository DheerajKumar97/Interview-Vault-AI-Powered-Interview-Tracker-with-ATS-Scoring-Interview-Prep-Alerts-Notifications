"""
Configuration module for Interview Vault Python Backend
Loads environment variables with support for both VITE_ and non-prefixed variants
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory (project root)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


class Settings:
    """Application settings loaded from environment variables"""
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL', '')
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_SERVICE_ROLE_KEY', '')
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    
    # Email Configuration (Brevo)
    BREVO_API_KEY: str = os.getenv('BREVO_API_KEY', '')
    SMTP_USER: str = os.getenv('SMTP_USER', 'interviewvault2026@gmail.com')
    SMTP_PASS: str = os.getenv('SMTP_PASS', '')
    
    # AI API Keys
    PERPLEXITY_API_KEY: str = os.getenv('PERPLEXITY_API_KEY', '')
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    HUGGINGFACE_API_KEY: str = os.getenv('HUGGINGFACE_API_KEY', '')
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY') or os.getenv('OPEN_API_KEY', '')
    
    # Application URLs
    FRONTEND_URL: str = os.getenv('FRONTEND_URL', 'https://dheerajkumar-k-interview-vault.netlify.app')
    VITE_APP_URL: str = os.getenv('VITE_APP_URL', 'http://localhost:8080')
    VITE_API_URL: str = os.getenv('VITE_API_URL', '/api')
    RENDER_EXTERNAL_URL: str = os.getenv('RENDER_EXTERNAL_URL', '')
    
    # Server Configuration
    PORT: int = int(os.getenv('PORT', '3001'))
    NODE_ENV: str = os.getenv('NODE_ENV', 'development')
    
    @classmethod
    def get_perplexity_keys(cls) -> list[str]:
        """
        Parse PERPLEXITY_API_KEY which can be a single key or JSON array
        Returns a list of API keys to try in order
        """
        raw_key = cls.PERPLEXITY_API_KEY
        if not raw_key:
            return []
        
        try:
            # Try to parse as JSON array
            parsed = json.loads(raw_key)
            if isinstance(parsed, list):
                return [k.strip() for k in parsed if k.strip()]
            return [raw_key.strip()]
        except json.JSONDecodeError:
            # Single key
            return [raw_key.strip()]
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode"""
        return cls.NODE_ENV == 'production'
    
    @classmethod
    def validate(cls) -> dict[str, bool]:
        """Validate that required environment variables are set"""
        return {
            'SUPABASE_URL': bool(cls.SUPABASE_URL),
            'SUPABASE_SERVICE_ROLE_KEY': bool(cls.SUPABASE_SERVICE_ROLE_KEY),
            'BREVO_API_KEY': bool(cls.BREVO_API_KEY),
            'BREVO_API_KEY': bool(cls.BREVO_API_KEY),
            'PERPLEXITY_API_KEY': bool(cls.PERPLEXITY_API_KEY),
            'OPENAI_API_KEY': bool(cls.OPENAI_API_KEY),
        }


# Singleton instance
settings = Settings()
