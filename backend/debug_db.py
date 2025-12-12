from services.supabase_service import get_admin_client
import json

def debug_database():
    print("🔍 Connecting to Supabase...")
    supabase = get_admin_client()
    
    try:
        # List first 10 applications with user_id
        print("\n Listing first 10 applications with User IDs:")
        list_response = supabase.table("applications").select("id, name, user_id, current_status").limit(10).execute()
        if list_response.data:
            for idx, app in enumerate(list_response.data):
                print(f"   {idx+1}. Name: {app.get('name')} | Status: {app.get('current_status')} | UserID: {app.get('user_id')}")
        else:
            print("   No applications found.")

    except Exception as e:
        print(f" Error: {str(e)}")

if __name__ == "__main__":
    debug_database()
