"""
Utils Router - Handles utility endpoints (email validation, env update)
"""
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from utils.email_validation import check_email

router = APIRouter()


# Request models
class ValidateEmailRequest(BaseModel):
    email: EmailStr


class UpdateEnvRequest(BaseModel):
    key: str
    value: str


@router.post("/validate-email")
async def validate_email(request: ValidateEmailRequest):
    """Validate email address using DNS MX record lookup"""
    try:
        print(f"📧 Validating email: {request.email}")
        
        result = await check_email(request.email)
        
        return result
        
    except Exception as e:
        print(f"❌ Error validating email: {str(e)}")
        return {
            "valid": False,
            "email": request.email,
            "error": str(e),
            "message": str(e),
            "mailboxExists": False
        }


@router.post("/update-env")
async def update_env(request: UpdateEnvRequest):
    """Update environment variable in .env file"""
    try:
        if not request.key or not request.value:
            raise HTTPException(status_code=400, detail="Key and value are required")
        
        # 1. Update process environment immediately for current session
        os.environ[request.key] = request.value
        
        # 2. Update .env file for persistence
        env_path = Path(__file__).parent.parent.parent / ".env"
        
        env_content = ""
        if env_path.exists():
            env_content = env_path.read_text()
        
        # Check if key exists and replace/append
        import re
        pattern = rf'^{re.escape(request.key)}\s*=.*'
        
        if re.search(pattern, env_content, re.MULTILINE):
            # Replace existing key
            env_content = re.sub(
                pattern,
                f'{request.key}="{request.value}"',
                env_content,
                flags=re.MULTILINE
            )
        else:
            # Append if not found
            env_content = env_content.strip() + f'\n{request.key}="{request.value}"'
        
        env_path.write_text(env_content.strip() + '\n')
        
        masked_value = request.value[:5] + "..." if len(request.value) > 5 else request.value
        print(f'✅ Updated .env file: {request.key}="{masked_value}"')
        
        return {"success": True, "message": "Environment variable updated"}
        
    except Exception as e:
        print(f"❌ Error updating .env: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update environment variable: {str(e)}")
