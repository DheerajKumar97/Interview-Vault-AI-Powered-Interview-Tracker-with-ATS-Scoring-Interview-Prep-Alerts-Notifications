"""
Talk to DB - Interactive CLI Chatbot for Database Queries
Converts natural language to SQL and queries the database
"""
import asyncio
import sys
import os
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
PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')

# Validate environment
if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Missing required environment variables!")
    print("   Please set in .env file:")
    print("   - SUPABASE_URL (or VITE_SUPABASE_URL)")
    print("   - SUPABASE_SERVICE_ROLE_KEY")
    print("   - PERPLEXITY_API_KEY")
    sys.exit(1)

print("✅ Environment variables loaded successfully\n")

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Conversation history
conversation_history = []
MAX_HISTORY_LENGTH = 10

# Database schema for SQL generation
DATABASE_SCHEMA = """
You are a SQL expert. Convert natural language questions into Supabase/PostgreSQL queries.

DATABASE SCHEMA:

1. applications table:
   - id (uuid, primary key)
   - user_id (uuid, foreign key to auth.users)
   - company (text) - IMPORTANT: Always include this in SELECT
   - name (text) - alternative company name field
   - position (text) - job title
   - current_status (text) - IMPORTANT: The main status field
   - application_date (date)
   - salary (text)
   - location (text)
   - notes (text)
   - created_at (timestamp)

VALID STATUS VALUES (case-sensitive):
- "HR Screening Done"
- "Shortlisted"
- "Interview Scheduled"
- "Interview Rescheduled"
- "Selected"
- "Offer Released"
- "Ghosted"
- "Rejected"

CRITICAL RULES:
1. Always return valid PostgreSQL SQL
2. Use current_status field (NOT status field) for status queries
3. Use COALESCE(company, name) to handle both company fields
4. Return ONLY the SQL query, no explanation

EXAMPLES:
Question: "How many applications do I have?"
SQL: SELECT COUNT(*) as count FROM applications;

Question: "Show companies where I got selected"
SQL: SELECT COALESCE(company, name) as company_name, position FROM applications WHERE current_status = 'Selected';

NOW CONVERT THE FOLLOWING QUESTION TO SQL:
"""


def add_to_history(role: str, content: str):
    """Add message to conversation history"""
    conversation_history.append({"role": role, "content": content})
    if len(conversation_history) > MAX_HISTORY_LENGTH:
        conversation_history.pop(0)


def classify_query(question: str) -> str:
    """Classify query type"""
    lower = question.lower().strip()
    
    # Check patterns
    if any(p in lower for p in ['hi', 'hello', 'hey', 'how are you']):
        return 'greeting'
    
    if any(p in lower for p in ['who is', 'who made', 'who created', 'dheeraj', 'policy', 'privacy', 'terms']):
        return 'app_info'
    
    if any(p in lower for p in ['how many', 'show me', 'list', 'count', 'applications', 'companies', 'status']):
        return 'database'
    
    return 'conversation'


async def call_perplexity(prompt: str, system_prompt: str = None, max_tokens: int = 500) -> str:
    """Call Perplexity API"""
    api_keys = []
    try:
        import json
        api_keys = json.loads(PERPLEXITY_API_KEY)
    except:
        api_keys = [PERPLEXITY_API_KEY] if PERPLEXITY_API_KEY else []
    
    if not api_keys:
        return "No Perplexity API key found"
    
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    
    async with httpx.AsyncClient() as client:
        for api_key in api_keys:
            try:
                response = await client.post(
                    "https://api.perplexity.ai/chat/completions",
                    json={
                        "model": "sonar",
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": 0.1
                    },
                    headers={
                        "Authorization": f"Bearer {api_key.strip()}",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            except Exception as e:
                continue
    
    return "Failed to get response from AI"


async def natural_language_to_sql(question: str) -> str:
    """Convert natural language to SQL"""
    print("🤖 Converting question to SQL...")
    sql = await call_perplexity(question, DATABASE_SCHEMA, 500)
    
    # Clean up SQL
    sql = sql.replace("```sql", "").replace("```", "").strip()
    sql = sql.rstrip(";")
    
    return sql


def execute_query(sql_query: str):
    """Execute SQL query using Supabase"""
    print("📊 Executing query...")
    print(f"   SQL: {sql_query}")
    
    try:
        lower_query = sql_query.lower()
        
        # Determine table
        if "from applications" in lower_query:
            response = supabase.table("applications").select("*").execute()
        elif "from interview_events" in lower_query:
            response = supabase.table("interview_events").select("*").execute()
        else:
            return []
        
        data = response.data or []
        
        # If it's a count query
        if "count(*)" in lower_query:
            return [{"count": len(data)}]
        
        # Add company_name field
        for row in data:
            row["company_name"] = row.get("company") or row.get("name") or "Unknown"
        
        return data
        
    except Exception as e:
        print(f"❌ Query error: {e}")
        return []


def format_results(data: list, question: str) -> str:
    """Format query results for display"""
    if not data:
        return "📭 No results found."
    
    if len(data) == 1 and "count" in data[0]:
        return f"✅ Answer: {data[0]['count']}"
    
    # Print table
    print("\n📊 Results:")
    for i, row in enumerate(data[:10]):
        company = row.get("company_name", "N/A")
        position = row.get("position", "N/A")
        status = row.get("current_status", "N/A")
        print(f"   {i+1}. {company} - {position} ({status})")
    
    return f"Found {len(data)} records"


async def ask_question(question: str):
    """Process a question"""
    print("\n" + "=" * 60)
    print(f"❓ Question: {question}")
    print("=" * 60)
    
    add_to_history("user", question)
    
    query_type = classify_query(question)
    print(f"🔍 Query Type: {query_type}")
    
    if query_type == "greeting":
        response = "Hello! I'm here to help you query your Interview Vault database. Ask me anything about your applications!"
        print(f"\n💡 {response}")
    elif query_type == "database":
        sql_query = await natural_language_to_sql(question)
        results = execute_query(sql_query)
        response = format_results(results, question)
        print(f"\n{response}")
    else:
        response = await call_perplexity(question, max_tokens=500)
        print(f"\n💡 {response}")
    
    add_to_history("assistant", response)
    print("=" * 60 + "\n")


async def interactive_mode():
    """Run in interactive mode"""
    print("\n" + "=" * 60)
    print("🤖 INTERVIEW VAULT DATABASE CHATBOT")
    print("=" * 60)
    print("\nExamples:")
    print("  • How many applications do I have?")
    print("  • Show me companies where I got selected")
    print("  • What are the different statuses?")
    print("\nType 'exit' to quit.\n")
    
    while True:
        try:
            question = input("❓ Your question: ").strip()
            
            if question.lower() == "exit":
                print("\n👋 Goodbye!\n")
                break
            
            if not question:
                continue
            
            await ask_question(question)
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!\n")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        # Command line mode
        question = " ".join(sys.argv[1:])
        asyncio.run(ask_question(question))
    else:
        # Interactive mode
        asyncio.run(interactive_mode())


if __name__ == "__main__":
    main()
