"""
Email Router - Handles all email-related API endpoints
"""
import random
import hmac
import hashlib
import time
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from config import settings
from services.email_service import (
    send_email_via_brevo,
    get_signin_email_html,
    get_signup_email_html,
    get_otp_email_html,
)

router = APIRouter()


# Request models
class SignInEmailRequest(BaseModel):
    email: EmailStr
    fullName: Optional[str] = None
    browserInfo: Optional[str] = None
    ipAddress: Optional[str] = None
    loginTime: Optional[str] = None


class SignUpEmailRequest(BaseModel):
    email: EmailStr
    fullName: Optional[str] = None


class DigestEmailRequest(BaseModel):
    email: EmailStr
    userId: Optional[str] = None
    frequency: Optional[str] = "daily"
    dashboardStats: Optional[dict] = None
    recentApplications: Optional[list] = None


class OTPEmailRequest(BaseModel):
    email: EmailStr


# Helper function to sign OTP
def sign_otp(email: str, otp: str, expires_at: int) -> str:
    """Generate HMAC signature for OTP verification"""
    data = f"{email}.{otp}.{expires_at}"
    return hmac.new(
        settings.SUPABASE_SERVICE_ROLE_KEY.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()


@router.post("/send-signin-email")
async def send_signin_email(request: SignInEmailRequest):
    """Send sign-in notification email"""
    try:
        print(f" Sending Sign In email to: {request.email}")
        
        html_content = get_signin_email_html(
            full_name=request.fullName or "User",
            email=request.email,
            login_time=request.loginTime or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            browser_info=request.browserInfo or "Unknown",
            ip_address=request.ipAddress or "Not Available"
        )
        
        result = await send_email_via_brevo(
            to_email=request.email,
            to_name=request.fullName or "User",
            subject="🔐 New Login to Interview Vault",
            html_content=html_content
        )
        
        print(f" Sign In email sent via Brevo: {result.get('messageId')}")
        return result
        
    except Exception as e:
        print(f" Error sending sign in email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/send-signup-email")
async def send_signup_email(request: SignUpEmailRequest):
    """Send welcome email after signup"""
    try:
        print(f" Sending Sign Up email to: {request.email}")
        
        html_content = get_signup_email_html(
            full_name=request.fullName or "Future Achiever",
            email=request.email
        )
        
        result = await send_email_via_brevo(
            to_email=request.email,
            to_name=request.fullName or "Future Achiever",
            subject="🎉 Welcome to Interview Vault!",
            html_content=html_content
        )
        
        print(f" Sign Up email sent via Brevo: {result.get('messageId')}")
        return result
        
    except Exception as e:
        print(f" Error sending sign up email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/send-otp-email")
async def send_otp_email(request: OTPEmailRequest):
    """Send OTP email for password reset"""
    try:
        print(f" Sending OTP to: {request.email}")
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        expires_at = int(time.time() * 1000) + (10 * 60 * 1000)  # 10 minutes
        otp_hash = sign_otp(request.email, otp, expires_at)
        
        html_content = get_otp_email_html(otp)
        
        result = await send_email_via_brevo(
            to_email=request.email,
            to_name="User",
            subject="🔐 Your Password Reset OTP",
            html_content=html_content,
            sender_name="Interview Vault Security"
        )
        
        print(f" OTP email sent: {result.get('messageId')}")
        
        return {
            "success": True,
            "messageId": result.get("messageId"),
            "token": {
                "hash": otp_hash,
                "expiresAt": expires_at
            }
        }
        
    except Exception as e:
        print(f" Error sending OTP email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send OTP email: {str(e)}")


@router.post("/send-digest-email")
async def send_digest_email(request: DigestEmailRequest):
    """Send email digest with dashboard stats"""
    try:
        print(f" Sending Email Digest to: {request.email}")
        print(f"📋 Frequency: {request.frequency}")
        
        frequency_labels = {
            "daily": "Daily",
            "weekly": "Weekly",
            "bi-weekly": "Bi-Weekly",
            "monthly": "Monthly",
            "quarterly": "Quarterly"
        }
        
        stats = request.dashboardStats or {}
        recent_apps = request.recentApplications or []
        
        # Build HTML content (simplified version - full version is in Node.js)
        html_content = _build_digest_email_html(
            frequency=frequency_labels.get(request.frequency, "Scheduled"),
            stats=stats,
            recent_apps=recent_apps
        )
        
        result = await send_email_via_brevo(
            to_email=request.email,
            to_name="User",
            subject=f" Your {frequency_labels.get(request.frequency, 'Scheduled')} Interview Vault Digest",
            html_content=html_content
        )
        
        print(f" Email Digest sent via Brevo: {result.get('messageId')}")
        return result
        
    except Exception as e:
        print(f" Error sending email digest: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email digest: {str(e)}")


def _get_status_badge_style(status: str) -> str:
    """Get CSS style for status badge"""
    styles = {
        "HR Screening Done": "background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); color: white;",
        "Shortlisted": "background: linear-gradient(135deg, #A855F7 0%, #C084FC 100%); color: white;",
        "Interview Scheduled": "background: linear-gradient(135deg, #A855F7 0%, #C084FC 100%); color: white;",
        "Interview Rescheduled": "background: linear-gradient(135deg, #A855F7 0%, #C084FC 100%); color: white;",
        "Selected": "background: linear-gradient(135deg, #10B981 0%, #34D399 100%); color: white;",
        "Offer Released": "background: linear-gradient(135deg, #10B981 0%, #34D399 100%); color: white;",
        "Ghosted": "background: linear-gradient(135deg, #EF4444 0%, #F87171 100%); color: white;"
    }
    return styles.get(status, "background: #E5E7EB; color: #374151;")


def _build_digest_email_html(frequency: str, stats: dict, recent_apps: list) -> str:
    """Build HTML content for digest email"""
    total_apps = stats.get("totalApplications", 0)
    status_counts = stats.get("statusCounts", {})
    
    # Build KPI cards
    kpi_cards = f'''
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 30px 0;">
        <div style="background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%); padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #A78BFA;">
            <div style="font-size: 36px; font-weight: 800; color: #6D28D9; margin-bottom: 8px;">{total_apps}</div>
            <div style="font-size: 12px; color: #7C3AED; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Total Applications</div>
        </div>
        <div style="background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%); padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #60A5FA;">
            <div style="font-size: 36px; font-weight: 800; color: #1E40AF; margin-bottom: 8px;">{status_counts.get('HR Screening Done', 0)}</div>
            <div style="font-size: 12px; color: #2563EB; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">HR Screening</div>
        </div>
        <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #34D399;">
            <div style="font-size: 36px; font-weight: 800; color: #065F46; margin-bottom: 8px;">{status_counts.get('Selected', 0)}</div>
            <div style="font-size: 12px; color: #047857; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Selected</div>
        </div>
        <div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); padding: 20px; border-radius: 12px; text-align: center; border: 2px solid #34D399;">
            <div style="font-size: 36px; font-weight: 800; color: #065F46; margin-bottom: 8px;">{status_counts.get('Offer Released', 0)}</div>
            <div style="font-size: 12px; color: #047857; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Offers</div>
        </div>
    </div>
    '''
    
    # Build recent applications table
    recent_rows = ""
    for app in recent_apps[:10]:
        company_name = app.get("companies", {}).get("name") or app.get("name", "N/A")
        job_title = app.get("job_title", "N/A")
        status = app.get("current_status", "Unknown")
        applied_date = app.get("applied_date", "N/A")
        
        recent_rows += f'''
        <tr style="border-bottom: 1px solid #E9D5FF;">
            <td style="padding: 14px 16px; font-weight: 600; color: #1F2937; font-size: 13px;">{company_name}</td>
            <td style="padding: 14px 16px; color: #4B5563; font-size: 13px;">{job_title}</td>
            <td style="padding: 14px 16px; text-align: center;">
                <span style="{_get_status_badge_style(status)} padding: 5px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; display: inline-block;">
                    {status}
                </span>
            </td>
            <td style="padding: 14px 16px; text-align: right; color: #6B7280; font-size: 12px;">{applied_date}</td>
        </tr>
        '''
    
    if not recent_rows:
        recent_rows = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9CA3AF;">No recent applications</td></tr>'
    
    recent_table = f'''
    <div style="margin: 30px 0; overflow-x: auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
                <tr style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);">
                    <th style="padding: 16px; text-align: left; color: white; font-weight: 700; font-size: 14px; border-top-left-radius: 12px;">Company</th>
                    <th style="padding: 16px; text-align: left; color: white; font-weight: 700; font-size: 14px;">Position</th>
                    <th style="padding: 16px; text-align: center; color: white; font-weight: 700; font-size: 14px;">Status</th>
                    <th style="padding: 16px; text-align: right; color: white; font-weight: 700; font-size: 14px; border-top-right-radius: 12px;">Applied Date</th>
                </tr>
            </thead>
            <tbody>
                {recent_rows}
            </tbody>
        </table>
    </div>
    '''
    
    app_url = settings.VITE_APP_URL
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F9FAFB; margin: 0; padding: 0; }}
            .container {{ max-width: 700px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 40px 30px; text-align: center; }}
            .logo {{ width: 280px; height: auto; margin-bottom: 20px; }}
            .content {{ padding: 40px 30px; }}
            .footer {{ background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%); padding: 30px; text-align: center; font-size: 13px; color: #6B7280; border-top: 3px solid #8B5CF6; }}
            .btn {{ display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; margin: 25px 0; font-weight: 600; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }}
            h1 {{ margin: 0; font-size: 32px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            h2 {{ color: #6D28D9; font-size: 24px; margin-top: 40px; margin-bottom: 20px; font-weight: 800; }}
            p {{ line-height: 1.7; color: #4B5563; font-size: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://raw.githubusercontent.com/DheerajKumar97/Interview-Vault-BI-Powered-Interview-Tracker-with-ATS-Score-Calculation-Alerts-and-Nofitication/main/public/logo.png" alt="Interview Vault" class="logo">
                <h1> Your {frequency} Digest</h1>
                <p style="margin-top: 10px; opacity: 0.95; font-size: 16px;">Application Tracking Summary</p>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>Here's your {frequency.lower()} summary of your interview applications in <strong>Interview Vault</strong>.</p>
                
                <h2> Key Metrics</h2>
                {kpi_cards}

                <h2>🕒 Recent Applications</h2>
                {recent_table}

                <p style="text-align: center; margin-top: 40px;">
                    <a href="{app_url}/dashboard" class="btn">View Full Dashboard</a>
                </p>
                
                <p style="margin-top: 35px; font-size: 14px; color: #6B7280; text-align: center;">
                    Questions? Contact us at <a href="mailto:interviewvault.2026@gmail.com" style="color: #8B5CF6; text-decoration: none; font-weight: 600;">interviewvault.2026@gmail.com</a>
                </p>
            </div>
            <div class="footer">
                <p><strong>Interview Vault</strong> - Your Job Application Companion</p>
                <p>&copy; 2025 Interview Vault. All rights reserved.</p>
                <p>Made by <strong>Dheeraj Kumar K</strong> for Job Seekers</p>
            </div>
        </div>
    </body>
    </html>
    '''
