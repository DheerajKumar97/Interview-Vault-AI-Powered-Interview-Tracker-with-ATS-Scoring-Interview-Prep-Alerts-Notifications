"""
Auth Router - Handles authentication-related API endpoints (OTP verification, password reset)
"""
import hmac
import hashlib
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from config import settings
from services.supabase_service import get_admin_client

router = APIRouter()


# Request models
class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    token: dict  # Contains hash and expiresAt


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str
    token: dict  # Contains hash and expiresAt


def sign_otp(email: str, otp: str, expires_at: int) -> str:
    """Generate HMAC signature for OTP verification"""
    data = f"{email}.{otp}.{expires_at}"
    return hmac.new(
        settings.SUPABASE_SERVICE_ROLE_KEY.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()


@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP code"""
    try:
        otp_hash = request.token.get("hash")
        expires_at = request.token.get("expiresAt")
        
        if not otp_hash or not expires_at:
            raise HTTPException(status_code=400, detail="Invalid token format")
        
        # Check expiration
        current_time = int(time.time() * 1000)
        if current_time > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Verify hash
        expected_hash = sign_otp(request.email, request.otp, expires_at)
        
        if otp_hash != expected_hash:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        return {"success": True, "message": "OTP verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error verifying OTP: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to verify OTP: {str(e)}")


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset user password after OTP verification"""
    try:
        otp_hash = request.token.get("hash")
        expires_at = request.token.get("expiresAt")
        
        if not otp_hash or not expires_at:
            raise HTTPException(status_code=400, detail="Invalid token format")
        
        # Check expiration
        current_time = int(time.time() * 1000)
        if current_time > expires_at:
            raise HTTPException(status_code=400, detail="OTP has expired")
        
        # Verify hash
        expected_hash = sign_otp(request.email, request.otp, expires_at)
        
        if otp_hash != expected_hash:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        
        print(f"✅ OTP Verified for: {request.email}")
        
        # Get Supabase admin client
        supabase = get_admin_client()
        
        # List all users to find the one with matching email
        users_response = supabase.auth.admin.list_users()
        
        user = None
        for u in users_response:
            if hasattr(u, 'email') and u.email == request.email:
                user = u
                break
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update password
        supabase.auth.admin.update_user_by_id(
            user.id,
            {"password": request.newPassword}
        )
        
        print(f"✅ Password reset successfully for: {request.email}")
        return {"success": True, "message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error resetting password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")
