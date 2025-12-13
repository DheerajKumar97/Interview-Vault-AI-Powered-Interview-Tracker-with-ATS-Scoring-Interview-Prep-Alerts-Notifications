"""
LangGraph-based Web Agent with User Context

This agent is context-aware - it uses the user's resume and experience level
to make relevant web searches. For example, a 6-year experienced developer 
asking about TCS will get results about lateral hiring, not TCS NQT (for freshers).

Architecture:
- Uses LangGraph for state management and multi-step reasoning
- Integrates user resume/experience into search queries
- Tavily for web search with experience-qualified queries
"""
from typing import TypedDict, Annotated, Sequence, List, Dict, Any, Optional, Tuple
import operator
import json

from config import settings


# ═══════════════════════════════════════════════════════════════════════════════
# STATE DEFINITION FOR LANGGRAPH
# ═══════════════════════════════════════════════════════════════════════════════

class AgentState(TypedDict):
    """State that flows through the LangGraph agent."""
    # User context
    user_name: str
    user_experience_years: int
    user_skills: List[str]
    user_job_title: str              # Primary job title
    user_job_titles: List[str]       # All job titles (from applications + resume)
    user_location: str               # Country (e.g., "India", "USA")
    user_cities: List[str]           # Cities mentioned in resume/applications
    
    # Query and conversation
    original_query: str
    messages: Annotated[Sequence[dict], operator.add]
    
    # Search state
    search_queries: List[str]
    search_results: List[dict]
    citations: List[dict]
    
    # Control flow
    iteration: int
    max_iterations: int
    should_continue: bool
    
    # Final output
    final_answer: str
    reasoning_steps: List[str]


# ═══════════════════════════════════════════════════════════════════════════════
# USER CONTEXT EXTRACTION
# ═══════════════════════════════════════════════════════════════════════════════

def extract_user_context(resume_text: str, applications: List[dict] = None) -> dict:
    """
    Extract user context dynamically using regex for experience + text extraction for skills/titles.
    No hardcoded skills - extracts whatever is in the resume and job applications.
    
    Returns:
        dict with experience_years, skills, job_title, job_titles, user_location
    """
    import re
    from collections import Counter
    
    context = {
        "experience_years": 0,
        "skills": [],
        "job_title": "Professional",
        "job_titles": [],
        "user_location": None,  # Country/City for location-aware searches
        "user_cities": []       # Cities mentioned in resume/applications
    }
    
    # ═══════════════════════════════════════════════════════════════
    # EXTRACT YEARS OF EXPERIENCE (regex-based - universal)
    # ═══════════════════════════════════════════════════════════════
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
    
    # ═══════════════════════════════════════════════════════════════
    # DYNAMIC SKILL EXTRACTION (from resume + job applications)
    # No hardcoding - extracts actual technical terms
    # ═══════════════════════════════════════════════════════════════
    
    # Combine all text sources
    all_text = ""
    if resume_text:
        all_text += resume_text + " "
    
    if applications:
        for app in applications:
            if app.get("job_title"):
                all_text += app["job_title"] + " "
            if app.get("job_description"):
                all_text += app["job_description"] + " "
    
    if all_text:
        # Extract skills dynamically using pattern matching for technical terms
        # This catches ANY technical term, not just predefined ones
        
        # Pattern 1: Capitalized acronyms (AWS, SQL, VLSI, FPGA, ASIC, etc.)
        acronyms = re.findall(r'\b[A-Z]{2,6}\b', all_text)
        
        # Pattern 2: CamelCase or mixed case tech terms (PySpark, MongoDB, TensorFlow)
        camel_case = re.findall(r'\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b', all_text)
        
        # Pattern 3: Common tech term patterns (word.js, word-js, etc.)
        tech_patterns = re.findall(r'\b\w+\.(js|py|io|ai|ml)\b', all_text.lower())
        tech_patterns += re.findall(r'\b\w+-\w+\b', all_text.lower())  # e.g., scikit-learn
        
        # Pattern 4: Words followed by typical tech suffixes
        tech_suffixes = re.findall(r'\b\w+(?:DB|SQL|ML|AI|BI|ETL|API|SDK|CLI|IDE)\b', all_text, re.IGNORECASE)
        
        # Pattern 5: Extract from "Skills:" or "Technologies:" sections
        skills_section = re.search(r'(?:skills?|technologies?|tools?|expertise)\s*[:\-]?\s*([^\n]+(?:\n(?![A-Z])[^\n]+)*)', all_text, re.IGNORECASE)
        section_skills = []
        if skills_section:
            # Split by common delimiters
            section_text = skills_section.group(1)
            section_skills = re.split(r'[,;|•·\n]+', section_text)
            section_skills = [s.strip() for s in section_skills if len(s.strip()) > 1 and len(s.strip()) < 30]
        
        # Combine and count frequency
        all_skills = []
        all_skills.extend([a.upper() for a in acronyms if len(a) >= 2])
        all_skills.extend(camel_case)
        all_skills.extend([t.lower() for t in tech_patterns])
        all_skills.extend([t for t in tech_suffixes])
        all_skills.extend(section_skills)
        
        # Filter out common non-skill words
        stop_words = {'THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'ARE', 'WAS', 'HAS', 
                      'HAVE', 'BEEN', 'WERE', 'WILL', 'CAN', 'ALL', 'ANY', 'NOT', 'BUT', 'USE',
                      'USED', 'USING', 'WORK', 'YEAR', 'YEARS', 'NEW', 'ALSO', 'MORE', 'TEAM'}
        
        skill_counter = Counter()
        for skill in all_skills:
            clean_skill = skill.strip()
            if clean_skill.upper() not in stop_words and len(clean_skill) >= 2:
                skill_counter[clean_skill] += 1
        
        # Get top 15 most frequent skills
        top_skills = [skill for skill, _ in skill_counter.most_common(15)]
        context["skills"] = top_skills if top_skills else ["Technical Skills"]
    
    # ═══════════════════════════════════════════════════════════════
    # DYNAMIC JOB TITLE EXTRACTION (No hardcoded patterns)
    # Extracts actual titles from job applications and resume
    # ═══════════════════════════════════════════════════════════════
    
    job_titles = []
    
    # PRIMARY SOURCE: Job applications (what user is actually applying for)
    # These are the most relevant titles - user's target roles
    if applications:
        for app in applications:
            if app.get("job_title"):
                title = app["job_title"].strip()
                if title and len(title) > 3 and len(title) < 80:
                    # Clean up the title
                    title = title.title()  # Proper case
                    job_titles.append(title)
    
    # SECONDARY SOURCE: Resume header lines (first 15 lines usually have title)
    if resume_text:
        lines = resume_text.split('\n')[:15]
        
        for line in lines:
            line = line.strip()
            # Skip very short or very long lines
            if len(line) < 5 or len(line) > 60:
                continue
            
            # Skip lines that look like contact info
            if '@' in line or 'http' in line.lower() or 'phone' in line.lower():
                continue
            
            # Skip lines that are just names (single word or two words with no job-like content)
            words = line.split()
            if len(words) <= 2:
                continue
            
            # Look for lines that explicitly mention title/role/position
            if any(keyword in line.lower() for keyword in ['title:', 'role:', 'position:', 'designation:']):
                # Extract the part after the colon
                if ':' in line:
                    title = line.split(':', 1)[1].strip().title()
                    if title and len(title) > 3:
                        job_titles.append(title)
            
            # Also check for lines that look like professional titles
            # These typically have 2-5 words and don't contain common resume section headers
            section_headers = ['experience', 'education', 'skills', 'projects', 'summary', 
                              'objective', 'contact', 'references', 'certifications']
            if not any(header in line.lower() for header in section_headers):
                # If line has typical title format (3-6 words)
                if 3 <= len(words) <= 6:
                    job_titles.append(line.title())
    
    # Deduplicate and count frequency
    title_counter = Counter(job_titles)
    unique_titles = [title for title, _ in title_counter.most_common(5)]
    
    # Set context
    context["job_titles"] = unique_titles if unique_titles else ["Professional"]
    context["job_title"] = unique_titles[0] if unique_titles else "Professional"
    
    # ═══════════════════════════════════════════════════════════════
    # LOCATION TEXT EXTRACTION (for later LLM-based detection)
    # No hardcoded city lists - collect text for LLM to analyze
    # ═══════════════════════════════════════════════════════════════
    
    location_text = ""
    
    if resume_text:
        location_text += resume_text[:2000] + " "  # First 2000 chars of resume
    
    if applications:
        for app in applications[:5]:  # First 5 applications
            if app.get("company"):
                location_text += app["company"] + " "
            if app.get("location"):
                location_text += app["location"] + " "
    
    # Store location text for async LLM extraction
    context["_location_text"] = location_text
    
    return context


async def extract_location_with_llm(location_text: str) -> dict:
    """
    Use LLM to dynamically extract location from resume/applications text.
    NO HARDCODED city lists - works for any country/city.
    
    Returns:
        dict with user_location (country) and user_cities (list)
    """
    import json
    from openai import AsyncOpenAI
    
    if not location_text.strip():
        return {"user_location": None, "user_cities": []}
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    prompt = f"""Analyze the following text from a resume and job applications to extract the user's location.

TEXT:
{location_text[:1500]}

Based on this text, identify:
1. The user's PRIMARY COUNTRY (where they are based/looking for jobs)
2. The main CITIES mentioned (where user works or is applying to)

If no location is clearly mentioned, respond with null values.

Respond with ONLY a JSON object in this exact format:
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
        
        # Parse JSON response
        if content.startswith("{"):
            result = json.loads(content)
            country = result.get("country")
            cities = result.get("cities", [])
            
            if country:
                print(f"   🌍 LLM detected location: {country}, Cities: {cities}")
                return {"user_location": country, "user_cities": cities}
    
    except Exception as e:
        print(f"   ⚠️ Location extraction error: {str(e)}")
    
    return {"user_location": None, "user_cities": []}


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
# AGENT TOOLS DEFINITION
# ═══════════════════════════════════════════════════════════════════════════════

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "General web search for career information, company details, interview processes, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant information"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_job_sites",
            "description": "Search specific job platforms like LinkedIn, Glassdoor, Naukri, Indeed for company reviews, salaries, job listings, and interview experiences.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query (e.g., 'Google software engineer salary', 'TCS interview reviews')"
                    },
                    "sites": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of job sites to search: linkedin.com, glassdoor.com, indeed.com, naukri.com, ambitionbox.com, etc."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function", 
        "function": {
            "name": "provide_answer",
            "description": "Provide the final answer to the user after gathering enough information from web searches.",
            "parameters": {
                "type": "object",
                "properties": {
                    "answer": {
                        "type": "string",
                        "description": "The comprehensive answer to provide to the user"
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "How confident you are in this answer"
                    }
                },
                "required": ["answer", "confidence"]
            }
        }
    }
]


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORIZED JOB SITES (for intelligent selection based on user profile)
# ═══════════════════════════════════════════════════════════════════════════════

JOB_SITES_BY_CATEGORY = {
    # Always included for any search
    "general": [
        "linkedin.com", "glassdoor.com", "indeed.com"
    ],
    
    # Salary and compensation research
    "salary": [
        "levels.fyi", "glassdoor.com", "payscale.com", "comparably.com", 
        "teamblind.com", "ambitionbox.com"
    ],
    
    # Interview and company reviews
    "reviews": [
        "glassdoor.com", "ambitionbox.com", "teamblind.com", "comparably.com"
    ],
    
    # India-focused job portals
    "india": [
        "naukri.com", "ambitionbox.com", "foundit.in", "hirist.com",
        "instahyre.com", "cutshort.io", "shine.com", "timesjobs.com"
    ],
    
    # Data Engineering, BI, Analytics
    "data_analytics": [
        "levels.fyi", "kaggle.com", "towardsdatascience.com", 
        "analyticsvidhya.com", "kdnuggets.com", "datasciencejobs.com"
    ],
    
    # AI, ML, Deep Learning
    "ai_ml": [
        "ai-jobs.net", "kaggle.com", "machinelearningjobs.com",
        "openai.com/blog", "ai.googleblog.com", "towardsdatascience.com"
    ],
    
    # Software Engineering, Full Stack
    "software": [
        "stackoverflow.com/jobs", "github.careers", "hackernewsjobs.com",
        "arc.dev", "triplebyte.com", "dev.to", "infoq.com"
    ],
    
    # Cloud & DevOps
    "cloud_devops": [
        "aws.amazon.com/blogs", "azure.microsoft.com/blog",
        "cloud.google.com/blog", "kubernetes.io/blog"
    ],
    
    # VLSI, Semiconductor, Hardware
    "vlsi_hardware": [
        "vlsijobs.com", "semiconductorjobs.com", "chipjobs.com",
        "ieee.org/jobs", "semiengineering.com", "allaboutcircuits.com",
        "embedded.com", "electronicsforu.com", "edn.com"
    ],
    
    # Startup & Tech companies
    "startup": [
        "wellfound.com", "ycombinator.com/jobs", "cutshort.io",
        "instahyre.com", "techcrunch.com", "yourstory.com"
    ],
    
    # Remote work
    "remote": [
        "remoteok.com", "weworkremotely.com", "arc.dev", "flexjobs.com"
    ],
    
    # Career insights and research
    "research": [
        "hbr.org", "mckinsey.com", "gartner.com", "forbes.com/careers",
        "glassdoor.com/research", "indeed.com/hiring-lab", "levels.fyi/blog"
    ]
}


async def detect_categories_from_profile(skills: List[str], job_titles: List[str], query: str) -> List[str]:
    """
    Use LLM to dynamically detect which job site categories are relevant 
    based on user's skills and job titles. NO HARDCODING.
    
    Returns list of category names that match JOB_SITES_BY_CATEGORY keys.
    """
    import json
    from openai import AsyncOpenAI
    
    # Available categories (these map to actual site lists)
    available_categories = list(JOB_SITES_BY_CATEGORY.keys())
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    prompt = f"""Based on the user's profile below, select the TOP 2-3 most relevant job site categories.

USER PROFILE:
- Skills: {', '.join(skills[:15]) if skills else 'Not specified'}
- Job Titles: {', '.join(job_titles[:5]) if job_titles else 'Not specified'}
- Current Query: {query}

AVAILABLE CATEGORIES (choose from these ONLY):
{json.dumps(available_categories, indent=2)}

CATEGORY DESCRIPTIONS:
- general: General job portals (LinkedIn, Indeed, Glassdoor)
- salary: Salary/compensation research sites
- reviews: Company reviews and interview experiences
- india: India-specific job portals (Naukri, etc.)
- data_analytics: Data, BI, Analytics focused sites
- ai_ml: AI, Machine Learning, Data Science focused sites
- software: Software engineering, full stack development sites
- cloud_devops: Cloud, DevOps, Infrastructure sites
- vlsi_hardware: VLSI, Semiconductor, Hardware, Embedded sites
- startup: Startup and tech company job sites
- remote: Remote work focused sites
- research: Career research and insights sites

Respond with ONLY a JSON array of 2-3 category names, e.g.: ["data_analytics", "salary", "india"]
Choose categories that best match the user's skills and job titles.
"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a job category classifier. Respond ONLY with a JSON array."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=100
        )
        
        content = response.choices[0].message.content.strip()
        
        # Parse JSON response
        if content.startswith("["):
            categories = json.loads(content)
            # Validate categories exist
            valid_categories = [c for c in categories if c in JOB_SITES_BY_CATEGORY]
            if valid_categories:
                print(f"   🤖 LLM detected categories: {valid_categories}")
                return valid_categories
    except Exception as e:
        print(f"   ⚠️ Category detection error: {str(e)}")
    
    # Fallback to general categories
    return ["general", "salary", "reviews"]


def select_relevant_sites_sync(skills: List[str], job_titles: List[str], query: str) -> List[str]:
    """
    Synchronous fallback for site selection using query-based detection.
    Used when async LLM call is not feasible.
    """
    from collections import Counter
    
    selected_categories = Counter()
    query_lower = query.lower()
    
    # Always include general
    selected_categories["general"] = 5
    
    # Query intent detection (these keywords are for QUERY classification, not skill classification)
    query_intents = {
        "salary": ["salary", "compensation", "pay", "package", "ctc", "offer"],
        "reviews": ["interview", "review", "culture", "work life", "wlb", "experience"],
        "india": ["india", "bangalore", "mumbai", "delhi", "hyderabad", "pune", "chennai"],
        "startup": ["startup", "series", "funding", "early stage", "unicorn"],
        "remote": ["remote", "work from home", "wfh", "hybrid", "distributed"],
        "research": ["market", "trend", "outlook", "forecast", "research", "statistics"]
    }
    
    for category, keywords in query_intents.items():
        if any(word in query_lower for word in keywords):
            selected_categories[category] += 4
    
    # Get top 3 categories
    top_categories = [cat for cat, _ in selected_categories.most_common(3)]
    
    # Build site list
    final_sites = []
    for category in top_categories:
        if category in JOB_SITES_BY_CATEGORY:
            for site in JOB_SITES_BY_CATEGORY[category][:3]:
                if site not in final_sites:
                    final_sites.append(site)
    
    # Ensure minimum sites
    if len(final_sites) < 4:
        for site in ["linkedin.com", "glassdoor.com", "indeed.com", "levels.fyi"]:
            if site not in final_sites:
                final_sites.append(site)
            if len(final_sites) >= 4:
                break
    
    return final_sites[:6]


async def select_relevant_sites(skills: List[str], job_titles: List[str], query: str) -> List[str]:
    """
    Intelligently select relevant job sites using LLM-based category detection.
    NO HARDCODED skill-to-category mappings - fully dynamic.
    """
    # Use LLM to detect categories based on user's profile
    detected_categories = await detect_categories_from_profile(skills, job_titles, query)
    
    # Also detect query intent categories
    query_lower = query.lower()
    intent_categories = []
    
    if any(word in query_lower for word in ["salary", "compensation", "pay", "ctc"]):
        intent_categories.append("salary")
    if any(word in query_lower for word in ["interview", "review", "culture"]):
        intent_categories.append("reviews")
    if any(word in query_lower for word in ["india", "bangalore", "mumbai", "delhi"]):
        intent_categories.append("india")
    
    # Combine LLM categories + query intent categories
    all_categories = list(set(detected_categories + intent_categories))
    
    # Always include general
    if "general" not in all_categories:
        all_categories.insert(0, "general")
    
    # Build final site list
    final_sites = []
    for category in all_categories[:4]:  # Max 4 categories
        if category in JOB_SITES_BY_CATEGORY:
            for site in JOB_SITES_BY_CATEGORY[category][:2]:
                if site not in final_sites:
                    final_sites.append(site)
    
    # Ensure minimum sites
    if len(final_sites) < 4:
        for site in ["linkedin.com", "glassdoor.com", "indeed.com"]:
            if site not in final_sites:
                final_sites.append(site)
    
    print(f"   🎯 Selected sites: {final_sites[:6]}")
    return final_sites[:6]


async def execute_search_web(query: str, max_results: int = 5) -> List[Dict]:
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


async def execute_search_job_sites(query: str, sites: List[str] = None, max_results: int = 5) -> List[Dict]:
    """Execute targeted search on job platforms using Tavily with site filtering."""
    from tavily import TavilyClient
    
    if not settings.TAVILY_API_KEY:
        return []
    
    # Use provided sites or default to top job sites
    target_sites = sites if sites else ["glassdoor.com", "linkedin.com", "ambitionbox.com", "levels.fyi"]
    
    # Build site-specific query
    site_filter = " OR ".join([f"site:{site}" for site in target_sites[:4]])
    enhanced_query = f"{query} ({site_filter})"
    
    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        response = client.search(
            query=enhanced_query,
            search_depth="advanced",  # Deeper search for job sites
            max_results=max_results,
            include_answer=True
        )
        
        results = []
        if response.get("answer"):
            results.append({
                "type": "answer",
                "content": response["answer"],
                "title": "Job Sites Summary",
                "url": None,
                "source": "job_sites"
            })
        
        for result in response.get("results", [])[:max_results]:
            results.append({
                "type": "source",
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", "")[:500],
                "source": "job_sites"
            })
        
        sites_str = ", ".join(target_sites[:3])
        print(f"   💼 Job sites search ({sites_str}): {len(results)} results")
        return results
        
    except Exception as e:
        print(f"   ❌ Job sites search error: {str(e)}")
        return []


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH NODES (Agent Steps)
# ═══════════════════════════════════════════════════════════════════════════════


async def plan_search_node(state: AgentState) -> AgentState:
    """
    THINK: Analyze the query and plan what to search for.
    Uses user context to create experience-appropriate queries.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    from datetime import datetime
    
    print(f"\n📍 Node: plan_search")
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY
    )
    
    experience_qualifier = get_experience_qualifier(state["user_experience_years"])
    
    # Get current date for temporal queries
    current_date = datetime.now()
    current_month = current_date.strftime("%B")  # December
    current_year = current_date.year  # 2025
    
    system_prompt = f"""You are a search query planner for career-related questions.

CURRENT DATE CONTEXT:
- Today's Date: {current_date.strftime("%B %d, %Y")}
- Current Month: {current_month} {current_year}
- Current Year: {current_year}

IMPORTANT: When the user asks about "this month", "current", "now", "today", "latest", 
or any temporal term, ALWAYS include "{current_month} {current_year}" or "{current_year}" 
in the search query to get current results, NOT outdated 2023/2024 data.

USER CONTEXT:
- Experience: {state['user_experience_years']} years
- Skills: {', '.join(state['user_skills'][:10]) if state['user_skills'] else 'Not specified'}
- Target Roles: {', '.join(state.get('user_job_titles', [state['user_job_title']])[:5])}
- Experience Level Qualifier: {experience_qualifier}

LOCATION CONTEXT:
- User's Country: {state.get('user_location', 'India')}
- User's Cities: {', '.join(state.get('user_cities', ['Bangalore', 'Mumbai'])[:3])}

IMPORTANT: The user is based in {state.get('user_location', 'India')}, NOT the United States.
When creating search queries, ALWAYS include "{state.get('user_location', 'India')}" to get 
location-relevant results. Do NOT default to US cities or US data.

IMPORTANT: The user is an EXPERIENCED PROFESSIONAL, not a fresher.
When creating search queries about companies, ALWAYS include "{experience_qualifier}" 
to get relevant results for their experience level.

For example:
- BAD: "job market this month" (returns old 2023 results, US-centric)
- GOOD: "job market {current_month} {current_year} {state.get('user_location', 'India')} data engineer"

- BAD: "TCS interview process" (returns fresher/NQT results)
- GOOD: "TCS interview process lateral hire experienced professional {current_year} India"

Create 1-2 focused search queries that will find CURRENT information for this 
experienced professional in {state.get('user_location', 'India')}. Return ONLY a JSON array of search queries."""

    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Create search queries for: {state['original_query']}")
    ])
    
    try:
        # Parse the queries from response
        content = response.content.strip()
        if content.startswith("["):
            queries = json.loads(content)
        else:
            # Extract JSON array from text
            import re
            match = re.search(r'\[.*?\]', content, re.DOTALL)
            if match:
                queries = json.loads(match.group())
            else:
                # Fallback: use original query with experience qualifier
                queries = [f"{state['original_query']} {experience_qualifier}"]
    except:
        queries = [f"{state['original_query']} {experience_qualifier}"]
    
    state["search_queries"] = queries
    state["reasoning_steps"].append(f"🔍 Planned searches: {queries}")
    
    print(f"   Planned queries: {queries}")
    
    return state


async def search_node(state: AgentState) -> AgentState:
    """
    ACT: Execute web searches using both general web and job-specific searches.
    Uses intelligent site selection based on user's profile (skills + job titles).
    """
    print(f"\n📍 Node: search")
    
    if not settings.TAVILY_API_KEY:
        print("   ⚠️ TAVILY_API_KEY not configured")
        state["reasoning_steps"].append("⚠️ Web search not available (API key missing)")
        state["iteration"] = state["max_iterations"]  # Force exit the loop
        state["should_continue"] = False
        return state
    
    all_results = []
    query_lower = state["original_query"].lower()
    
    # Determine if job sites search is needed based on query
    use_job_sites = any(keyword in query_lower for keyword in [
        "salary", "interview", "review", "culture", "work life", 
        "glassdoor", "linkedin", "hiring", "jobs", "career",
        "company", "compensation", "benefits", "experience", "market"
    ])
    
    for query in state["search_queries"]:
        print(f"   📝 Query: {query[:60]}...")
        state["reasoning_steps"].append(f"📝 Query: {query[:50]}...")
        
        # Tool 1: General web search (always run)
        web_results = await execute_search_web(query, max_results=4)
        state["reasoning_steps"].append(f"🌐 Web search: {len(web_results)} results")
        
        for result in web_results:
            all_results.append(result)
            if result.get("url"):
                state["citations"].append({
                    "title": result.get("title", "Source"),
                    "url": result["url"]
                })
        
        # Tool 2: Job sites search with INTELLIGENT SITE SELECTION
        if use_job_sites:
            # Select sites based on user's skills, job titles, and query (async LLM call)
            relevant_sites = await select_relevant_sites(
                skills=state["user_skills"],
                job_titles=[state["user_job_title"]],
                query=query
            )
            
            # Add site selection to reasoning
            sites_preview = ', '.join(relevant_sites[:3])
            state["reasoning_steps"].append(f"🎯 Selected sites: {sites_preview}")
            
            job_results = await execute_search_job_sites(query, sites=relevant_sites, max_results=4)
            state["reasoning_steps"].append(f"💼 Job sites: {len(job_results)} results")
            
            for result in job_results:
                all_results.append(result)
                if result.get("url"):
                    state["citations"].append({
                        "title": result.get("title", "Job Source"),
                        "url": result["url"]
                    })
    
    state["search_results"] = all_results
    state["reasoning_steps"].append(f"✅ Total: {len(all_results)} results collected")
    state["iteration"] += 1
    
    print(f"   ✅ Total results: {len(all_results)}")
    
    return state


async def synthesize_node(state: AgentState) -> AgentState:
    """
    OBSERVE + RESPOND: Analyze results and create final answer.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    from datetime import datetime
    
    print(f"\n📍 Node: synthesize")
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=settings.OPENAI_API_KEY
    )
    
    # Format search results
    results_text = ""
    for i, result in enumerate(state["search_results"], 1):
        if result["type"] == "answer":
            results_text += f"**Summary:** {result['content']}\n\n"
        else:
            results_text += f"{i}. **{result['title']}**\n{result['content']}\n\n"
    
    experience_qualifier = get_experience_qualifier(state["user_experience_years"])
    
    # Get current date for response context
    current_date = datetime.now()
    current_month = current_date.strftime("%B")
    current_year = current_date.year
    
    system_prompt = f"""You are a career advisor helping an EXPERIENCED professional.

CURRENT DATE: {current_date.strftime("%B %d, %Y")}
When the user asks about "this month", "current", "now", or any temporal term, 
reference {current_month} {current_year} in your response, NOT outdated dates.

USER CONTEXT:
- Name: {state['user_name'] or 'User'}
- Experience: {state['user_experience_years']} years
- Current Role: {state['user_job_title']}
- Skills: {', '.join(state['user_skills'][:10]) if state['user_skills'] else 'Various'}

IMPORTANT: 
- Provide advice relevant to their EXPERIENCE LEVEL ({experience_qualifier})
- Do NOT mention fresher programs, campus hiring, or entry-level processes
- Focus on lateral hiring, experienced professional hiring, direct interviews
- Be specific and actionable
- When mentioning dates/months, use CURRENT date ({current_month} {current_year})
"""

    user_prompt = f"""Based on the search results below, answer this question:

QUESTION: {state['original_query']}

SEARCH RESULTS:
{results_text}

Provide a comprehensive, well-structured answer appropriate for a {state['user_experience_years']} year experienced professional.
"""

    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])
    
    state["final_answer"] = response.content
    state["should_continue"] = False
    state["reasoning_steps"].append("✅ Generated final answer")
    
    print(f"   Answer generated ({len(response.content)} chars)")
    
    return state


def should_continue_search(state: AgentState) -> str:
    """Decide if we need more searches or can synthesize."""
    if state["iteration"] >= state["max_iterations"]:
        return "synthesize"
    if len(state["search_results"]) > 0:
        return "synthesize"
    return "search"


# ═══════════════════════════════════════════════════════════════════════════════
# LANGGRAPH WORKFLOW
# ═══════════════════════════════════════════════════════════════════════════════

def create_agent_graph():
    """Create the LangGraph agent workflow."""
    from langgraph.graph import StateGraph, END
    
    # Create graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("plan", plan_search_node)
    workflow.add_node("search", search_node)
    workflow.add_node("synthesize", synthesize_node)
    
    # Define edges
    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "search")
    workflow.add_conditional_edges(
        "search",
        should_continue_search,
        {
            "synthesize": "synthesize",
            "search": "search"  # Loop back for more searches
        }
    )
    workflow.add_edge("synthesize", END)
    
    return workflow.compile()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

async def run_langgraph_agent(
    query: str,
    user_name: Optional[str] = None,
    resume_text: Optional[str] = None,
    applications: Optional[List[dict]] = None
) -> Tuple[str, List[Dict[str, str]], List[str]]:
    """
    Run the LangGraph agent with user context.
    
    Args:
        query: User's question
        user_name: User's name
        resume_text: User's resume content for context extraction
        applications: User's job applications
        
    Returns:
        Tuple of (answer, citations, reasoning_steps)
    """
    # Start capturing reasoning steps
    reasoning_steps = []
    
    print(f"\n{'='*60}")
    print(f"🧠 LangGraph Agent Started")
    print(f"   Query: {query[:50]}...")
    print(f"{'='*60}")
    
    reasoning_steps.append(f"🧠 Agent started for: {query[:60]}...")
    
    # Extract user context from resume (sync part)
    user_context = extract_user_context(resume_text or "", applications or [])
    
    # Extract location using LLM (async - no hardcoding)
    location_text = user_context.get("_location_text", "")
    if location_text:
        location_info = await extract_location_with_llm(location_text)
        user_context["user_location"] = location_info.get("user_location")
        user_context["user_cities"] = location_info.get("user_cities", [])
    
    # Add user context to reasoning
    skills_str = ', '.join(user_context['skills'][:6]) if user_context['skills'] else 'Not detected'
    titles_str = ', '.join(user_context.get('job_titles', [])[:3]) if user_context.get('job_titles') else 'Professional'
    location_str = user_context.get('user_location', 'Not detected')
    cities_str = ', '.join(user_context.get('user_cities', [])[:3]) if user_context.get('user_cities') else 'Not detected'
    
    reasoning_steps.append(f"📋 Experience: {user_context['experience_years']} years")
    reasoning_steps.append(f"🛠️ Skills: {skills_str}")
    reasoning_steps.append(f"💼 Target Roles: {titles_str}")
    reasoning_steps.append(f"🌍 Location: {location_str} ({cities_str})")
    
    print(f"📋 User Context:")
    print(f"   Experience: {user_context['experience_years']} years")
    print(f"   Skills: {user_context['skills'][:8]}")
    print(f"   Title: {user_context['job_title']}")
    print(f"   All Titles: {user_context.get('job_titles', [])}")
    print(f"   🌍 Location: {user_context.get('user_location', 'Not detected')}")
    print(f"   🌍 Cities: {user_context.get('user_cities', [])}")
    
    # Initialize state
    initial_state: AgentState = {
        "user_name": user_name or "",
        "user_experience_years": user_context["experience_years"],
        "user_skills": user_context["skills"],
        "user_job_title": user_context["job_title"],
        "user_job_titles": user_context.get("job_titles", [user_context["job_title"]]),
        "user_location": user_context.get("user_location") or "Not specified",
        "user_cities": user_context.get("user_cities", []),
        "original_query": query,
        "messages": [],
        "search_queries": [],
        "search_results": [],
        "citations": [],
        "iteration": 0,
        "max_iterations": 2,
        "should_continue": True,
        "final_answer": "",
        "reasoning_steps": reasoning_steps  # Pre-captured user context steps
    }
    
    try:
        # Create and run the graph
        graph = create_agent_graph()
        final_state = await graph.ainvoke(initial_state)
        
        # Deduplicate citations
        unique_citations = []
        seen_urls = set()
        for cite in final_state["citations"]:
            if cite["url"] and cite["url"] not in seen_urls:
                unique_citations.append(cite)
                seen_urls.add(cite["url"])
        
        print(f"\n{'='*60}")
        print(f"🎯 Agent completed")
        print(f"   Iterations: {final_state['iteration']}")
        print(f"   Citations: {len(unique_citations)}")
        print(f"{'='*60}\n")
        
        return (
            final_state["final_answer"],
            unique_citations[:5],
            final_state["reasoning_steps"]
        )
        
    except Exception as e:
        print(f"LangGraph agent error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return (
            f"I encountered an error while searching. Please try again.",
            [],
            [f"Error: {str(e)}"]
        )
