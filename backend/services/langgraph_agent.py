"""
LangGraph-based True AI Agent with User Context

This agent is a TRUE AGENTIC SYSTEM where the LLM decides:
- WHETHER to search the web
- WHICH tool to use (search_web vs search_job_sites)
- WHEN to provide the final answer

Architecture:
- Uses LangGraph with ToolNode for tool execution
- LLM has bound tools and decides which to call
- Integrates user resume/experience into search context
- Tavily for web search with experience-qualified queries
"""
from typing import TypedDict, Annotated, Sequence, List, Dict, Any, Optional, Tuple
import operator
import json
from datetime import datetime

from config import settings

# LangChain imports
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI


# ═══════════════════════════════════════════════════════════════════════════════
# STATE DEFINITION FOR LANGGRAPH (Updated for True Agent)
# ═══════════════════════════════════════════════════════════════════════════════

def add_messages(left: Sequence[BaseMessage], right: Sequence[BaseMessage]) -> Sequence[BaseMessage]:
    """Reducer that appends messages."""
    return list(left) + list(right)


class AgentState(TypedDict):
    """State that flows through the LangGraph agent."""
    # Conversation messages (LangChain format for tool calling)
    messages: Annotated[Sequence[BaseMessage], add_messages]
    
    # User context (for system prompt)
    user_name: str
    user_experience_years: int
    user_skills: List[str]
    user_job_title: str
    user_job_titles: List[str]
    user_location: str
    user_cities: List[str]
    user_applications: List[dict]  # User's job applications for RAG lookup
    
    # Original query for reference
    original_query: str
    
    # Collected data
    citations: List[dict]
    reasoning_steps: List[str]
    
    # Control flow
    iteration: int
    max_iterations: int
    
    # Final output
    final_answer: str


# ═══════════════════════════════════════════════════════════════════════════════
# USER CONTEXT EXTRACTION (Keep existing logic)
# ═══════════════════════════════════════════════════════════════════════════════

def extract_user_context(resume_text: str, applications: List[dict] = None) -> dict:
    """
    Extract user context dynamically using regex for experience + text extraction for skills/titles.
    No hardcoded skills - extracts whatever is in the resume and job applications.
    """
    import re
    from collections import Counter
    
    context = {
        "experience_years": 0,
        "skills": [],
        "job_title": "Professional",
        "job_titles": [],
        "user_location": None,
        "user_cities": []
    }
    
    # Extract years of experience
    if resume_text:
        resume_lower = resume_text.lower()
        exp_patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)',
            r'(?:experience|exp)(?:\s*:)?\s*(\d+)\+?\s*years?',
            r'(\d+)\s*years?\s*(?:in|of)\s*(?:\w+\s*){0,3}',
        ]
        for pattern in exp_patterns:
            match = re.search(pattern, resume_lower)
            if match:
                context["experience_years"] = int(match.group(1))
                break
    
    # Extract skills dynamically - ONLY from resume (not job applications)
    all_text = ""
    if resume_text:
        all_text = resume_text
    
    if all_text:
        # Extract acronyms (AWS, SQL, etc.)
        acronyms = re.findall(r'\b[A-Z]{2,6}\b', all_text)
        # CamelCase terms (PySpark, TensorFlow)
        camel_case = re.findall(r'\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b', all_text)
        
        # Skills section extraction
        skills_section = re.search(r'(?:skills?|technologies?|tools?|expertise)\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z])[^\n]+)*)', all_text, re.IGNORECASE)
        section_skills = []
        if skills_section:
            section_text = skills_section.group(1)
            section_skills = re.split(r'[,;|•·\n]+', section_text)
            section_skills = [s.strip() for s in section_skills if len(s.strip()) > 1 and len(s.strip()) < 30]
        
        # Combine and filter
        all_skills = [a.upper() for a in acronyms if len(a) >= 2] + camel_case + section_skills
        stop_words = {'THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'ARE', 'WAS', 'HAS', 
                      'HAVE', 'BEEN', 'WERE', 'WILL', 'CAN', 'ALL', 'ANY', 'NOT', 'BUT', 'USE',
                      'USED', 'USING', 'WORK', 'YEAR', 'YEARS', 'NEW', 'ALSO', 'MORE', 'TEAM'}
        
        skill_counter = Counter()
        for skill in all_skills:
            clean_skill = skill.strip()
            if clean_skill.upper() not in stop_words and len(clean_skill) >= 2:
                skill_counter[clean_skill] += 1
        
        context["skills"] = [skill for skill, _ in skill_counter.most_common(15)] or ["Technical Skills"]
    
    # Store resume text for async role extraction (will use LLM to infer actual roles)
    context["_role_text"] = resume_text[:3000] if resume_text else ""
    context["job_titles"] = []  # Will be populated by LLM
    context["job_title"] = "Professional"  # Default, will be updated by LLM
    
    # Store location text for async extraction
    location_text = ""
    if resume_text:
        location_text += resume_text[:2000] + " "
    if applications:
        for app in applications[:5]:
            if app.get("location"):
                location_text += app["location"] + " "
    context["_location_text"] = location_text
    
    return context


async def extract_location_with_llm(location_text: str) -> dict:
    """Use LLM to dynamically extract location from resume/applications text."""
    from openai import AsyncOpenAI
    
    if not location_text.strip():
        return {"user_location": None, "user_cities": []}
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    prompt = f"""Analyze the following text to extract the user's location.

TEXT:
{location_text[:1500]}

Respond with ONLY a JSON object:
{{"country": "India", "cities": ["Bangalore", "Mumbai"]}}

Or if unknown:
{{"country": null, "cities": []}}
"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a location extractor. Respond ONLY with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=100
        )
        
        content = response.choices[0].message.content.strip()
        if content.startswith("{"):
            result = json.loads(content)
            return {"user_location": result.get("country"), "user_cities": result.get("cities", [])}
    except Exception as e:
        print(f"   ⚠️ Location extraction error: {str(e)}")
    
    return {"user_location": None, "user_cities": []}


async def extract_roles_with_llm(role_text: str, skills: List[str]) -> dict:
    """
    Use LLM to intelligently infer actual job roles from resume skills and responsibilities.
    Instead of using job titles from applications, analyze what the user ACTUALLY does.
    """
    from openai import AsyncOpenAI
    
    if not role_text.strip():
        return {"job_title": "Professional", "job_titles": []}
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    skills_str = ', '.join(skills[:10]) if skills else "Not specified"
    
    prompt = f"""Analyze this resume text and infer the user's ACTUAL job roles based on their skills and responsibilities.

RESUME TEXT:
{role_text[:2000]}

DETECTED SKILLS: {skills_str}

IMPORTANT:
- Do NOT use the job title mentioned in the resume literally (e.g., if resume says "Senior Software Engineer" but responsibilities are all about Power BI/Tableau, infer BI-related roles)
- Analyze the RESPONSIBILITIES and SKILLS to determine what roles fit best
- Focus on BI, Data, Analytics roles if skills include Power BI, Tableau, SQL, ETL, etc.
- Provide market-relevant job titles that match their actual work

Respond with ONLY a JSON object:
{{"primary_role": "Senior Power BI Developer", "matching_roles": ["Senior BI Developer", "Senior Data Analyst", "Business Intelligence Engineer", "Senior Tableau Developer"]}}

The matching_roles should be 4-5 roles that match their actual skills and experience."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a career analyst. Infer job roles from skills and responsibilities, NOT from job titles. Respond ONLY with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        content = response.choices[0].message.content.strip()
        # Clean up markdown if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        
        if content.startswith("{"):
            result = json.loads(content)
            roles = result.get("matching_roles", [])
            primary = result.get("primary_role", roles[0] if roles else "Professional")
            print(f"   🎯 LLM inferred roles: {primary}, {roles[:3]}")
            return {"job_title": primary, "job_titles": roles[:5]}
    except Exception as e:
        print(f"   ⚠️ Role extraction error: {str(e)}")
    
    return {"job_title": "Professional", "job_titles": []}


def get_experience_qualifier(years: int) -> str:
    """Get search qualifier based on experience level."""
    if years >= 10:
        return "senior experienced professional lateral hire"
    elif years >= 5:
        return "experienced professional lateral hire mid-senior level"
    elif years >= 2:
        return "experienced professional lateral hire"
    else:
        return "entry level fresher"


# ═══════════════════════════════════════════════════════════════════════════════
# CORE SEARCH FUNCTIONS (Keep existing Tavily logic)
# ═══════════════════════════════════════════════════════════════════════════════

async def _execute_search_web(query: str, max_results: int = 5) -> List[Dict]:
    """Execute general web search using Tavily."""
    from tavily import TavilyClient
    
    if not settings.TAVILY_API_KEY:
        return []
    
    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=True
        )
        
        results = []
        if response.get("answer"):
            results.append({
                "type": "answer",
                "content": response["answer"],
                "title": "AI Summary",
                "url": None
            })
        
        for result in response.get("results", [])[:max_results]:
            results.append({
                "type": "source",
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", "")[:500]
            })
        
        print(f"   🌐 Web search: {len(results)} results for '{query[:40]}...'")
        return results
        
    except Exception as e:
        print(f"   ❌ Web search error: {str(e)}")
        return []


async def _execute_search_job_sites(query: str, sites: List[str] = None, max_results: int = 5) -> List[Dict]:
    """Execute targeted search on job platforms using Tavily with site filtering."""
    from tavily import TavilyClient
    
    if not settings.TAVILY_API_KEY:
        return []
    
    target_sites = sites if sites else ["glassdoor.com", "linkedin.com", "ambitionbox.com", "levels.fyi"]
    site_filter = " OR ".join([f"site:{site}" for site in target_sites[:4]])
    enhanced_query = f"{query} ({site_filter})"
    
    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        response = client.search(
            query=enhanced_query,
            search_depth="advanced",
            max_results=max_results,
            include_answer=True
        )
        
        results = []
        if response.get("answer"):
            results.append({
                "type": "answer",
                "content": response["answer"],
                "title": "Job Sites Summary",
                "url": None
            })
        
        for result in response.get("results", [])[:max_results]:
            results.append({
                "type": "source",
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", "")[:500]
            })
        
        print(f"   💼 Job sites search: {len(results)} results")
        return results
        
    except Exception as e:
        print(f"   ❌ Job sites search error: {str(e)}")
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# LANGCHAIN TOOLS (LLM will decide which to call)
# ═══════════════════════════════════════════════════════════════════════════════

# Global state holder for tools to access user context
_current_agent_state: Dict[str, Any] = {}


@tool
async def search_web(query: str) -> str:
    """
    General web search for career information, company details, interview processes, etc.
    Use this for broad searches about companies, career advice, or general information.
    
    Args:
        query: The search query to find relevant information
    
    Returns:
        Search results as formatted text
    """
    global _current_agent_state
    
    # Enhance query with user context if available
    experience_years = _current_agent_state.get("user_experience_years", 0)
    user_location = _current_agent_state.get("user_location", "")
    
    if experience_years >= 2:
        qualifier = get_experience_qualifier(experience_years)
        enhanced_query = f"{query} {qualifier}"
    else:
        enhanced_query = query
    
    if user_location and "india" not in query.lower():
        enhanced_query += f" {user_location}"
    
    # Add career context to prevent irrelevant results (like health articles)
    enhanced_query += " job salary career"
    
    # Add current date context
    current_date = datetime.now()
    enhanced_query += f" {current_date.strftime('%B %Y')}"
    
    print(f"   🔧 Tool: search_web")
    print(f"   📝 Enhanced query: {enhanced_query[:60]}...")
    
    results = await _execute_search_web(enhanced_query, max_results=5)
    
    # Store citations
    for r in results:
        if r.get("url"):
            if "citations" not in _current_agent_state:
                _current_agent_state["citations"] = []
            _current_agent_state["citations"].append({
                "title": r.get("title", "Source"),
                "url": r["url"]
            })
    
    # Format results for LLM
    if not results:
        return "No results found for this search query."
    
    formatted = "## Web Search Results\n\n"
    for i, r in enumerate(results, 1):
        if r["type"] == "answer":
            formatted += f"**AI Summary:** {r['content']}\n\n"
        else:
            formatted += f"{i}. **{r['title']}**\n"
            formatted += f"   {r['content'][:200]}...\n\n"
    
    return formatted


@tool
async def search_job_sites(query: str, sites: Optional[List[str]] = None) -> str:
    """
    Search specific job platforms like LinkedIn, Glassdoor, Naukri, Indeed for:
    - Company reviews and ratings
    - Salary information and compensation data
    - Interview experiences and processes
    - Job listings and requirements
    
    Use this when the user asks about salaries, interviews, company culture, or job reviews.
    
    Args:
        query: The search query (e.g., 'Google software engineer salary', 'TCS interview reviews')
        sites: Optional list of specific job sites to search (e.g., ['glassdoor.com', 'levels.fyi'])
    
    Returns:
        Search results from job platforms as formatted text
    """
    global _current_agent_state
    
    # Enhance query with user context
    experience_years = _current_agent_state.get("user_experience_years", 0)
    user_location = _current_agent_state.get("user_location", "")
    
    if experience_years >= 2:
        qualifier = get_experience_qualifier(experience_years)
        enhanced_query = f"{query} {qualifier}"
    else:
        enhanced_query = query
    
    if user_location:
        enhanced_query += f" {user_location}"
    
    print(f"   🔧 Tool: search_job_sites")
    print(f"   📝 Enhanced query: {enhanced_query[:60]}...")
    
    results = await _execute_search_job_sites(enhanced_query, sites=sites, max_results=5)
    
    # Store citations
    for r in results:
        if r.get("url"):
            if "citations" not in _current_agent_state:
                _current_agent_state["citations"] = []
            _current_agent_state["citations"].append({
                "title": r.get("title", "Job Source"),
                "url": r["url"]
            })
    
    # Format results for LLM
    if not results:
        return "No job site results found for this query."
    
    formatted = "## Job Sites Search Results\n\n"
    for i, r in enumerate(results, 1):
        if r["type"] == "answer":
            formatted += f"**Summary:** {r['content']}\n\n"
        else:
            formatted += f"{i}. **{r['title']}**\n"
            formatted += f"   {r['content'][:200]}...\n\n"
    
    return formatted


@tool
async def analyze_salary_expectation(
    company: str,
    job_title: str,
    job_description: Optional[str] = None
) -> str:
    """
    Analyze expected salary based on user's market fitness.
    
    This tool performs DEEP REASONING to estimate what salary the user 
    can realistically demand based on:
    - Their skills and experience (from resume)
    - Market rates for the role
    - Company-specific compensation data
    - Skill-to-job fit percentage
    
    Use this when user asks "What salary can I expect?", "How much should I ask?",
    "Am I being offered a fair salary?", or wants to negotiate salary.
    
    Args:
        company: Target company name (e.g., "Google", "TCS", "Infosys")
        job_title: Role being considered (e.g., "Senior Data Engineer", "BI Developer")
        job_description: Optional job requirements to match against user's skills
    
    Returns:
        Detailed salary analysis with market fitness score, recommended ranges,
        and negotiation tips based on user's specific strengths.
    """
    global _current_agent_state
    from openai import AsyncOpenAI
    
    print(f"   🔧 Tool: analyze_salary_expectation")
    print(f"   📊 Analyzing: {job_title} at {company}")
    
    # Step 1: Get user context from global state
    user_skills = _current_agent_state.get("user_skills", [])
    user_experience = _current_agent_state.get("user_experience_years", 0)
    user_location = _current_agent_state.get("user_location", "India")
    user_job_titles = _current_agent_state.get("user_job_titles", [])
    
    print(f"   👤 User Profile: {user_experience} years, {len(user_skills)} skills")
    
    # Step 2: Search market salary data
    qualifier = get_experience_qualifier(user_experience)
    market_query = f"{job_title} salary {user_location} {user_experience} years experience {qualifier}"
    
    market_results = await _execute_search_job_sites(
        market_query,
        sites=["glassdoor.com", "levels.fyi", "ambitionbox.com", "payscale.com"],
        max_results=5
    )
    
    # Step 3: Search company-specific data
    company_query = f"{company} {job_title} salary compensation package benefits {user_location}"
    company_results = await _execute_search_job_sites(
        company_query,
        sites=["glassdoor.com", "linkedin.com", "levels.fyi", "ambitionbox.com"],
        max_results=5
    )
    
    # Store citations
    all_results = market_results + company_results
    for r in all_results:
        if r.get("url"):
            if "citations" not in _current_agent_state:
                _current_agent_state["citations"] = []
            _current_agent_state["citations"].append({
                "title": r.get("title", "Salary Source"),
                "url": r["url"]
            })
    
    # Format search results for analysis
    market_data = "\n".join([
        f"- {r.get('title', 'N/A')}: {r.get('content', '')[:300]}"
        for r in market_results if r.get('content')
    ]) or "No market data found"
    
    company_data = "\n".join([
        f"- {r.get('title', 'N/A')}: {r.get('content', '')[:300]}"
        for r in company_results if r.get('content')
    ]) or "No company-specific data found"
    
    # Step 4: Deep Reasoning with LLM
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    skills_str = ', '.join(user_skills[:15]) if user_skills else "Not extracted"
    titles_str = ', '.join(user_job_titles[:5]) if user_job_titles else job_title
    
    reasoning_prompt = f"""You are an expert salary negotiation consultant with deep knowledge of the {user_location} job market.

PERFORM A COMPREHENSIVE SALARY ANALYSIS:

═══════════════════════════════════════════════════════════════
USER PROFILE (From Resume)
═══════════════════════════════════════════════════════════════
• Experience: {user_experience} years
• Skills: {skills_str}
• Target Roles: {titles_str}
• Location: {user_location}
• Target Position: {job_title} at {company}

═══════════════════════════════════════════════════════════════
MARKET SALARY DATA (From Web Search)
═══════════════════════════════════════════════════════════════
{market_data}

═══════════════════════════════════════════════════════════════
COMPANY-SPECIFIC DATA (From Web Search)
═══════════════════════════════════════════════════════════════
{company_data}

{f"JOB DESCRIPTION PROVIDED: {job_description[:500]}" if job_description else ""}

═══════════════════════════════════════════════════════════════
SALARY CALIBRATION - REALISTIC RANGES (DO NOT OVER-INFLATE!)
═══════════════════════════════════════════════════════════════
Based on the user's location ({user_location}) and {user_experience} years experience.

🚨 IMPORTANT: Be REALISTIC, not optimistic! Use these as BASELINE for Analytics/BI/Data roles:

For 5-7 years experience (like this user with {user_experience} YOE):
- Conservative (safe floor): ₹15-18 LPA
- Market Average (fair ask): ₹18-22 LPA  
- Competitive (top tier): ₹22-28 LPA
- Exceptional (FAANG/top product only): ₹28-35 LPA

For 3-5 years experience:
- ₹8-12 LPA (conservative) to ₹12-18 LPA (competitive)

For 8-10+ years experience:
- ₹25-35 LPA (market) to ₹35-50 LPA (exceptional)

Company tier multipliers (apply to base ranges above):
- Startups/Small companies: 0.8-0.9x (may offer equity instead)
- Service companies (TCS, Infosys, Wipro): 0.85-1.0x
- Mid-tier product companies: 1.0-1.2x
- Large MNCs (non-tech): 1.0-1.15x
- Top tech companies (Google, Microsoft, Amazon, Meta): 1.5-2.0x

⚠️ ANTI-INFLATION CHECK:
- Do NOT suggest ₹30+ LPA for non-FAANG companies for 6 YOE
- Do NOT apply all skill premiums cumulatively (max +30% total)
- Be conservative - it's better to under-promise than disappoint
- The web search data should GUIDE your estimates, not inflate them

CRITICAL: Cross-check your final numbers against the MARKET DATA above.
If your estimate exceeds ₹25 LPA for a 6 YOE role at a non-FAANG company, reconsider!



═══════════════════════════════════════════════════════════════
ANALYZE AND PROVIDE DETAILED OUTPUT:
═══════════════════════════════════════════════════════════════

Provide your analysis in this EXACT format:

🎯 **SALARY ANALYSIS: {job_title} at {company}**

📊 **YOUR MARKET FITNESS SCORE:** XX/100
(Based on skills match, experience level, and market demand)

🔍 **SKILL MATCH ANALYSIS:**
✅ **Strong Match:** [List skills that match well]
⚠️ **Gaps:** [List any skill gaps]
💡 **Recommendation:** [How to improve]

💰 **MARKET RATE RANGE ({user_location}, {user_experience} YOE):**
- 25th Percentile (Entry): **₹XX LPA**
- 50th Percentile (Market): **₹XX LPA**
- 75th Percentile (Competitive): **₹XX LPA**
- 90th Percentile (Top): **₹XX LPA**

🏢 **{company.upper()} ADJUSTMENT:**
[Is {company} above/below/at market rate? By how much?]

🎯 **YOUR RECOMMENDED ASK:**
- Minimum: **₹XX LPA** (Safe floor - accept if no alternatives)
- Target: **₹XX LPA** (Fair ask - start negotiations here)
- Stretch: **₹XX LPA** (If you have competing offers)

💡 **NEGOTIATION TIPS FOR YOUR PROFILE:**
1. [Specific tip based on user's strengths]
2. [Specific tip based on market conditions]
3. [Specific tip for {company}]

⚠️ **IMPORTANT CONSIDERATIONS:**
[Any specific notes about {company}, market trends, or timing]

FORMATTING RULES:
- Bold headings/subheadings (like **SKILL MATCH ANALYSIS:**)
- Bold salary amounts (like **₹18 LPA**) and role titles (like **Senior BI Developer**)
- Do NOT bold regular description text, tips content, or explanations"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert salary negotiation consultant. Provide detailed, data-driven salary analysis. Always use specific numbers and percentages. Be comprehensive but structured."},
                {"role": "user", "content": reasoning_prompt}
            ],
            temperature=0.5,
            max_tokens=2000
        )
        
        analysis = response.choices[0].message.content
        print(f"   ✅ Deep analysis completed: {len(analysis)} chars")
        return analysis
        
    except Exception as e:
        print(f"   ❌ Analysis error: {str(e)}")
        return f"Error performing salary analysis: {str(e)}"


@tool
async def compare_companies(
    companies: List[str],
    comparison_aspects: Optional[List[str]] = None
) -> str:
    """
    Compare multiple companies for salary, work culture, interview process, and more.
    
    Use this when user wants to compare job offers, decide between companies,
    or understand differences between potential employers.
    
    Args:
        companies: List of company names to compare (e.g., ["Google", "Microsoft", "Amazon"])
        comparison_aspects: Optional aspects to focus on (default: salary, culture, growth, wlb)
    
    Returns:
        Detailed comparison table with user-relevant insights.
    """
    global _current_agent_state
    from openai import AsyncOpenAI
    
    print(f"   🔧 Tool: compare_companies")
    print(f"   📊 Comparing: {', '.join(companies)}")
    
    # Get user context
    user_skills = _current_agent_state.get("user_skills", [])
    user_experience = _current_agent_state.get("user_experience_years", 0)
    user_location = _current_agent_state.get("user_location", "India")
    user_job_title = _current_agent_state.get("user_job_title", "Software Engineer")
    
    # Default comparison aspects
    aspects = comparison_aspects or ["salary", "work-life balance", "growth opportunities", "interview process", "culture"]
    
    # Search for each company
    all_company_data = {}
    for company in companies[:4]:  # Limit to 4 companies
        query = f"{company} {user_job_title} {user_location} {' '.join(aspects[:3])} employee review"
        results = await _execute_search_job_sites(
            query,
            sites=["glassdoor.com", "ambitionbox.com", "linkedin.com"],
            max_results=3
        )
        
        all_company_data[company] = "\n".join([
            f"- {r.get('title', 'N/A')}: {r.get('content', '')[:200]}"
            for r in results if r.get('content')
        ]) or "Limited data available"
        
        # Store citations
        for r in results:
            if r.get("url"):
                if "citations" not in _current_agent_state:
                    _current_agent_state["citations"] = []
                _current_agent_state["citations"].append({
                    "title": r.get("title", f"{company} Review"),
                    "url": r["url"]
                })
    
    # Deep comparison with LLM
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    company_sections = "\n\n".join([
        f"═══ {company.upper()} ═══\n{data}"
        for company, data in all_company_data.items()
    ])
    
    comparison_prompt = f"""You are a career advisor helping a {user_experience}-year experienced professional in {user_location} compare companies.

USER PROFILE:
• Experience: {user_experience} years
• Skills: {', '.join(user_skills[:10])}
• Target Role: {user_job_title}

COMPANIES TO COMPARE: {', '.join(companies)}
COMPARISON ASPECTS: {', '.join(aspects)}

DATA COLLECTED:
{company_sections}

Provide a COMPREHENSIVE comparison in this format:

🏆 **COMPANY COMPARISON: {' vs '.join(companies[:3])}**

**📊 QUICK COMPARISON TABLE:**
| Aspect | {' | '.join(companies[:4])} |
|--------|{'|'.join(['---' for _ in companies[:4]])}|
| Salary Range | | | |
| Work-Life Balance | ⭐⭐⭐ | | |
| Growth Opportunities | | | |
| Interview Difficulty | | | |
| Culture Rating | | | |

**💰 SALARY COMPARISON (For {user_job_title}, {user_experience} YOE):**
[Detailed salary ranges for each company]

**🏢 COMPANY-BY-COMPANY ANALYSIS:**
[Brief pros/cons for each company]

**🎯 RECOMMENDATION FOR YOUR PROFILE:**
Based on your skills ({', '.join(user_skills[:5])}) and experience:
[Which company is best fit and why]

**💡 DECISION FACTORS:**
[Key points to consider for this decision]"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a career advisor. Provide balanced, data-driven company comparisons. Use ratings, emojis, and tables for clarity."},
                {"role": "user", "content": comparison_prompt}
            ],
            temperature=0.5,
            max_tokens=2000
        )
        
        comparison = response.choices[0].message.content
        print(f"   ✅ Comparison completed: {len(comparison)} chars")
        return comparison
        
    except Exception as e:
        print(f"   ❌ Comparison error: {str(e)}")
        return f"Error comparing companies: {str(e)}"


@tool
def search_user_applications(company_name: str) -> str:
    """
    Search user's job applications for a specific company to get actual job details.
    
    Use this FIRST when user mentions a specific company or application they applied for.
    This returns the REAL job title from their application, not an inferred guess.
    
    Example: User says "my 3i Infotech application" → Use this to get actual job title.
    
    Args:
        company_name: Name of the company to search for (e.g., "3i Infotech", "TCS", "Google")
    
    Returns:
        Application details including actual job title, company, job description, and status.
    """
    global _current_agent_state
    
    print(f"   🔧 Tool: search_user_applications")
    print(f"   🔍 Searching for company: {company_name}")
    
    # Get applications from state
    applications = _current_agent_state.get("user_applications", [])
    
    print(f"   📊 Total applications in state: {len(applications)}")
    if applications:
        print(f"   📋 Sample app keys: {list(applications[0].keys())[:5]}")
    
    if not applications:
        return f"No applications found. User hasn't applied to {company_name} or no application data available."
    
    # Search for matching company (case-insensitive partial match)
    # Note: Database uses 'name' field for company name, not 'company'
    company_lower = company_name.lower().strip()
    matching_apps = []
    
    for app in applications:
        # Try multiple possible keys for company name
        app_company = (app.get("name") or app.get("company") or app.get("company_name") or "").lower()
        if company_lower in app_company or app_company in company_lower:
            matching_apps.append(app)
    
    if not matching_apps:
        # Try fuzzy match on company name
        for app in applications:
            app_company = (app.get("name") or app.get("company") or app.get("company_name") or "").lower()
            # Check if any word matches
            if any(word in app_company for word in company_lower.split()):
                matching_apps.append(app)
    
    if not matching_apps:
        available_companies = [(app.get("name") or app.get("company") or "Unknown") for app in applications[:5]]
        return f"No application found for '{company_name}'. User has applied to: {', '.join(available_companies)}"
    
    # Format matching applications
    result = f"📋 Found {len(matching_apps)} application(s) for '{company_name}':\n\n"
    
    for i, app in enumerate(matching_apps[:3], 1):
        job_title = app.get("job_title", "Not specified")
        company = app.get("name") or app.get("company") or "Unknown"
        status = app.get("current_status") or app.get("status") or "Unknown"
        job_desc = (app.get("job_description") or "")[:500] if app.get("job_description") else "No description"
        location = app.get("location", "Not specified")
        
        result += f"**Application {i}:**\n"
        result += f"• Job Title: **{job_title}**\n"
        result += f"• Company: {company}\n"
        result += f"• Location: {location}\n"
        result += f"• Status: {status}\n"
        result += f"• Description: {job_desc[:200]}...\n\n"
        
        print(f"   ✅ Found: {job_title} at {company}")
    
    return result


# List of tools for the agent (includes internal search + web search)
AGENT_TOOLS = [search_user_applications, search_web, search_job_sites, analyze_salary_expectation, compare_companies]


# ═══════════════════════════════════════════════════════════════════════════════
# TRUE AGENT WORKFLOW (LLM decides which tools to call)
# ═══════════════════════════════════════════════════════════════════════════════

def create_system_prompt(state: AgentState) -> str:
    """Create a context-aware system prompt for the agent."""
    current_date = datetime.now()
    
    return f"""You are a career advisor AI agent for Interview Vault, helping job seekers with career-related questions.

CURRENT DATE: {current_date.strftime('%B %d, %Y')}

USER PROFILE:
- Name: {state.get('user_name', 'User')}
- Experience: {state.get('user_experience_years', 0)} years
- Skills: {', '.join(state.get('user_skills', [])[:8])}
- Target Roles: {', '.join(state.get('user_job_titles', ['Professional'])[:3])}
- Location: {state.get('user_location', 'Not specified')}

YOU HAVE ACCESS TO THESE TOOLS - USE THEM WISELY:

1. **search_user_applications** 🔍 INTERNAL DATA LOOKUP (USE FIRST!)
   Use FIRST when: User mentions a specific company or application they applied for
   Example: "my 3i Infotech application", "TCS job I applied", "Google position"
   Returns: ACTUAL job title, company, job description from their application
   ⚠️ ALWAYS use this before analyze_salary_expectation when user mentions specific application!

2. **search_web** - General web search
   Use for: Career advice, interview processes, company info, job market trends
   Example: "What is Google's interview process?"

3. **search_job_sites** - Job platform search (Glassdoor, LinkedIn, levels.fyi)
   Use for: Quick salary lookups, company reviews, interview experiences
   Example: "TCS reviews", "Amazon interview experience"

4. **analyze_salary_expectation** ⭐ DEEP ANALYSIS TOOL
   Use for: Personalized salary recommendations based on user's specific profile
   Use when: User asks "What salary should I expect?", "How much can I ask?", "Am I underpaid?"
   ⚠️ If user mentions specific application, FIRST use search_user_applications to get job title!
   
5. **compare_companies** - Multi-company comparison
   Use for: Comparing job offers, deciding between companies
   Use when: User asks "Google vs Microsoft?", "Which company is better for me?"

🚨 CRITICAL DECISION RULES - READ CAREFULLY 🚨

1. For GREETINGS (Hi, Hello): Respond directly WITHOUT tools

2. For ANY salary-related query, YOU MUST use **analyze_salary_expectation**:
   - "What salary can I ask?"
   - "Reasonable salary for..."
   - "Salary at [company]"
   - "CTC for this role"
   - "How much should I negotiate?"
   - "Am I being paid fairly?"
   
   DO NOT use search_web or search_job_sites for salary - they give generic data!
   The analyze_salary_expectation tool gives PERSONALIZED analysis based on user's skills.

3. For company comparisons, use **compare_companies**

4. For general info (interview process, culture), use search_web or search_job_sites

SALARY GUIDELINES (for the user's location: {state.get('user_location', 'Not specified')}):
- Use market data from web search for accurate regional salary figures
- Experience premiums: Senior roles (5-8 YOE) should be significantly higher than mid-level
- Tech skills like Data Engineering, ML, Cloud: Add 20-30% premium
- Top tech companies typically pay 1.5-2x market rate

IMPORTANT: 
- The user is in {state.get('user_location', 'Not specified')} with {state.get('user_experience_years', 0)} years experience
- Always personalize answers to their experience level
- Current date: {current_date.strftime('%B %Y')}

RESPONSE FORMATTING RULES (STRICTLY FOLLOW):
1. BOLD ONLY these items:
   - Section headers: **Market Rate Range:**, **Negotiation Tips:**, **Recommendations:**
   - Salary amounts: **₹18 LPA**, **₹22 LPA**
   - Role titles: **Senior BI Developer**, **Power BI Developer**
   
2. DO NOT BOLD:
   - Regular sentences and descriptions
   - Bullet point content (use plain text)
   - Tips and recommendations content (only bold the header)
   - General advice text

3. Example of CORRECT format:
   **Market Rate Range:**
   - Minimum: **₹18 LPA**
   - Target: **₹22 LPA**
   
   **Recommendations:**
   - Consider upskilling in cloud technologies (plain text, NOT bold)
   
4. Keep responses clean with proper line spacing"""



async def agent_node(state: AgentState) -> dict:
    """
    The main agent node - LLM decides what to do.
    This is where the "agentic" behavior happens.
    """
    global _current_agent_state
    
    # Update global state for tools to access
    _current_agent_state = dict(state)
    
    print(f"\n📍 Node: agent (iteration {state.get('iteration', 0) + 1})")
    
    # Create LLM with bound tools
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=settings.OPENAI_API_KEY
    ).bind_tools(AGENT_TOOLS)
    
    # Build system prompt
    system_prompt = create_system_prompt(state)
    
    # Prepare messages
    messages = [SystemMessage(content=system_prompt)] + list(state.get("messages", []))
    
    # Call LLM - it will decide whether to use tools or respond directly
    response = await llm.ainvoke(messages)
    
    print(f"   🤖 LLM response type: {'Tool calls' if response.tool_calls else 'Direct answer'}")
    
    if response.tool_calls:
        for tc in response.tool_calls:
            print(f"   📞 Calling tool: {tc['name']}")
            state["reasoning_steps"].append(f"🔧 Agent decided to use: {tc['name']}")
    else:
        state["reasoning_steps"].append("💬 Agent provided direct answer (no tools needed)")
    
    return {"messages": [response], "iteration": state.get("iteration", 0) + 1}


async def tool_node(state: AgentState) -> dict:
    """Execute the tools that the agent decided to call."""
    from langgraph.prebuilt import ToolNode as LangGraphToolNode
    
    print(f"\n📍 Node: tools")
    
    # Create tool node
    tool_executor = LangGraphToolNode(AGENT_TOOLS)
    
    # Execute tools
    result = await tool_executor.ainvoke(state)
    
    # Log what was executed
    if "messages" in result:
        for msg in result["messages"]:
            if isinstance(msg, ToolMessage):
                state["reasoning_steps"].append(f"📊 Tool result received: {msg.name}")
    
    return result


def should_continue(state: AgentState) -> str:
    """
    Determine if we should continue to tools or end.
    This is the key "agentic" decision point.
    """
    messages = state.get("messages", [])
    if not messages:
        return "end"
    
    last_message = messages[-1]
    
    # Check iteration limit
    if state.get("iteration", 0) >= state.get("max_iterations", 3):
        print("   ⚠️ Max iterations reached, ending")
        return "end"
    
    # If LLM made tool calls, execute them
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        print("   ➡️ Routing to: tools")
        return "tools"
    
    # Otherwise, we're done
    print("   ➡️ Routing to: end")
    return "end"


def create_true_agent_graph():
    """Create the LangGraph workflow where LLM decides which tools to call."""
    from langgraph.graph import StateGraph, END
    
    # Create graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add conditional routing - this is where agent "decides"
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "end": END
        }
    )
    
    # After tools, go back to agent to process results
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT (Same signature for backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════════

async def run_langgraph_agent(
    query: str,
    user_name: Optional[str] = None,
    resume_text: Optional[str] = None,
    applications: Optional[List[dict]] = None
) -> Tuple[str, List[Dict[str, str]], List[str]]:
    """
    Run the TRUE AGENT with user context.
    
    The LLM now DECIDES whether to search or answer directly.
    
    Args:
        query: User's question
        user_name: User's name
        resume_text: User's resume content for context extraction
        applications: User's job applications
        
    Returns:
        Tuple of (answer, citations, reasoning_steps)
    """
    global _current_agent_state
    
    reasoning_steps = []
    
    print(f"\n{'='*60}")
    print(f"🧠 AGENT Started (LLM decides tools)")
    print(f"   Query: {query[:50]}...")
    print(f"{'='*60}")
    
    reasoning_steps.append(f"🧠Agent started: {query[:60]}...")
    
    # Extract user context
    user_context = extract_user_context(resume_text or "", applications or [])
    
    # Extract location using LLM
    location_text = user_context.get("_location_text", "")
    if location_text:
        location_info = await extract_location_with_llm(location_text)
        user_context["user_location"] = location_info.get("user_location")
        user_context["user_cities"] = location_info.get("user_cities", [])
    
    # Extract actual roles from resume using LLM (NOT from applied job titles)
    role_text = user_context.get("_role_text", "")
    if role_text:
        role_info = await extract_roles_with_llm(role_text, user_context.get("skills", []))
        user_context["job_title"] = role_info.get("job_title", "Professional")
        user_context["job_titles"] = role_info.get("job_titles", [])
    
    # Log context
    skills_str = ', '.join(user_context['skills'][:6]) if user_context['skills'] else 'Not detected'
    roles_str = ', '.join(user_context.get('job_titles', [])[:3]) if user_context.get('job_titles') else 'Not detected'
    reasoning_steps.append(f"📋 Experience: {user_context['experience_years']} years")
    reasoning_steps.append(f"🛠️ Skills: {skills_str}")
    reasoning_steps.append(f"🎯 Roles: {roles_str}")
    reasoning_steps.append(f"🌍 Location: {user_context.get('user_location', 'Not detected')}")
    
    print(f"📋 User Context:")
    print(f"   Experience: {user_context['experience_years']} years")
    print(f"   Skills: {user_context['skills'][:5]}")
    print(f"   Inferred Roles: {user_context.get('job_titles', [])[:3]}")
    print(f"   Location: {user_context.get('user_location', 'Not detected')}")
    
    # Initialize state
    initial_state: AgentState = {
        "messages": [HumanMessage(content=query)],
        "user_name": user_name or "",
        "user_experience_years": user_context["experience_years"],
        "user_skills": user_context["skills"],
        "user_job_title": user_context["job_title"],
        "user_job_titles": user_context.get("job_titles", [user_context["job_title"]]),
        "user_location": user_context.get("user_location") or "India",
        "user_cities": user_context.get("user_cities", []),
        "user_applications": applications or [],  # Pass applications for RAG tool
        "original_query": query,
        "citations": [],
        "reasoning_steps": reasoning_steps,
        "iteration": 0,
        "max_iterations": 3,
        "final_answer": ""
    }
    
    # Update global state
    _current_agent_state = dict(initial_state)
    
    # DEBUG: Verify applications are in state
    print(f"   🔍 DEBUG: Applications in initial_state: {len(initial_state.get('user_applications', []))}")
    if initial_state.get('user_applications'):
        first_app = initial_state['user_applications'][0]
        print(f"   🔍 DEBUG: First app keys: {list(first_app.keys())[:6]}")
        print(f"   🔍 DEBUG: First app company: name={first_app.get('name')}")
    
    try:
        # Create and run the TRUE AGENT graph
        graph = create_true_agent_graph()
        final_state = await graph.ainvoke(initial_state)
        
        # Extract final answer from last AI message
        final_answer = ""
        for msg in reversed(final_state.get("messages", [])):
            if isinstance(msg, AIMessage) and msg.content and not msg.tool_calls:
                final_answer = msg.content
                break
        
        if not final_answer:
            # Fallback: get any AI message content
            for msg in reversed(final_state.get("messages", [])):
                if isinstance(msg, AIMessage) and msg.content:
                    final_answer = msg.content
                    break
        
        # Get citations from global state
        citations = _current_agent_state.get("citations", [])
        
        def is_career_relevant(cite: dict) -> bool:
            """Check if citation is career-related using keyword matching"""
            url = cite.get("url", "").lower()
            title = cite.get("title", "").lower()
            combined = url + " " + title
            
            # Career-related keywords (if any present, source is relevant)
            career_keywords = [
                "salary", "job", "career", "hire", "interview", "resume",
                "developer", "engineer", "analyst", "manager", "role",
                "company", "work", "employ", "pay", "compensation", "ctc",
                "lpa", "package", "offer", "position", "talent", "recruit"
            ]
            
            # Check if URL/title contains career keywords
            return any(kw in combined for kw in career_keywords)
        
        # Deduplicate and filter citations by relevance
        unique_citations = []
        seen_urls = set()
        for cite in citations:
            url = cite.get("url", "").lower()
            if not url or url in seen_urls:
                continue
            
            # Only include career-relevant sources
            if is_career_relevant(cite):
                unique_citations.append(cite)
                seen_urls.add(url)
            else:
                print(f"   ⛔ Filtered non-career source: {cite.get('title', url)[:40]}...")
        
        print(f"\n{'='*60}")
        print(f"🎯 AGENT completed")
        print(f"   Iterations: {final_state.get('iteration', 0)}")
        print(f"   Citations: {len(unique_citations)}")
        print(f"   Answer length: {len(final_answer)} chars")
        print(f"{'='*60}\n")
        
        return (
            final_answer or "I couldn't generate a response. Please try again.",
            unique_citations[:5],
            final_state.get("reasoning_steps", reasoning_steps)
        )
        
    except Exception as e:
        print(f"❌ True Agent error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return (
            f"I encountered an error while processing your request. Please try again.",
            [],
            [f"❌ Error: {str(e)}"]
        )
