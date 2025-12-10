"""
Email Service - Send emails via Brevo API
"""
import httpx
from config import settings


async def send_email_via_brevo(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    sender_name: str = "Interview Vault",
    sender_email: str = None
) -> dict:
    """
    Send email using Brevo (Sendinblue) API
    
    Args:
        to_email: Recipient email address
        to_name: Recipient name
        subject: Email subject
        html_content: HTML email body
        sender_name: Sender display name
        sender_email: Sender email address (defaults to SMTP_USER)
    
    Returns:
        dict with success status and messageId
    """
    if not settings.BREVO_API_KEY:
        raise ValueError("BREVO_API_KEY is required for sending emails")
    
    sender_email = sender_email or settings.SMTP_USER
    
    email_data = {
        "sender": {
            "name": sender_name,
            "email": sender_email
        },
        "to": [
            {
                "email": to_email,
                "name": to_name
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            json=email_data,
            headers={
                "accept": "application/json",
                "api-key": settings.BREVO_API_KEY,
                "content-type": "application/json"
            },
            timeout=15.0
        )
        
        response.raise_for_status()
        data = response.json()
        
        return {
            "success": True,
            "messageId": data.get("messageId"),
            "message": "Email sent successfully"
        }


def get_signin_email_html(
    full_name: str,
    email: str,
    login_time: str,
    browser_info: str,
    ip_address: str
) -> str:
    """Generate HTML for sign-in notification email"""
    frontend_url = settings.FRONTEND_URL
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }}
            .logo {{ width: 240px; height: auto; margin-bottom: 20px; }}
            .content {{ padding: 40px 30px; }}
            .alert-box {{ background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px; }}
            .info-table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            .info-table td {{ padding: 12px 0; border-bottom: 1px solid #eee; color: #333; }}
            .info-label {{ font-weight: 600; color: #666; width: 100px; }}
            .footer {{ background-color: #f8f9fa; padding: 25px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee; }}
            .btn {{ display: inline-block; background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin: 25px 0; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); }}
            h1 {{ margin: 0; font-size: 24px; font-weight: 700; }}
            p {{ line-height: 1.6; color: #444; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://raw.githubusercontent.com/DheerajKumar97/Interview-Vault-BI-Powered-Interview-Tracker-with-ATS-Score-Calculation-Alerts-and-Nofitication/main/public/logo.png" alt="Interview Vault" class="logo">
                <h1>New Login Detected</h1>
            </div>
            <div class="content">
                <p>Hello {full_name or 'User'},</p>
                <p>We detected a new login to your Interview Vault account.</p>
                
                <div class="alert-box">
                    <strong>⚠️ Security Alert:</strong> If this wasn't you, please change your password immediately.
                </div>
                
                <h3>Login Details</h3>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Email:</td>
                        <td>{email}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Time:</td>
                        <td>{login_time or 'Unknown'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Browser:</td>
                        <td>{browser_info or 'Unknown'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">IP Address:</td>
                        <td>{ip_address or 'Not Available'}</td>
                    </tr>
                </table>
                
                <p style="margin-top: 35px; text-align: center;">
                    <a href="{frontend_url}/auth/forgot-password" class="btn">Reset Password</a>
                </p>
                
                <p style="margin-top: 30px; font-size: 14px; color: #666;">Questions? Contact us at <a href="mailto:interviewvault.2026@gmail.com" style="color: #667eea; text-decoration: none;">interviewvault.2026@gmail.com</a></p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Interview Vault. All rights reserved.</p>
                <p>Made by <strong>Dheeraj Kumar K</strong> for Job Seekers</p>
            </div>
        </div>
    </body>
    </html>
    '''


def get_signup_email_html(full_name: str, email: str) -> str:
    """Generate HTML for sign-up welcome email"""
    app_url = settings.VITE_APP_URL
    
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 20px; text-align: center; position: relative; }}
            .logo {{ width: 300px; height: auto; margin-bottom: 25px; }}
            .content {{ padding: 40px 30px; }}
            .welcome-text {{ font-size: 18px; color: #333; line-height: 1.6; text-align: center; margin-bottom: 30px; }}
            .features-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 30px 0; }}
            .feature-card {{ background: #f8f9fa; padding: 15px; border-radius: 10px; text-align: center; border: 1px solid #eee; }}
            .feature-icon {{ font-size: 24px; margin-bottom: 10px; display: block; }}
            .feature-title {{ font-weight: 700; color: #444; display: block; margin-bottom: 5px; font-size: 14px; }}
            .feature-desc {{ font-size: 12px; color: #666; }}
            .btn {{ display: block; width: 200px; margin: 30px auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 0; border-radius: 50px; text-decoration: none; font-weight: 700; text-align: center; box-shadow: 0 4px 15px rgba(118, 75, 162, 0.4); }}
            .footer {{ background-color: #f8f9fa; padding: 30px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee; }}
            h1 {{ margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://raw.githubusercontent.com/DheerajKumar97/Interview-Vault-BI-Powered-Interview-Tracker-with-ATS-Score-Calculation-Alerts-and-Nofitication/main/public/logo.png" alt="Interview Vault" class="logo">
                <h1>Welcome Aboard! 🚀</h1>
                <p style="margin-top: 10px; opacity: 0.9;">Your dream job is just around the corner</p>
            </div>
            <div class="content">
                <p class="welcome-text">Hi {full_name or 'Future Achiever'},<br>Thank you for joining <strong>Interview Vault</strong>. We've built the ultimate tool to help you organize, track, and ace your job search.</p>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="{app_url}" class="btn">Start Tracking Now</a>
                </div>

                <h3 style="text-align: center; color: #555;">Everything you need to succeed:</h3>
                
                <div class="features-grid">
                    <div class="feature-card">
                        <span class="feature-icon">📊</span>
                        <span class="feature-title">Track Applications</span>
                        <span class="feature-desc">All your applications in one organized dashboard</span>
                    </div>
                    <div class="feature-card">
                        <span class="feature-icon">📅</span>
                        <span class="feature-title">Schedule Interviews</span>
                        <span class="feature-desc">Never miss a meeting with built-in calendar</span>
                    </div>
                    <div class="feature-card">
                        <span class="feature-icon">📈</span>
                        <span class="feature-title">View Analytics</span>
                        <span class="feature-desc">Visualize your progress and success rate</span>
                    </div>
                    <div class="feature-card">
                        <span class="feature-icon">📝</span>
                        <span class="feature-title">Manage Notes</span>
                        <span class="feature-desc">Keep track of important details and feedback</span>
                    </div>
                </div>
                
                <p style="text-align: center; margin-top: 40px; color: #666;">
                    Need help getting started? <br>
                    Contact us at <a href="mailto:interviewvault.2026@gmail.com" style="color: #667eea; text-decoration: none; font-weight: 600;">interviewvault.2026@gmail.com</a>
                </p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Interview Vault. All rights reserved.</p>
                <p>Made by <strong>Dheeraj Kumar K</strong> for Job Seekers</p>
            </div>
        </div>
    </body>
    </html>
    '''


def get_otp_email_html(otp: str) -> str:
    """Generate HTML for OTP email"""
    return f'''
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }}
            .container {{ max-width: 500px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }}
            .content {{ padding: 40px 30px; text-align: center; }}
            .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 5px; color: #667eea; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px dashed #667eea; margin: 20px 0; display: inline-block; }}
            .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>You requested to reset your password. Use the code below to proceed:</p>
                
                <div class="otp-code">{otp}</div>
                
                <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Interview Vault Security</p>
            </div>
        </div>
    </body>
    </html>
    '''
