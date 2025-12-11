"""
AI Router - Handles AI-powered endpoints (interview questions, projects, chat)
"""
import time
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import settings
from services.ai_service import call_openai_api, truncate_text
from services.supabase_service import get_admin_client
from Policy_Knowledge_Base import get_policy_knowledge_base

router = APIRouter()


# Request models
class InterviewQuestionsRequest(BaseModel):
    resumeText: str
    jobDescription: str
    companyName: Optional[str] = "Company"
    jobTitle: Optional[str] = "Position"
    apiKey: Optional[str] = None
    apiType: Optional[str] = None


class ProjectsRequest(BaseModel):
    jobDescription: str
    companyName: Optional[str] = "Company"
    jobTitle: Optional[str] = "Position"
    apiKey: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    conversationHistory: Optional[list] = None
    user: Optional[dict] = None


# Application knowledge base for chatbot
APPLICATION_KNOWLEDGE = """
INTERVIEW VAULT - APPLICATION KNOWLEDGE BASE

## About Interview Vault
Interview Vault is your AI-powered companion for the job search journey. It's a comprehensive platform that combines intelligent tracking, AI analysis, and smart automation to help you land your dream job.

## Core Features:
- Interview Tracker with Intelligence - Track all your job applications in one place
- AI-Powered Resume Skill Match Analysis - Get instant AI analysis using Gemini AI
- AI-Powered Project Ideas Generation - Get custom project suggestions based on skill gaps
- AI-Powered Interview Preparation - Generate 20 tailored interview questions
- Smart Email Notifications - Daily/Weekly digest emails and automated alerts
- Multi-Company Database - Access 350+ companies with pre-filled information

## About the Founder:
The founder of Interview Vault is Dheeraj Kumar K. He is an AI-enabled Data Engineer with over 6 years of experience in the data and business intelligence domain.

Dheeraj has worked with leading technology companies, bringing expertise in Power BI, SQL, Python, Tableau, and PySpark. His passion for solving real-world problems through technology led him to create Interview Vault - a platform that helps job seekers navigate their interview journey with AI-powered intelligence.

### Professional Certifications:
🏅 Microsoft Power BI Data Analyst – PL-300
🏅 Microsoft Fabric Data Engineer Associate – DP-700
🏅 Tableau Desktop Specialist – TDS-C01
🏅 Tableau Data Analyst – TDA-C01

### Professional Experience:
| Company | Role | Timeline | Technologies |
|---------|------|----------|--------------|
| Exusia Inc | Senior Software Engineer | Oct 2025 – Present | Power BI, SQL, Python |
| Encora Inc | BI Consultant | Sept 2022 – Sept 2025 | Power BI, Tableau, PySpark |
| Origers Solution | Data Engineer | June 2019 – Oct 2021 | Power BI, Tableau, PySpark |

### Connect with Dheeraj:
LinkedIn: https://www.linkedin.com/in/dheerajkumar1997/
GitHub: https://github.com/DheerajKumar97
Medium: https://medium.com/@engineerdheeraj97
Portfolio Website: https://dheerajkumar-k.netlify.app/
Email: interviewvault.2026@gmail.com

## Contact & Support:
Email: interviewvault.2026@gmail.com
Website: https://dheerajkumark-interview-vault.netlify.app/
"""

CLEAN_RESUME_PROMPT = """**CRITICAL RULES:**
1. Return ONLY the cleaned text - NO explanations, NO markdown formatting, NO code blocks
2. Preserve ALL actual content and information exactly - do not add, remove, or modify any facts
3. Maintain the original document structure and meaningful line breaks
4. Apply ALL the cleaning patterns described below

**CLEANING PATTERNS TO APPLY:**

1. **Character-by-Character Spacing (HIGHEST PRIORITY)**
   Pattern: Single characters (letters or digits) separated by one or more spaces
   Action: Merge these into complete words/numbers
   - Uppercase sequences: scattered capital letters → merged word
   - Lowercase sequences: scattered lowercase letters → merged word  
   - Mixed case: scattered letters forming a word → merged word
   - This is the MOST COMMON issue - look for it everywhere in the text

2. **Email Address Normalization**
   Pattern: Email addresses with spaces before/after @ symbol or within the local/domain part
   Action: Remove ALL spaces from email addresses to form valid email format

3. **Acronym Spacing**
   Pattern: Capital letters separated by spaces that form acronyms
   Action: Merge into single acronym
   - Also fix acronyms followed by lowercase letter with space (plural forms)

4. **Technical Term Spacing**
   Pattern: Technology/tool names with internal spaces messing up casing
   Action: Intelligently merge based on common tech naming patterns:
   - CamelCase patterns (capital letter followed by lowercase)
   - PascalCase patterns
   - Preserve correct technical capitalization

5. **Number Formatting**
   Pattern: Digits separated by spaces, especially in:
   - Standalone numbers
   - Percentages (number + space + %)
   - Dates/years
   - Counts/quantities (with + or other suffixes)
   Action: Merge digits and remove space before % or other suffixes

6. **Compound Word Spacing**
   Pattern: Common compound words split by spaces where each part flows naturally together
   Action: Merge when the words commonly appear together as one word

7. **Brand/Company Name Formatting**
   Pattern: Product or company names that are:
   - Concatenated without proper spacing
   - Have incorrect capitalization
   Action: Apply proper spacing for multi-word brand names while preserving single-word brands

8. **CamelCase/PascalCase Splitting**
   Pattern: Words concatenated in CamelCase without spaces where spaces should exist
   Action: Insert space before capital letters in multi-word phrases
   - But preserve actual CamelCase technical terms (function names, etc.)

9. **Common Phrase Patterns**
   Pattern: Common verbs/phrases with action + preposition + percentage showing character spacing
   Action: Reconstruct the natural phrase with proper spacing

10. **Spacing and Punctuation**
    Pattern: Extra spaces before punctuation marks (periods, commas, etc.)
    Action: Remove space before punctuation, ensure proper spacing after
    
11. **Hyphenation**
    Pattern: Hyphens with extra spaces on either side
    Action: Remove spaces around hyphens for compound modifiers

12. **Multiple Whitespace**
    Pattern: Multiple consecutive spaces or tabs
    Action: Normalize to single space

**APPROACH:**
- Scan the entire text for these patterns
- Apply fixes intelligently based on context
- Prioritize readability and natural language flow
- When uncertain, preserve the original if it could be correct"""


async def clean_resume_text(raw_text: str) -> str:
    """Clean resume text using OpenAI with strict rules"""
    return await call_openai_api(
        prompt=raw_text,
        system_prompt=CLEAN_RESUME_PROMPT,
        model="gpt-4o-mini",
        temperature=0.1,
        max_tokens=4000
    )


@router.post("/generate-interview-questions")
async def generate_interview_questions(request: InterviewQuestionsRequest):
    """Generate AI-powered interview questions based on resume and job description"""
    try:
        start_time = time.time()
        
        if not request.resumeText or not request.jobDescription:
            raise HTTPException(status_code=400, detail="Resume text and job description are required")
        
        print(f"🤖 Generating interview questions for: {request.companyName} - {request.jobTitle}")
        
        # Truncate to reduce token usage - INCREASED FOR GPT-4o-mini
        truncated_resume = truncate_text(request.resumeText, 20000)
        truncated_job_desc = truncate_text(request.jobDescription, 20000)
        
        prompt = f"""You are an expert technical interviewer and hiring manager. Generate EXACTLY 20 interview questions for the role of {request.jobTitle} at {request.companyName}.
        
        RETURN ONLY A RAW JSON ARRAY. DO NOT use markdown code blocks (```json). DO NOT add any text before or after the JSON.
        
        JSON SCHEMA:
        [
            {{
                "number": 1,
                "type": "conceptual",  # or "coding"
                "question": "Scenario text...",
                "answer": "Comprehensive answer...",
                "code": "Optional code block for coding questions..."
            }}
        ]

        STRICT GENERATION RULES:
        1. Generate EXACTLY 20 questions.
        2. Questions 1-10: SCENARIO-BASED CONCEPTUAL (type: "conceptual")
           - Focus on system design, architecture, and deep concepts.
           - Answer must be 4-5 sentences.
        3. Questions 11-20: PRACTICAL CODING (type: "coding")
           - Provide a coding scenario.
           - "answer" field should contain the logic explanation.
           - "code" field MUST contain the runnable code.
        
        RESUME CONTEXT:
        {truncated_resume}
        
        JOB DESCRIPTION:
        {truncated_job_desc}
        
        Generate the JSON array now:"""

        # Using OpenAI gpt-4o-mini
        response_text = await call_openai_api(
            prompt=prompt,
            system_prompt="You are a strict backend API that outputs ONLY JSON data. Never output conversational text.",
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=14000,
            timeout=180.0
        )
        
        # Parse JSON
        import json
        try:
            # Clean potential markdown
            clean_json = response_text.replace("```json", "").replace("```", "").strip()
            questions = json.loads(clean_json)
        except json.JSONDecodeError:
            print("❌ Failed to parse JSON response, falling back to raw text")
            # If JSON conversion fails, we might want to return a strict error or raw text
            # For now, let's keep it robust by wrapping it in a structure if possible, or just fail
            # But to be safe, we'll error out so the user knows format failed
            raise ValueError("AI failed to generate valid JSON format")
        
        total_time = int((time.time() - start_time) * 1000)
        print(f"⏱️  Total execution time: {total_time}ms")
        
        return {
            "success": True,
            "questions": questions,
            "provider": "openai",
            "model": "gpt-4o-mini",
            "executionTime": total_time
        }
        
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"❌ Error generating questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")


@router.post("/generate-projects")
async def generate_projects(request: ProjectsRequest):
    """Generate AI-powered project suggestions based on job description"""
    try:
        if not request.jobDescription:
            raise HTTPException(status_code=400, detail="Job description is required")
        
        print(f"🤖 Generating project suggestions for: {request.companyName} - {request.jobTitle}")
        
        prompt = f"""You are a senior technical recruiter and career advisor. Based on the following job description for {request.jobTitle} at {request.companyName}, generate EXACTLY 5 innovative, industry-relevant project ideas that would be impressive for a portfolio.

        RETURN ONLY A RAW JSON ARRAY. DO NOT use markdown code blocks (```json). DO NOT add any text before or after the JSON.

        JSON SCHEMA:
        [
            {{
                "title": "Project Title",
                "description": "Detailed description...",
                "technologies": ["Tech 1", "Tech 2"],
                "impressive_reason": "Why it is impressive..."
            }}
        ]

        STRICT REQUIREMENTS:
        1. Generate EXACTLY 5 projects.
        2. "description": MUST be at least 5 lines of detailed text explaining the project scope, data sources, and business value.
        3. "technologies": List 15-25 specific technologies/skills relevant to the role.
        4. "impressive_reason": MUST be at least 4 lines explaining why this specific project stands out for this specific job description.

        JOB DESCRIPTION:
        {request.jobDescription}

        Generate the JSON array now:"""

        # Using OpenAI gpt-4o-mini for consistent quality and speed
        response_text = await call_openai_api(
            prompt=prompt,
            system_prompt="You are a strict backend API that outputs ONLY JSON data. Never output conversational text. You MUST adhere to minimum line length requirements for descriptions.",
            model="gpt-4o-mini",
            temperature=0.8,
            max_tokens=14000,
            timeout=180.0
        )
        
        # Parse JSON
        import json
        try:
            # Clean potential markdown
            clean_json = response_text.replace("```json", "").replace("```", "").strip()
            suggestions = json.loads(clean_json)
        except json.JSONDecodeError:
            print("❌ Failed to parse JSON project response")
            raise ValueError("AI failed to generate valid JSON format for projects")
        
        print("✅ Project suggestions generated successfully")
        
        return {
            "success": True,
            "suggestions": suggestions,
            "provider": "openai",
            "model": "gpt-4o-mini"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        print(f"❌ Error generating projects: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate projects: {str(e)}")


@router.post("/chat")
async def chat(request: ChatRequest):
    """LLM-powered chatbot with user context"""
    try:
        print(f"\n{'='*80}")
        print(f"🚀 NEW CHAT REQUEST RECEIVED")
        print(f"{'='*80}")

        if not request.message:
            raise HTTPException(status_code=400, detail="Message is required")

        message = request.message
        user = request.user or {}
        lower_message = message.lower().strip()

        print(f"💬 Chat request: {message}")
        print(f"👤 Raw user object from request: {request.user}")
        print(f"👤 Processed user object: {user}")
        print(f"👤 User authenticated: {user.get('isAuthenticated')}")
        print(f"👤 User ID: {user.get('id')}")
        print(f"👤 User name: {user.get('name')}")
        print(f"👤 User email: {user.get('email')}")
        print(f"{'='*80}\n")

        user_name = user.get("name") if user.get("isAuthenticated") else None
        is_authenticated = user.get("isAuthenticated", False)
        message_count = user.get("messageCount", 0)

        # Pre-processing: Replace "this product" or "this website" with "Interview Vault"
        replacements = {
            "this product": "Interview Vault",
            "this website": "Interview Vault",
            "this app": "Interview Vault",
            "this application": "Interview Vault",
            "this platform": "Interview Vault"
        }
        for old_phrase, new_phrase in replacements.items():
            message = message.replace(old_phrase, new_phrase)
            message = message.replace(old_phrase.capitalize(), new_phrase)
            message = message.replace(old_phrase.title(), new_phrase)
        
        # Pre-processing: Handle greetings
        greetings = ["hi", "hello", "hey", "yo", "sup", "howdy", "hola", "hii", "hiii", "heyyy"]
        if lower_message in greetings or any(lower_message == g + "!" or lower_message == g + "?" for g in greetings):
            if is_authenticated and user_name:
                greeting_prefix = "Hi" if message_count == 0 else "Hello"
                return {
                    "success": True,
                    "response": f"{greeting_prefix}! **{user_name}**,\n\nHow can I help you with Interview Vault today? Feel free to ask about your applications, job statistics, features, or anything else! 👋",
                    "queryType": "greeting"
                }
            else:
                return {
                    "success": True,
                    "response": f"Hello! 👋\n\nWelcome to Interview Vault! I can help answer your questions about our platform. To access personalized features like job application tracking, AI-powered skill analysis, and custom interview preparation, please sign up or log in to start your interview journey!",
                    "queryType": "greeting"
                }

        # Pre-processing: Handle praise
        praise_words = ["awesome", "brilliant", "thanks", "thank you", "perfect", "nice", "amazing", "cool", "great", "excellent"]
        if lower_message in praise_words or any(lower_message.startswith(p) and len(lower_message) < len(p) + 10 for p in praise_words):
            if is_authenticated and user_name:
                return {
                    "success": True,
                    "response": f"Sure **{user_name}**,\n\nThank you so much! 🙏✨ It's my pleasure to assist you. If you have any more questions, I'm always here to help!",
                    "queryType": "praise"
                }
            else:
                return {
                    "success": True,
                    "response": f"Thank you! 🙏✨ I'm glad I could help. Want to unlock more features? Sign up or log in to access personalized job tracking, AI-powered analysis, and interview preparation tools!",
                    "queryType": "praise"
                }
        
        # Build user data context if authenticated
        user_data_context = ""
        user_resume_context = ""
        applications = []  # Initialize to empty list

        # DEBUG: Print user object before auth check (v2 - timestamp: 21:36)
        print(f"🧪🧪🧪 DEBUG v2 BEFORE AUTH CHECK 🧪🧪🧪", flush=True)
        print(f"🧪 User object: {user}", flush=True)
        print(f"🧪 isAuthenticated: {user.get('isAuthenticated')}, type: {type(user.get('isAuthenticated'))}", flush=True)
        print(f"🧪 id: {user.get('id')}", flush=True)
        
        if user.get("isAuthenticated") and user.get("id"):
            try:
                print(f"🔑 User authenticated: {user.get('isAuthenticated')}")
                print(f"🔑 User ID: {user.get('id')}")
                print(f"🔑 User object: {user}")

                supabase = get_admin_client()
                print(f"✅ Supabase admin client created")

                # DEBUG: First query ALL applications to verify DB connection
                debug_response = supabase.table("applications").select("id, user_id, name").limit(5).execute()
                print(f"🔍 DEBUG - All applications (limit 5): {debug_response.data}")
                if debug_response.data:
                    for app in debug_response.data:
                        print(f"   📋 App: {app.get('name')}, user_id: {app.get('user_id')}")

                # Now query for this specific user
                response = supabase.table("applications").select("*").eq("user_id", user["id"]).execute()

                print(f"📦 Raw Supabase response: {response}")
                print(f"📦 Response data type: {type(response.data)}")
                print(f"📦 Response data: {response.data}")

                applications = response.data or []

                print(f"🔍 Database query executed for user: {user.get('id')}")
                print(f"🔍 Applications fetched: {len(applications)}")

                if applications:
                    print(f"✅ Applications found:")
                    for idx, app in enumerate(applications):
                        print(f"   {idx+1}. {app.get('company_name', 'Unknown')} - {app.get('job_title', 'N/A')}")
                else:
                    print(f"⚠️ No applications returned from query")

                if applications:
                    total_apps = len(applications)
                    status_counts = {}
                    companies_by_status = {}

                    for app in applications:
                        status = app.get("current_status", "Unknown")
                        company_name = app.get("name", "Unknown Company")
                        job_title = app.get("job_title", "")

                        # Count by status
                        status_counts[status] = status_counts.get(status, 0) + 1

                        # Group companies by status
                        if status not in companies_by_status:
                            companies_by_status[status] = []
                        companies_by_status[status].append({
                            "company": company_name,
                            "title": job_title,
                            "applied_date": app.get("applied_date", ""),
                            "hr_name": app.get("hr_name", ""),
                            "hr_email": app.get("hr_email", ""),
                            "hr_phone": app.get("hr_phone", "")
                        })

                    # Build detailed breakdown with numbered list format including HR details
                    company_breakdown = ""
                    counter = 1
                    for status, companies in companies_by_status.items():
                        company_breakdown += f"\n\n{status.upper()}:\n"
                        for c in companies:
                            title_str = f" - {c['title']}" if c['title'] else ""
                            date_str = f" (Applied: {c['applied_date']})" if c['applied_date'] else ""
                            
                            # Build HR contact line
                            hr_details = []
                            if c.get('hr_name'):
                                hr_details.append(f"HR: {c['hr_name']}")
                            if c.get('hr_phone'):
                                hr_details.append(f"Phone: {c['hr_phone']}")
                            if c.get('hr_email'):
                                hr_details.append(f"Email: {c['hr_email']}")
                            
                            hr_str = f" | {', '.join(hr_details)}" if hr_details else ""
                            
                            company_breakdown += f"{counter}. {c['company']}{title_str}{date_str}{hr_str}\n"
                            counter += 1

                    user_data_context = f"""
## ⚠️ CRITICAL - USER'S ACTUAL APPLICATION DATA FROM DATABASE ⚠️

**IMPORTANT:** This data is directly from the Supabase database. DO NOT make up, infer, or hallucinate any company names. ONLY use the exact company names listed below.

**Total Applications in Database:** {total_apps}
**Status Summary:** {', '.join(f'{k}: {v}' for k, v in status_counts.items())}

**COMPLETE LIST OF COMPANIES (USE THESE EXACT NAMES ONLY):**{company_breakdown}

❌ DO NOT mention any companies not listed above (like Infosys, Exusia Inc, Encora Inc if they're not in the list above)
✅ ONLY use the company names explicitly shown in the list above
✅ If user asks for applications/companies, show EXACTLY this data in a clean table format
"""
                    for status, companies in companies_by_status.items():
                        print(f"📊 {status}: {[c['company'] for c in companies]}")
                
                # Fetch and clean User Resume (with Caching)
                try:
                    # Simple in-memory cache to avoid re-cleaning on every request
                    # Global cache variable should be defined at module level, but for now we use a function attribute or global check
                    if not hasattr(chat, "resume_cache"):
                        chat.resume_cache = {}
                    
                    user_id_str = str(user["id"])
                    
                    if user_id_str in chat.resume_cache:
                        print("⚡ Using cached cleaned resume")
                        cleaned_resume = chat.resume_cache[user_id_str]
                        user_resume_context = f"\n\n**USER RESUME:**\n{cleaned_resume}\n"
                    else:
                        resume_response = supabase.table("resumes").select("resume_text").eq("user_id", user["id"]).maybe_single().execute()
                        if resume_response.data and resume_response.data.get("resume_text"):
                            print("📄 Found user resume, cleaning text...")
                            raw_resume = resume_response.data["resume_text"]
                            cleaned_resume = await clean_resume_text(raw_resume)
                            
                            # Cache the result
                            chat.resume_cache[user_id_str] = cleaned_resume
                            
                            user_resume_context = f"\n\n**USER RESUME:**\n{cleaned_resume}\n"
                            print("✅ Resume cleaned and added to context (and cached)")
                        else:
                            print("⚠️ No resume found for user")
                except Exception as resume_error:
                    print(f"❌ Error fetching/cleaning resume: {str(resume_error)}")

            except Exception as db_error:
                print(f"❌ Database query error: {db_error}")
                print(f"❌ Error type: {type(db_error)}")
                import traceback
                print(traceback.format_exc())

        # Fetch policy knowledge base (must be done before building the f-string)
        policy_knowledge = await get_policy_knowledge_base()

        # Build system prompt with comprehensive rules
        system_prompt = f"""🚨🚨🚨 CRITICAL RULE #1 - READ THIS IMMEDIATELY 🚨🚨🚨

**YOU ARE ABSOLUTELY FORBIDDEN FROM:**
1. Making up company names (NO Nvidia, Google, Microsoft, Apple, Amazon, Meta, Samsung, AMD, etc.)
2. Using placeholder data like "[Position]", "[Status]", "[Your Date]", "[HR Name]"
3. Creating example tables with fake companies
4. Inferring or guessing any application data

**YOU MUST:**
1. ONLY use company names from the "COMPLETE LIST OF COMPANIES" section in the database data below
2. If database shows 0 companies, say "You haven't added any applications yet"
3. Copy EXACT company names, dates, and statuses from database - NO HALLUCINATION

🚨 If you violate these rules, the response will be rejected and you will be penalized 🚨

---

You are the AI assistant for **Interview Vault** - a job application tracking platform. You are embedded IN this application.
{f"The user's name is {user_name}." if user_name else 'The user is not logged in.'}

⚠️ CRITICAL SCOPE RESTRICTION - READ THIS FIRST ⚠️

YOU ARE STRICTLY LIMITED TO THESE TOPICS ONLY:
1. **Interview Vault** - Features, usage, policies, support, the application itself
2. **Job Search & Careers** - Applications, interviews, resumes, job hunting tips
3. **The Founder (Dheeraj Kumar K)** - Use ONLY the "About the Founder" section in APPLICATION_KNOWLEDGE below - NEVER WEB SEARCH!
4. **AI & Technology** - Technical concepts relevant to IT, software, data engineering, AI/ML
5. **User's Application Data** - Their job applications, companies, HR contacts, statistics
6. **User's Personal Profile** - Use RESUME DATA for experience, skills, projects, contact details
7. **Interview Vault Policies** - Privacy Policy, Terms of Use, Cookie Policy, Do Not Sell, Ad Choices - USE THE POLICY KNOWLEDGE BASE SECTION BELOW!

🚨🚨🚨 CRITICAL - POLICY QUERIES 🚨🚨🚨

When user asks about "policies", "privacy", "terms", "cookies", "do not sell", "ad choices", or similar:
- ✅ USE ONLY the "INTERVIEW VAULT POLICY KNOWLEDGE BASE" section below
- ✅ Summarize the relevant policy in a friendly, readable format
- ✅ Include the support email (interviewvault.2026@gmail.com) if relevant
- ❌ DO NOT say you don't have policy information
- ❌ DO NOT give generic out-of-scope responses for policy questions

🚨🚨🚨 CRITICAL - FOUNDER QUERIES - NO WEB SEARCH 🚨🚨🚨

When user asks ANYTHING about "Dheeraj", "Dheeraj Kumar K", "founder", "creator", "who made this", "who built this":
- ❌ DO NOT search the web - there is another person named "Dheeraj Kumar" (Indian actor) - NOT THE SAME PERSON!
- ❌ DO NOT mention any actor, producer, or TV personality
- ✅ USE ONLY the "About the Founder - Dheeraj Kumar K" section in the APPLICATION_KNOWLEDGE below
- ✅ The founder has 6+ years experience at Exusia Inc, Encora Inc, Origers Solution
- ✅ Show the experience table, projects, and accomplishments from APPLICATION_KNOWLEDGE

FOUNDER TRIGGER PHRASES (Use APPLICATION_KNOWLEDGE, NOT web search):
- "Dheeraj", "Dheeraj Kumar", "Dheeraj Kumar K"
- "founder", "creator", "developer of this app"
- "who made this", "who built this", "who created"
- "more details about Dheeraj", "founder experience", "founder skills"
- "how many years experience does founder have" - Answer: 6+ years!

🚫 ABSOLUTELY DO NOT:
- Search the web for "Dheeraj Kumar" - WRONG PERSON!
- Make up generic founder skills like "visionary thinking"
- Infer skills based on the application features
- Provide definitions of what founders typically do
- Give generic lists of founder competencies
- Copy-paste the founder data verbatim from APPLICATION_KNOWLEDGE

✅ HOW TO PRESENT FOUNDER INFO ATTRACTIVELY:
- Present the information in an engaging, conversational tone
- Use emojis to make sections visually appealing (🚀 💼 🛠️ ✨ 📊)
- Rephrase accomplishments dynamically, don't copy-paste exact text
- Group related achievements together with compelling headers
- Highlight impressive numbers (250+ dashboards, 95% reduction, 35% improvement)
- Make it sound impressive and professional, like a portfolio showcase
- Use varied sentence structures, not bullet-point lists copied verbatim

Example of ATTRACTIVE presentation:
"🚀 **Dheeraj Kumar K** brings **6+ years** of deep expertise in Data Engineering & Business Intelligence!

**💼 Professional Journey:**
| Company | Role | Duration |
|---------|------|----------|
| Exusia Inc | Senior Software Engineer | Oct 2025 – Present |
...

**🛠️ Technical Mastery:**
Built **250+ interactive dashboards** across Power BI & Tableau, mastering everything from Sunburst charts to Heat Maps. Achieved a remarkable **95% reduction in data issues** through rigorous testing...

**✨ Innovation Projects:**
Created cutting-edge Gen AI solutions including multi-LLM chatbots and Text-to-SQL interfaces that boost developer productivity by **30%**!"

📬 FOUNDER CONTACT DETAILS - SHARE THESE WHEN ASKED:
When user asks for "Dheeraj contact", "founder contact", "how to reach Dheeraj", "LinkedIn", "GitHub", "portfolio":
ALWAYS provide these links from APPLICATION_KNOWLEDGE as a raw list (NO LABELS, NO MARKDOWN, JUST URLs):
- https://www.linkedin.com/in/dheerajkumar1997/
- https://github.com/DheerajKumar97
- https://dheerajkumar-k.netlify.app/
- https://medium.com/@engineerdheeraj97
- interviewvault.2026@gmail.com

DO NOT say "contact details are private" - these are PUBLIC links that should be shared!

🚫 ABSOLUTELY DO NOT:
- Search the web for movies, films, entertainment, sports, celebrities, news
- Define or explain random words as if they are search queries
- Provide information about topics outside the above scope
- Treat casual words like "Dude", "Bro", "Man", "Hey", "Yo" as search queries - these are GREETINGS
- Search for any person, movie, show, or media when user sends casual words

WHEN USER SENDS CASUAL GREETINGS/WORDS (e.g., "Dude", "Hey", "Bro", "Man", "Yo", "Hi", "Hello", "Sup"):
Respond casually and warmly: "Hey **{user_name or 'there'}**! 👋 How can I help you with Interview Vault today?"

FOR ANY OUT-OF-SCOPE QUESTION (movies, sports, general knowledge, entertainment, etc.):
Respond: "I'm the Interview Vault assistant, so I focus on helping you with job applications, interview prep, and career-related topics! 😊 Is there anything about your applications, resume analysis, or Interview Vault features I can help with?"

GREETING RULE:
**DO NOT** automatically add "Hi {user_name}" or "Sure {user_name}" at the start of your response. The system will handle that. Just answer the user's request directly.

PRAISE AND GREETING RECOGNITION:
The user may send praise, appreciation, or greeting messages to acknowledge your helpful responses. These include:

**Single Words (Greetings & Praise):** "Hi", "Hello", "Hey", "Yo", "Sup", "Howdy", "Hola", "Dude", "Bro", "Man", "Mate", "Buddy", "Awesome", "Brilliant", "Legend", "Superb", "Fantastic", "Epic", "Respect", "Champion", "Solid", "Magnifique", "Thanks", "Thank you", "Perfect", "Nice", "Amazing", "Cool", "Wonderful", "Great", "Excellent", "Super"

**Two-Three Word Phrases:** "Well Done", "Nice Job", "Great Work", "Top Notch", "Super Star", "Pure Magic", "Good Effort", "Brilliant Mate", "Solid Choice", "Massive Respect", "Thank You", "Love It", "You're Great", "Awesome Dude", "That's Helpful"

**Short Sentences:** "You Nailed It", "You Killed It", "Absolutely Brilliant", "Truly Impressive", "Mind Blowing Work", "You're Pure Talent", "World Class Work", "Beautifully Done", "Top Class Stuff", "Exceptionally Done", "That Was Amazing", "You Did Incredible", "Absolutely Nailed That", "Brilliant Work My Friend", "Outstanding Effort From You", "You Did That Perfectly", "Massive Kudos To You", "Top Effort As Always", "You're a True Pro", "That's Pure Excellence"

**Longer Praise:** "Five Stars For You", "You're Amazing At This", "Brilliant Work As Always", "You've Done Exceptionally Well", "What A Fantastic Job", "You Delivered So Perfectly", "Massive Respect To You", "You Absolutely Smashed It", "This Is Truly Outstanding", "You're Seriously Skilled"

**Full Appreciation Sentences:** Any message expressing appreciation, gratitude, or praise for your work like "You absolutely crushed it, mate!", "This work is nothing short of phenomenal.", "I'm genuinely blown away by the quality of your work.", "Your dedication and skill clearly shine here."

**International Praise:** "Kya baat hai!", "Mate, you smashed it!", "C'est magnifique!", "Excelente trabajo!", "Ang galing mo!", "Mashallah", "Subarashii desu!"

When you detect ANY praise/appreciation message, respond GRACEFULLY and WARMLY like:
- "Thank you so much, **{user_name or 'friend'}**! 🙏✨ It's my pleasure to assist you. If you have any more questions about your applications, features, or anything else, I'm always here to help!"
- "Aww, you're too kind, **{user_name or 'friend'}**! 😊💜 Your appreciation means a lot. Happy to help anytime! What else can I assist you with today?"
- "Thank you, **{user_name or 'friend'}**! 🌟 That really brightens my day! Let me know if there's anything else you'd like to explore about Interview Vault."

DO NOT:
- Define these words or phrases
- Search for their meaning
- Explain what they mean linguistically
- Give dictionary definitions
- Search for people or characters with these names
- Do web searches when user sends praise
- Do web searches when user asks about Interview Vault or this app

UNRECOGNIZABLE/NONSENSE INPUT HANDLING:
If the user sends a message that appears to be gibberish, random characters, typos, or nonsensical text that has no clear meaning (examples: "hefeello", "hoosoh", "gonsis", "asdfgh", "qwerty123", "xyzabc"), respond helpfully:

"I'm not quite sure what you meant by that, but I'm here to help! 😊 I can assist you with questions about your applications, job statistics, features, policies, or anything else about Interview Vault. How can I help you today?"

CONVERSATIONAL SHORT RESPONSES (CRITICAL - DO NOT SEARCH):
When user sends SHORT conversational words/phrases indicating they're done or responding casually, DO NOT do web searches! These are NOT search queries:

**Negative/Done responses:** "nope", "no", "nah", "no thanks", "not now", "nothing", "never mind", "nevermind", "that's all", "that's it", "i'm good", "im good", "all good", "no more", "none", "not really", "no need"

**Positive/Affirmative:** "yes", "yeah", "yep", "yup", "sure", "ok", "okay", "alright", "fine", "cool", "got it", "understood", "makes sense", "right", "correct"

**Casual closers:** "bye", "goodbye", "see ya", "later", "take care", "thanks bye", "ok bye", "cya"

For these conversational responses, reply NATURALLY like a friendly assistant:
- "nope/no/nothing" → "No problem, **{user_name or 'friend'}**! 😊 I'm here whenever you need help. Just ask anytime!"
- "yes/okay/got it" → "Great! 👍 Let me know if there's anything else I can help you with!"
- "bye/later" → "Goodbye, **{user_name or 'friend'}**! 👋 Best of luck with your job search. Come back anytime!"

⚠️ NEVER search the web for these words! "Nope" is NOT the movie - it's the user saying "no". "Fine" is NOT about money or penalties - it's "okay".

{APPLICATION_KNOWLEDGE}

{user_data_context}

ADDITIONAL RULES:
1. Use markdown bold **text** for names, numbers, KPIs, status values, and important info.
2. 🚨🚨🚨 **CRITICAL - APPLICATION DATA QUERIES** 🚨🚨🚨
   When user asks about their applications, statistics, companies, or specific criteria:

   **TRIGGER PHRASES:** "breakdown", "companies", "applications", "statistics", "stats", "status", "offer", "selected", "rejected", "scheduled", etc.

   **FILTERING RULES - READ CAREFULLY:**
   
   ✅ **ALWAYS FILTER** based on the user's specific criteria:
   - If they ask for "offers" or "offer released" → Filter ONLY companies with status = "Offer Released"
   - If they ask for "selected" → Filter ONLY companies with status = "Selected"
   - If they ask for "interviews" or "scheduled" → Filter ONLY companies with status = "Interview Scheduled"
   - If they ask for "rejected" → Filter ONLY companies with status = "Rejected"
   - If they ask for ALL companies → Show all from the database list below
   
   ✅ **EXTRACT AND DISPLAY:**
   - Company names matching the criteria
   - Position/title
   - Status
   - Applied date
   - HR contact details (name, phone, email) if available and requested
   
   ❌ **DO NOT:**
   - Show ALL companies when user asks for specific status
   - Make up company names not in the database below
   - Use placeholder data
   - Hallucinate information

   **RESPONSE FORMAT:**
   Create a clean table with ONLY the companies that match the user's criteria:
   
   | Company Name | Position | Status | Applied Date | HR Contact |
   |--------------|----------|--------|--------------|------------|
   [Only rows matching user's filter criteria]
   
   **Summary:** X companies found with status "[criteria]"

3. For questions about "this website", "this app", "Interview Vault", "features", "policies", "creator", "founder" - USE THE KNOWLEDGE BASE ABOVE, not web search.
4. **COMPANY-SPECIFIC QUERIES**: When user asks about a company's HR details, contact info, or company details:
   - FIRST check if that company is in the user's application data above (look in "Complete Company Details" section)
   - If found, ALWAYS display user's stored data at the TOP in this format:

     **📋 Your Application Record for [Company]:**
     - Applied on: **[date]**
     - Position: **[position]** (if available)
     - Status: **[status]**
     - **HR Contact Name:** [name] (show if available)
     - **HR Contact Phone:** [phone] (show if available)
     - **HR Contact Email:** [email] (show if available)

   - THEN provide additional company/HR info from web search below
   - User's stored HR contact details MUST be shown FIRST and PROMINENTLY before web results
   - User's stored HR contact details MUST be shown FIRST and PROMINENTLY before web results
5. Understand follow-up questions from context - if previous message was about applications, "breakdown" refers to their applications.
6. Keep responses well-formatted with subheaders using **bold** for feature names.
7. When explaining features, list them with clear explanations - make it impressive!
8. **FORMATTING RULES - CRITICAL**:
   - Do NOT use horizontal rule separators (---, ___, ===, or similar) ANYWHERE in your response
   - Use SINGLE blank line between sections (one \\n\\n only, not multiple blank lines)
   - Separate content with bold section headers instead of visual separators
   - Keep responses compact and easy to read

Respond naturally and helpfully using ONLY the information provided above.

{policy_knowledge}

{user_resume_context}"""

        response_text = await call_openai_api(
            prompt=message,
            system_prompt=system_prompt,
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=2000
        )

        # DEBUG CHECKPOINT: State before validation layer
        print(f"\n{'='*60}")
        print(f"🔍 VALIDATION CHECKPOINT")
        print(f"🔍 User authenticated: {is_authenticated}")
        print(f"🔍 User ID: {user.get('id') if user else 'None'}")
        print(f"🔍 Applications variable type: {type(applications)}")
        print(f"🔍 Applications count: {len(applications)}")
        if applications:
            print(f"🔍 First 3 companies: {[app.get('company_name', 'Unknown') for app in applications[:3]]}")
        print(f"{'='*60}\n")

        # Ensure response starts with appropriate greeting
        # Ensure response starts with appropriate greeting
        if is_authenticated and user_name:
            # 1. Strip ANY existing greeting from the start of the response to ensure we have a clean slate
            # Regex captures:
            # ^\s* -> Start of string, optional whitespace
            # (?:...) -> Non-capturing group for the greeting words
            # (Hi|Hello|Hey|Sure|Absolutely|Greetings|Welcome)\s+ -> The greeting word + whitespace
            # (?:\*\*?.*?\*\*?|.*?) -> The name (optionally bolded) or any chars up to comma/newline
            # [,\.!]\s* -> Punctuation and whitespace
            
            clean_response = response_text.strip()
            
            # Pattern to match "Hi Dheeraj," or "Sure **Dheeraj**," or "Hello there!" at start
            greeting_pattern = r"^\s*(?:Hi|Hello|Hey|Sure|Absolutely|Greetings|Welcome)\b.*?[,\.!]\s*"
            
            # Remove the detected greeting if it exists
            clean_response = re.sub(greeting_pattern, "", clean_response, count=1, flags=re.IGNORECASE | re.DOTALL).strip()
            
            # 2. Add the CORRECT mandatory greeting back
            if message_count == 0:
                response_text = f"Hi **{user_name}**,\n\n{clean_response}"
            else:
                response_text = f"Sure **{user_name}**,\n\n{clean_response}"
        else:
            # Guest users: no greeting prefix, but add signup encouragement if not present
            if "sign up" not in response_text.lower() and "log in" not in response_text.lower():
                response_text += "\n\nWant to unlock more features? Sign up or log in to access personalized job tracking, AI-powered skill analysis, and interview preparation tools!"

        print("✅ LLM response generated successfully")

        return {
            "success": True,
            "response": response_text,
            "queryType": "llm_powered"
        }
        
    except ValueError as e:
        # Fallback if LLM API key missing or similar config error
        print(f"⚠️ Chat ValueError: {str(e)}")
        fallback_response = f"Hello! **{user_name or 'there'}**,\n\nI'm here to help with Interview Vault! Ask me about your applications, features, policies, or anything else. 😊"
        return {
            "success": True,
            "response": fallback_response,
            "queryType": "fallback"
        }
    except Exception as e:
        import traceback
        print(f"❌ Error in chat: {str(e)}")
        print(f"❌ Full traceback:\n{traceback.format_exc()}")
        # Return fallback response instead of 500 error for better UX
        fallback_response = f"Sure **{user_name or 'there'}**,\n\nI'm experiencing some technical difficulties, but I'm still here to help. Please try asking your question again, or contact support at interviewvault.2026@gmail.com if the issue persists."
        return {
            "success": True,
            "response": fallback_response,
            "queryType": "error_fallback"
        }
