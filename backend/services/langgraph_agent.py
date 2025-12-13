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
    user_job_title: str
    
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
    Extract user context from resume for search contextualization.
    
    Returns:
        dict with experience_years, skills, job_title
    """
    context = {
        "experience_years": 0,
        "skills": [],
        "job_title": "professional"
    }
    
    if not resume_text:
        return context
    
    resume_lower = resume_text.lower()
    
    # Extract years of experience
    import re
    
    # Pattern: "X years", "X+ years", "X-Y years"
    exp_patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)',
        r'(?:experience|exp)(?:\s*:)?\s*(\d+)\+?\s*years?',
        r'(\d+)\s*years?\s*(?:in|of)\s*(?:data|software|development|engineering)',
    ]
    
    for pattern in exp_patterns:
        match = re.search(pattern, resume_lower)
        if match:
            context["experience_years"] = int(match.group(1))
            break
    
    # Extract skills (common tech skills)
    skill_keywords = [
        "python", "java", "javascript", "typescript", "sql", "react", "node.js",
        "aws", "azure", "gcp", "docker", "kubernetes", "tableau", "power bi",
        "machine learning", "data engineering", "etl", "spark", "databricks",
        "airflow", "kafka", "postgresql", "mongodb", "redis", "git"
    ]
    
    for skill in skill_keywords:
        if skill in resume_lower:
            context["skills"].append(skill)
    
    # Extract job title patterns
    title_patterns = [
        r'(senior\s+)?data\s+engineer',
        r'(senior\s+)?software\s+engineer',
        r'(senior\s+)?data\s+analyst',
        r'(senior\s+)?developer',
        r'(lead\s+)?engineer',
        r'(senior\s+)?consultant',
    ]
    
    for pattern in title_patterns:
        match = re.search(pattern, resume_lower)
        if match:
            context["job_title"] = match.group(0).title()
            break
    
    return context


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
# LANGGRAPH NODES (Agent Steps)
# ═══════════════════════════════════════════════════════════════════════════════

async def plan_search_node(state: AgentState) -> AgentState:
    """
    THINK: Analyze the query and plan what to search for.
    Uses user context to create experience-appropriate queries.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    
    print(f"\n📍 Node: plan_search")
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.3,
        api_key=settings.OPENAI_API_KEY
    )
    
    experience_qualifier = get_experience_qualifier(state["user_experience_years"])
    
    system_prompt = f"""You are a search query planner for career-related questions.

USER CONTEXT:
- Experience: {state['user_experience_years']} years
- Skills: {', '.join(state['user_skills'][:10]) if state['user_skills'] else 'Not specified'}
- Current Role: {state['user_job_title']}
- Experience Level Qualifier: {experience_qualifier}

IMPORTANT: The user is an EXPERIENCED PROFESSIONAL, not a fresher.
When creating search queries about companies, ALWAYS include "{experience_qualifier}" 
to get relevant results for their experience level.

For example:
- BAD: "TCS interview process" (will return fresher/NQT results)
- GOOD: "TCS interview process lateral hire experienced professional"

Create 1-2 focused search queries that will find relevant information for this 
experienced professional. Return ONLY a JSON array of search queries.
"""

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
    ACT: Execute web searches using Tavily.
    """
    from tavily import TavilyClient
    
    print(f"\n📍 Node: search")
    
    if not settings.TAVILY_API_KEY:
        print("⚠️ TAVILY_API_KEY not configured")
        state["reasoning_steps"].append("⚠️ Web search not available")
        return state
    
    client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    all_results = []
    
    for query in state["search_queries"]:
        try:
            print(f"   Searching: {query[:60]}...")
            
            response = client.search(
                query=query,
                search_depth="basic",
                max_results=5,
                include_answer=True
            )
            
            # Add AI answer if available
            if response.get("answer"):
                all_results.append({
                    "type": "answer",
                    "content": response["answer"],
                    "title": "AI Summary",
                    "url": None
                })
            
            # Add search results
            for result in response.get("results", [])[:5]:
                all_results.append({
                    "type": "source",
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", "")[:500]
                })
                
                # Add to citations
                if result.get("url"):
                    state["citations"].append({
                        "title": result.get("title", "Source"),
                        "url": result["url"]
                    })
            
            print(f"   Found {len(response.get('results', []))} results")
            
        except Exception as e:
            print(f"   Search error: {str(e)}")
            state["reasoning_steps"].append(f"⚠️ Search error: {str(e)}")
    
    state["search_results"] = all_results
    state["reasoning_steps"].append(f"📊 Found {len(all_results)} total results")
    state["iteration"] += 1
    
    return state


async def synthesize_node(state: AgentState) -> AgentState:
    """
    OBSERVE + RESPOND: Analyze results and create final answer.
    """
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import HumanMessage, SystemMessage
    
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
    
    system_prompt = f"""You are a career advisor helping an EXPERIENCED professional.

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
    print(f"\n{'='*60}")
    print(f"🧠 LangGraph Agent Started")
    print(f"   Query: {query[:50]}...")
    print(f"{'='*60}")
    
    # Extract user context from resume
    user_context = extract_user_context(resume_text or "", applications or [])
    
    print(f"📋 User Context:")
    print(f"   Experience: {user_context['experience_years']} years")
    print(f"   Skills: {user_context['skills'][:5]}")
    print(f"   Title: {user_context['job_title']}")
    
    # Initialize state
    initial_state: AgentState = {
        "user_name": user_name or "",
        "user_experience_years": user_context["experience_years"],
        "user_skills": user_context["skills"],
        "user_job_title": user_context["job_title"],
        "original_query": query,
        "messages": [],
        "search_queries": [],
        "search_results": [],
        "citations": [],
        "iteration": 0,
        "max_iterations": 2,
        "should_continue": True,
        "final_answer": "",
        "reasoning_steps": []
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
        print(f"❌ LangGraph agent error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return (
            f"I encountered an error while searching. Please try again.",
            [],
            [f"Error: {str(e)}"]
        )
