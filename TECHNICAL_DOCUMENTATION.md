# Interview Vault - Technical Documentation

## Executive Summary
Interview Vault is an AI-powered job application tracking platform built with a **Python FastAPI backend** and **React TypeScript frontend**. The application leverages multiple AI capabilities including GPT-4o-mini for interview preparation, project suggestions, and an intelligent chatbot, combined with a comprehensive analytics engine for tracking and visualizing application progress.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Backend Technology Stack](#2-backend-technology-stack)
3. [AI Features Deep Dive](#3-ai-features-deep-dive)
4. [Analytics Engine](#4-analytics-engine)
5. [Email Service](#5-email-service)
6. [Database Design](#6-database-design)
7. [Request Handling & Error Management](#7-request-handling--error-management)
8. [Security Considerations](#8-security-considerations)
9. [Deployment Architecture](#9-deployment-architecture)

---

## 1. Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │  Dashboard  │ │ ATS Checker │ │Skill Analysis│ │Interview Preparation││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘│
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │ HTTP/REST
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Python 3.11 + FastAPI)                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         ROUTER LAYER                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐  │   │
│  │  │  ai.py  │ │email.py │ │ auth.py │ │utils.py │ │analytics.py│  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘  │   │
│  └───────┼──────────┼──────────┼──────────┼────────────┼───────────┘   │
│          │          │          │          │            │               │
│  ┌───────┴──────────┴──────────┴──────────┴────────────┴───────────┐   │
│  │                        SERVICE LAYER                             │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────────┐   │   │
│  │  │  ai_service.py │ │email_service.py│ │analytics_service.py│   │   │
│  │  └────────┬───────┘ └────────┬───────┘ └──────────┬─────────┘   │   │
│  └───────────┼──────────────────┼────────────────────┼─────────────┘   │
└──────────────┼──────────────────┼────────────────────┼─────────────────┘
               │                  │                    │
               ▼                  ▼                    ▼
┌──────────────────────┐ ┌─────────────────┐ ┌────────────────────────┐
│   OpenAI GPT-4o-mini │ │   Brevo API     │ │  Supabase (PostgreSQL) │
│   (AI Processing)    │ │   (Email SMTP)  │ │  (Data Persistence)    │
└──────────────────────┘ └─────────────────┘ └────────────────────────┘
```

### Request Flow Pattern

```
Client Request → FastAPI Router → Pydantic Validation → Service Layer → External API/DB → Response
```

---

## 2. Backend Technology Stack

### Core Libraries and Justification

| Library | Version | Purpose | Why This Choice |
|---------|---------|---------|-----------------|
| **FastAPI** | 0.109.0 | Web Framework | Async-native, automatic OpenAPI docs, Pydantic integration, high performance (Starlette-based) |
| **uvicorn[standard]** | 0.27.0 | ASGI Server | Production-grade async server with HTTP/2 support, hot reload for development |
| **pydantic** | (bundled) | Data Validation | Type-safe request/response models, automatic JSON serialization, validation errors |
| **httpx** | >=0.27.0 | HTTP Client | Async-native HTTP client with connection pooling, timeout handling, proxy support |
| **supabase** | >=2.0.0 | Database Client | Official Python client for Supabase, handles auth, real-time, and storage |
| **openai** | >=1.0.0 | AI Integration | Official async client for GPT models, streaming support, structured outputs |
| **python-dotenv** | 1.0.0 | Env Management | Load `.env` files, secure configuration, 12-factor app compliance |
| **Jinja2** | 3.1.3 | Template Engine | HTML email templates, secure auto-escaping, template inheritance |
| **dnspython** | 2.5.0 | DNS Resolution | Email domain validation via MX record lookup |
| **APScheduler** | 3.10.4 | Task Scheduling | Background jobs for scheduled email digests, cron-like scheduling |

### Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── config.py               # Environment variables & settings singleton
├── Policy_Knowledge_Base.py # AI chatbot policy knowledge
├── policy_cache.json       # Cached policy data
├── requirements.txt        # Python dependencies
├── Dockerfile             # Container configuration
├── routers/               # API endpoint handlers
│   ├── __init__.py
│   ├── ai.py              # AI endpoints (45KB - largest file)
│   ├── analytics.py       # Dashboard analytics endpoints
│   ├── auth.py            # Authentication endpoints
│   ├── email.py           # Email sending endpoints
│   └── utils.py           # Utility endpoints
├── services/              # Business logic layer
│   ├── __init__.py
│   ├── ai_service.py      # OpenAI API wrapper
│   ├── analytics_service.py # Analytics calculations (32KB)
│   ├── email_service.py   # Brevo email integration
│   └── supabase_service.py # Database client
└── utils/                 # Helper utilities
```

---

## 3. AI Features Deep Dive

### 3.1 AI Service Architecture (`ai_service.py`)

```python
async def call_openai_api(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "gpt-4o-mini",
    temperature: float = 0.7,
    max_tokens: int = 4000,
    timeout: float = 60.0,
    json_mode: bool = False
) -> str:
```

**Technical Design Decisions:**

1. **Async/Await Pattern**: Uses `AsyncOpenAI` client for non-blocking I/O, allowing concurrent request handling in FastAPI's async event loop.

2. **Model Selection**: `gpt-4o-mini` chosen for:
   - Cost efficiency (~$0.15/1M input tokens)
   - Sufficient capability for structured generation
   - Faster response times than GPT-4

3. **Temperature Tuning**:
   - `0.1` for resume cleaning (deterministic output)
   - `0.7` for interview questions (balanced creativity)
   - `0.8` for project suggestions (more creative variance)

4. **Error Propagation**: Exceptions are logged and re-raised to allow router-level HTTP error handling.

---

### 3.2 Interview Questions Generator (`POST /api/generate-interview-questions`)

**Functionality:** Generates exactly 20 tailored interview questions (10 conceptual + 10 coding) based on user's resume and target job description.

**Technical Implementation:**

```python
@router.post("/generate-interview-questions")
async def generate_interview_questions(request: InterviewQuestionsRequest):
    start_time = time.time()  # Performance tracking
    
    # Input validation via Pydantic
    if not request.resumeText or not request.jobDescription:
        raise HTTPException(status_code=400, detail="Resume and JD required")
    
    # Token optimization - prevent context window overflow
    truncated_resume = truncate_text(request.resumeText, 20000)
    truncated_job_desc = truncate_text(request.jobDescription, 20000)
    
    # Structured prompt engineering
    prompt = f"""Generate EXACTLY 20 interview questions...
    
    RETURN ONLY A RAW JSON ARRAY. DO NOT use markdown code blocks.
    
    JSON SCHEMA:
    [{
        "number": 1,
        "type": "conceptual",  # or "coding"
        "question": "...",
        "answer": "...",
        "code": "Optional..."  # Only for coding questions
    }]
    """
    
    response_text = await call_openai_api(
        prompt=prompt,
        system_prompt="You are a strict backend API that outputs ONLY JSON data.",
        model="gpt-4o-mini",
        temperature=0.7,
        max_tokens=14000,  # High limit for 20 Q&A pairs
        timeout=180.0      # Extended timeout for complex generation
    )
    
    # Robust JSON parsing with fallback
    clean_json = response_text.replace("```json", "").replace("```", "").strip()
    questions = json.loads(clean_json)
    
    return {
        "success": True,
        "questions": questions,
        "provider": "openai",
        "executionTime": int((time.time() - start_time) * 1000)
    }
```

**Key Engineering Decisions:**

1. **Prompt Engineering Strategy:**
   - Explicit JSON schema in prompt ensures structured output
   - "DO NOT use markdown code blocks" prevents parsing issues
   - "EXACTLY 20 questions" enforces output length
   - Split 50/50 conceptual/coding matches interview reality

2. **Token Management:**
   - `truncate_text()` helper limits input to 20K chars (~5K tokens)
   - `max_tokens=14000` allows sufficient output space
   - Total context stays within 32K limit of gpt-4o-mini

3. **Timeout Configuration:**
   - 180 seconds timeout for complex multi-question generation
   - Prevents hanging connections in production

---

### 3.3 Project Suggestions Generator (`POST /api/generate-projects`)

**Functionality:** Generates 5 portfolio project ideas aligned with a specific job description.

```python
prompt = f"""Based on job description for {request.jobTitle} at {request.companyName}, 
generate EXACTLY 5 innovative project ideas.

JSON SCHEMA:
[{
    "title": "Project Title",
    "description": "5+ lines detailed description...",
    "technologies": ["15-25 specific technologies"],
    "impressive_reason": "4+ lines why this impresses..."
}]
"""
```

**Design Choices:**
- Higher temperature (0.8) for creative diversity
- Minimum content length requirements in prompt
- Backend validates JSON structure before response

---

### 3.4 AI-Powered Chatbot (`POST /api/chat`)

**Functionality:** Context-aware conversational AI assistant with access to user's application data, resume, and platform knowledge.

**Architecture Complexity:**

```
User Message → Pre-processing → Context Building → LLM Call → Post-processing → Response
                    ↓                   ↓
              Greeting Handler    Database Queries
              Praise Detection    Resume Caching
              Text Normalization  Policy KB Loading
```

**Technical Deep Dive:**

```python
@router.post("/chat")
async def chat(request: ChatRequest):
    message = request.message
    user = request.user or {}
    
    # 1. PRE-PROCESSING LAYER
    # Replace generic references with product name
    message = message.replace("this product", "Interview Vault")
    
    # Handle greetings without LLM call (efficiency)
    greetings = ["hi", "hello", "hey", ...]
    if lower_message in greetings:
        return {"response": f"Hi {user_name}! How can I help?", "queryType": "greeting"}
    
    # 2. CONTEXT BUILDING LAYER
    user_data_context = ""
    if user.get("isAuthenticated"):
        supabase = get_admin_client()
        
        # Fetch user's applications
        applications = supabase.table("applications").select("*")\
            .eq("user_id", user["id"]).execute().data
        
        # Build structured context
        user_data_context = f"""
        Total Applications: {len(applications)}
        Status Summary: {status_counts}
        Company Breakdown: {company_breakdown}
        """
        
        # Resume caching (avoid re-cleaning on every request)
        if not hasattr(chat, "resume_cache"):
            chat.resume_cache = {}
        
        if user_id in chat.resume_cache:
            cleaned_resume = chat.resume_cache[user_id]  # Cache hit
        else:
            resume = supabase.table("resumes").select("resume_text")...
            cleaned_resume = await clean_resume_text(resume)
            chat.resume_cache[user_id] = cleaned_resume  # Cache store
    
    # 3. SYSTEM PROMPT CONSTRUCTION
    system_prompt = f"""
    YOU ARE THE INTERVIEW VAULT ASSISTANT.
    
    CRITICAL RULES:
    - ONLY use company names from database (NO hallucination)
    - For founder queries, use APPLICATION_KNOWLEDGE (NO web search)
    - For policy queries, use POLICY_KNOWLEDGE_BASE
    
    {APPLICATION_KNOWLEDGE}
    {user_data_context}
    {user_resume_context}
    {policy_knowledge}
    """
    
    # 4. LLM CALL
    response_text = await call_openai_api(
        prompt=message,
        system_prompt=system_prompt,
        model="gpt-4o-mini",
        temperature=0.7,
        max_tokens=2000
    )
    
    return {"success": True, "response": response_text}
```

**Key Technical Patterns:**

1. **Function Attribute Caching:**
   ```python
   if not hasattr(chat, "resume_cache"):
       chat.resume_cache = {}
   ```
   - Uses Python function objects as namespace for in-memory cache
   - Avoids global state while persisting across requests
   - Resume cleaning is expensive (~1-2s), caching reduces latency

2. **Prompt Injection Prevention:**
   - System prompt explicitly forbids hallucination
   - Database context is clearly labeled as "source of truth"
   - Out-of-scope queries receive standard rejection response

3. **Multi-Source Context Assembly:**
   - `APPLICATION_KNOWLEDGE`: Static product/founder info
   - `user_data_context`: Dynamic database query results
   - `user_resume_context`: Cleaned resume text
   - `policy_knowledge`: Loaded from cache file

---

### 3.5 Resume Text Cleaning (AI-Powered)

**Problem:** PDF text extraction often produces malformed text (spaced characters, broken emails).

```python
CLEAN_RESUME_PROMPT = """
CLEANING PATTERNS TO APPLY:
1. Character-by-Character Spacing: "P R O F E S S I O N A L" → "PROFESSIONAL"
2. Email Normalization: "user @ gmail . com" → "user@gmail.com"
3. Acronym Spacing: "A W S" → "AWS"
4. Number Formatting: "9 5 %" → "95%"
5. Technical Terms: "Py Spark" → "PySpark"
"""

async def clean_resume_text(raw_text: str) -> str:
    return await call_openai_api(
        prompt=raw_text,
        system_prompt=CLEAN_RESUME_PROMPT,
        model="gpt-4o-mini",
        temperature=0.1,  # Deterministic - preserve original meaning
        max_tokens=4000
    )
```

**Why LLM over Regex?**
- Regex can't handle context-dependent spacing ("React JS" vs "React Native")
- LLM understands semantic meaning of technical terms
- Handles edge cases (mixed languages, creative formatting)

---

## 4. Analytics Engine

### Service Architecture (`analytics_service.py` - 841 lines)

The analytics service implements 12 distinct analytics functions, each executing specific SQL-equivalent queries via Supabase:

| Function | Purpose | Data Source |
|----------|---------|-------------|
| `get_conversion_funnel()` | Overall application funnel | `applications` |
| `get_stage_conversion_rates()` | Stage-to-stage rates | `applications` |
| `get_average_time_by_company()` | Time metrics per company | `applications` + `status_history` |
| `get_time_to_hire_statistics()` | Hiring timeline analysis | `status_history` |
| `get_success_rate_by_industry()` | Industry performance | `applications` |
| `get_success_rate_by_company_size()` | Size-based analysis | `applications` |
| `get_success_rate_by_day_of_week()` | Optimal application days | `applications` |
| `get_success_rate_by_location()` | Geographic trends | `applications` |
| `get_ats_score_correlation()` | Score vs success analysis | `applications` |
| `get_daily_activity_heatmap()` | Activity visualization | `applications` |
| `get_weekly_summary()` | Weekly trends | `applications` |
| `get_monthly_summary()` | Month-over-month trends | `applications` |

### Technical Implementation Pattern

```python
async def get_stage_conversion_rates(user_id: str) -> Dict[str, Any]:
    """
    Stage-to-stage conversion rates with full metrics calculation
    """
    supabase = get_admin_client()
    
    # Single database call - minimize latency
    response = supabase.table("applications")\
        .select("current_status")\
        .eq("user_id", user_id)\
        .execute()
    
    applications = response.data or []
    
    if not applications:
        return {
            "applied": 0, "progressed": 0, "shortlisted": 0,
            "interviewed": 0, "selected": 0, "offers": 0,
            "response_rate": 0, "shortlist_rate": 0, ...
        }
    
    # Status classification using set membership (O(1) lookup)
    progressed_statuses = {'HR Screening Done', 'Shortlisted', 
                          'Interview Scheduled', 'Selected', 'Offer Released'}
    
    # Single-pass aggregation (O(n))
    applied = len(applications)
    progressed = sum(1 for a in applications 
                     if a.get("current_status") in progressed_statuses)
    
    # Rate calculations with division-by-zero protection
    return {
        "applied": applied,
        "progressed": progressed,
        "response_rate": round((progressed / applied * 100), 1) if applied else 0,
        ...
    }
```

**Performance Optimizations:**

1. **Single Query Pattern**: Each function makes one database call instead of multiple
2. **In-Memory Aggregation**: Python handles grouping/counting (faster than complex SQL JOINs for small datasets)
3. **Set Membership**: O(1) status checking instead of string comparison loops
4. **Early Return**: Empty dataset returns immediately with zero values

### Time-to-Hire Calculation (Complex)

```python
async def get_average_time_by_company(user_id: str) -> List[Dict[str, Any]]:
    # Join applications with status_history
    apps = supabase.table("applications").select(...).eq("user_id", user_id).execute()
    app_ids = [app["id"] for app in apps]
    
    history = supabase.table("status_history").select("*").in_("application_id", app_ids).execute()
    
    # Calculate days between status changes
    for h in history:
        applied_dt = datetime.fromisoformat(applied_date.replace('Z', '+00:00'))
        changed_dt = datetime.fromisoformat(changed_at.replace('Z', '+00:00'))
        days_diff = (changed_dt - applied_dt).days
        
        if new_status == 'HR Screening Done':
            company_metrics[company]["days_to_hr_screen"].append(days_diff)
```

---

## 5. Email Service

### Brevo API Integration (`email_service.py`)

```python
async def send_email_via_brevo(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    sender_name: str = "Interview Vault",
    sender_email: str = None
) -> dict:
    """
    Async email sending via Brevo REST API
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            json={
                "sender": {"name": sender_name, "email": sender_email},
                "to": [{"email": to_email, "name": to_name}],
                "subject": subject,
                "htmlContent": html_content
            },
            headers={
                "api-key": settings.BREVO_API_KEY,
                "content-type": "application/json"
            },
            timeout=15.0
        )
        response.raise_for_status()  # Raises on 4xx/5xx
        return {"success": True, "messageId": response.json().get("messageId")}
```

**Why Brevo over SMTP?**
- REST API is simpler than SMTP protocol handling
- Built-in analytics (opens, clicks)
- Deliverability infrastructure (SPF, DKIM managed)
- Rate limiting handled by provider

### Email Templates

Three template generators using Python f-strings with embedded HTML/CSS:

1. **Sign-In Notification** (`get_signin_email_html()`)
   - Security alert with login details
   - Browser/IP information
   - Password reset CTA

2. **Welcome Email** (`get_signup_email_html()`)
   - Feature highlights grid
   - Getting started CTA
   - Professional branding

3. **OTP Email** (`get_otp_email_html()`)
   - 6-digit code display
   - Expiration warning
   - Security disclaimer

---

## 6. Database Design

### Supabase Client Pattern

```python
# services/supabase_service.py
from supabase import create_client, Client

_admin_client: Client = None

def get_admin_client() -> Client:
    """
    Singleton pattern for Supabase admin client
    Uses service role key for full database access
    """
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
    return _admin_client
```

**Why Singleton?**
- Connection reuse across requests
- Avoids authentication overhead per query
- Thread-safe in async context (FastAPI's event loop is single-threaded)

### Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `applications` | Job application records | `id`, `user_id`, `company_name`, `current_status`, `applied_date`, `ats_score` |
| `status_history` | Status change log | `application_id`, `old_status`, `new_status`, `changed_at` |
| `resumes` | User resume storage | `user_id`, `resume_text`, `created_at` |
| `companies` | Company master data | `name`, `industry`, `size`, `location` |
| `digest_preferences` | Email settings | `user_id`, `frequency`, `preferred_time` |

---

## 7. Request Handling & Error Management

### Pydantic Request Models

```python
class InterviewQuestionsRequest(BaseModel):
    resumeText: str
    jobDescription: str
    companyName: Optional[str] = "Company"
    jobTitle: Optional[str] = "Position"
    apiKey: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversationHistory: Optional[list] = None
    user: Optional[dict] = None
```

**Benefits:**
- Automatic JSON parsing
- Type coercion (string → Optional[str])
- Validation errors return 422 with details
- IDE autocomplete support

### Error Handling Strategy

```python
@router.post("/generate-interview-questions")
async def generate_interview_questions(request: InterviewQuestionsRequest):
    try:
        # Business logic...
        
    except ValueError as e:
        # Business logic errors (invalid input, parsing failure)
        raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        # Unexpected errors - log and return generic message
        print(f"Error generating questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate: {str(e)}")
```

**HTTP Status Code Usage:**
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: API key issues
- `422 Unprocessable Entity`: Pydantic validation failure
- `500 Internal Server Error`: AI/DB failures

### CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Development: all origins
    allow_credentials=True,     # Cookie/header passthrough
    allow_methods=["*"],        # All HTTP methods
    allow_headers=["*"],        # All headers
)
```

---

## 8. Security Considerations

### API Key Management

```python
class Settings:
    # Supports both VITE_ prefixed (frontend) and non-prefixed (backend)
    SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') or os.getenv('OPEN_API_KEY', '')
```

### Service Role Key Usage

The backend uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses Row Level Security (RLS). This is intentional because:
1. User authentication is handled by frontend (Supabase Auth)
2. Backend validates `user_id` in every query
3. Service role enables cross-user operations (admin, analytics)

### Input Sanitization

- Pydantic models enforce type constraints
- SQL injection prevented by Supabase client parameterization
- HTML in emails uses f-strings (not user input in templates)

---

## 9. Deployment Architecture

### Docker Configuration

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Database endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access key |
| `OPENAI_API_KEY` | GPT-4o-mini access |
| `BREVO_API_KEY` | Email service |
| `SMTP_USER` | Sender email address |
| `FRONTEND_URL` | CORS and email links |

### Production Optimizations

1. **Uvicorn Workers**: Multiple workers for CPU-bound tasks
2. **Connection Pooling**: Supabase client reuse
3. **Response Caching**: Resume cleaning cached per user
4. **Timeout Configuration**: 180s for AI, 15s for email

---

## Summary

Interview Vault demonstrates a production-grade Python backend with:

- **Modern Async Architecture**: FastAPI + httpx + AsyncOpenAI for non-blocking I/O
- **Intelligent AI Integration**: Prompt engineering, JSON mode, temperature tuning
- **Comprehensive Analytics**: 12 analytics functions with optimized aggregation
- **Robust Error Handling**: Pydantic validation, HTTP exceptions, logging
- **Security-First Design**: Service role separation, input validation, CORS

The codebase follows Python best practices with clear separation of concerns (routers → services), type hints throughout, and comprehensive docstrings for maintainability.
