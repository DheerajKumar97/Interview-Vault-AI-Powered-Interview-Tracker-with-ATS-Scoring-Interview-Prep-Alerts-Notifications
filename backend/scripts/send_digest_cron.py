"""
Send Digest Cron Script - Standalone script for Render Cron Job
Sends scheduled email digests to users based on their preferences
"""
import asyncio
import sys
import os
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import httpx
from dotenv import load_dotenv
from supabase import create_client

# Load environment
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_SERVICE_ROLE_KEY')
RENDER_EXTERNAL_URL = os.getenv('RENDER_EXTERNAL_URL') or os.getenv('VITE_API_URL') or 'http://localhost:3001'


async def send_scheduled_digests():
    """Check for and send scheduled email digests"""
    print("⏰ Starting scheduled digest check...")
    print(f"   Current time: {datetime.now().isoformat()}")
    
    try:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            print("❌ Missing Supabase credentials")
            return
        
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        now = datetime.now()
        current_hour = now.hour
        current_minute = now.minute
        
        current_time_string = f"{current_hour:02d}:{current_minute:02d}:00"
        print(f"   Checking for digests scheduled at: {current_time_string}")
        
        # 1. Fetch all active digest preferences
        response = supabase.table('email_digest_preferences').select('*').eq('is_active', True).execute()
        preferences = response.data or []
        
        print(f"   Found {len(preferences)} active preferences.")
        
        if not preferences:
            print("   No active digest preferences found.")
            return
        
        # 2. Filter for those scheduled NOW
        due_preferences = []
        for pref in preferences:
            pref_time = pref.get('scheduled_time')
            if not pref_time:
                continue
            
            # Parse time (format: HH:MM:SS or HH:MM)
            time_parts = pref_time.split(':')
            pref_hour = int(time_parts[0])
            pref_minute = int(time_parts[1]) if len(time_parts) > 1 else 0
            
            if pref_hour == current_hour and pref_minute == current_minute:
                print(f"   ✅ Match found: {pref_time} for user {pref.get('user_id')}")
                due_preferences.append(pref)
        
        if not due_preferences:
            print(f"   No digests due at {current_time_string}")
            return
        
        print(f"   📧 Found {len(due_preferences)} digests to send.")
        
        # 3. Send each digest by calling the API endpoint
        api_url = RENDER_EXTERNAL_URL.rstrip('/')
        
        async with httpx.AsyncClient() as client:
            for pref in due_preferences:
                try:
                    # Get user email via admin API
                    user_id = pref.get('user_id')
                    
                    # Use auth.admin to get user info
                    user_response = supabase.auth.admin.get_user_by_id(user_id)
                    
                    if not user_response or not user_response.user:
                        print(f"   ❌ Could not find user {user_id}")
                        continue
                    
                    email = user_response.user.email
                    print(f"   🚀 Sending digest to {email} ({pref.get('frequency')})...")
                    
                    # Call the digest API endpoint
                    response = await client.post(
                        f"{api_url}/api/send-digest-email",
                        json={
                            "email": email,
                            "frequency": pref.get('frequency'),
                            "userId": user_id
                        },
                        timeout=30.0,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if response.status_code == 200:
                        print(f"   ✅ Digest sent successfully to {email}")
                    else:
                        print(f"   ⚠️  Unexpected response: {response.status_code}")
                    
                except Exception as error:
                    print(f"   ❌ Error sending digest: {error}")
        
        print("✅ Scheduled digest check completed.")
        
    except Exception as error:
        print(f"❌ Fatal error in sendScheduledDigests: {error}")
        sys.exit(1)


def main():
    """Main entry point"""
    asyncio.run(send_scheduled_digests())
    print("Script completed successfully.")


if __name__ == "__main__":
    main()
