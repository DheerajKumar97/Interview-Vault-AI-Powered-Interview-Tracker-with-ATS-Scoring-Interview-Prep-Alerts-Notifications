"""
Web Agent Service - Handles external web search for career-related queries

This service provides web search capabilities using Tavily API for queries that
require external information (company interviews, career advice, etc.) that
cannot be answered from the RAG internal knowledge base.

RAG-First Priority:
- Internal data (applications, resume, policies) are handled by rag_service.py
- This service is ONLY invoked when:
  1. RAG finds no relevant internal data
  2. Query matches WEB_AGENT_TRIGGER_TOPICS
  3. User explicitly requests web search
"""
from typing import List, Dict, Any, Tuple, Optional
from config import settings

# ═══════════════════════════════════════════════════════════════════════════════
# WEB AGENT TRIGGER DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

# Topics that should trigger web agent (when internal RAG has no data)
WEB_AGENT_TRIGGER_KEYWORDS = [
    # Company-specific interview processes
    "interview process",
    "interview at",
    "hiring process",
    "interview rounds",
    "how to get into",
    "interview stages",
    "interview experience",
    
    # Career advice
    "career advice",
    "career path",
    "career growth",
    "career transition",
    "should i learn",
    "skills to learn",
    "what skills",
    "skill roadmap",
    "learning path",
    
    # Job market
    "job market",
    "salary for",
    "average salary",
    "salary range",
    "compensation for",
    "job trends",
    "hiring trends",
    
    # Company research - FLEXIBLE KEYWORDS (no 'at' required)
    "company culture",
    "work culture",
    "company profile",
    "work life balance",
    "reviews of",
    "what is it like to work",
    "pros and cons",
    "about the company",
    "additional details about",
    
    # Role-specific queries
    "day in the life",
    "responsibilities of",
    "what does a",
    "how to become",
    "roadmap to become",
    
    # Industry research
    "best companies for",
    "top companies in",
    "companies hiring for",
]

# Phrases that should NOT trigger web agent (handled by internal knowledge)
NON_TRIGGER_PHRASES = [
    "my applications",
    "my resume",
    "my status",
    "my statistics",
    "interview vault",
    "this app",
    "this platform",
    "founder",
    "dheeraj",
    "policies",
    "privacy",
    "best ats scores",
    "top ats scores",
    "resume matching with companies",
    "terms",
]


def should_trigger_web_agent(message: str, rag_found_relevant: bool = False) -> bool:
    """
    Determine if a message should trigger the web agent.
    
    Args:
        message: User's query
        rag_found_relevant: Whether RAG found relevant internal data (NOT used to block anymore)
        
    Returns:
        True if web agent should be triggered
    """
    lower_message = message.lower().strip()
    
    # Never trigger for internal queries
    for phrase in NON_TRIGGER_PHRASES:
        if phrase in lower_message:
            return False
    
    # Check if message matches any trigger keywords
    # NOTE: We now trigger even if RAG found data, because the user might be asking
    # about EXTERNAL info (company culture) even though they have internal data (their application)
    for keyword in WEB_AGENT_TRIGGER_KEYWORDS:
        if keyword in lower_message:
            print(f"🌐 Web Agent trigger matched: '{keyword}' in message")
            return True
    
    return False


# ═══════════════════════════════════════════════════════════════════════════════
# TAVILY WEB SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

async def search_web(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search the web using Tavily API.
    
    Args:
        query: Search query
        max_results: Maximum number of results to return
        
    Returns:
        List of search results with title, url, and content
    """
    if not settings.TAVILY_API_KEY:
        print("⚠️ TAVILY_API_KEY not configured - web search disabled")
        return []
    
    try:
        from tavily import TavilyClient
        
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        
        # Enhance query for better career-related results
        enhanced_query = f"{query} career hiring interview"
        
        response = client.search(
            query=enhanced_query,
            search_depth="basic",  # "basic" is faster, "advanced" for deeper search
            max_results=max_results,
            include_answer=True,  # Get AI-generated answer summary
            include_raw_content=False,  # Don't need full page content
        )
        
        results = []
        
        # Add the AI answer if available
        if response.get("answer"):
            results.append({
                "type": "answer",
                "content": response["answer"],
                "title": "AI Summary",
                "url": None
            })
        
        # Add individual search results
        for result in response.get("results", [])[:max_results]:
            results.append({
                "type": "source",
                "title": result.get("title", ""),
                "url": result.get("url", ""),
                "content": result.get("content", "")[:500],  # Truncate content
                "score": result.get("score", 0)
            })
        
        print(f"🌐 Web search returned {len(results)} results for: {query[:50]}...")
        return results
        
    except ImportError:
        print("❌ tavily-python not installed. Run: pip install tavily-python")
        return []
    except Exception as e:
        print(f"❌ Web search error: {str(e)}")
        return []


def format_web_results_for_llm(results: List[Dict[str, Any]]) -> str:
    """
    Format web search results as context for the LLM.
    
    Args:
        results: List of search results from search_web()
        
    Returns:
        Formatted string for LLM context
    """
    if not results:
        return ""
    
    formatted = "## 🌐 WEB SEARCH RESULTS\n\n"
    
    # Add AI answer first if present
    answer_results = [r for r in results if r.get("type") == "answer"]
    if answer_results:
        formatted += f"**Summary:** {answer_results[0]['content']}\n\n"
    
    # Add source results
    source_results = [r for r in results if r.get("type") == "source"]
    if source_results:
        formatted += "**Sources:**\n"
        for i, result in enumerate(source_results, 1):
            formatted += f"{i}. **{result['title']}**\n"
            formatted += f"   URL: {result['url']}\n"
            formatted += f"   {result['content'][:200]}...\n\n"
    
    return formatted


def extract_citations(results: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Extract citation URLs from search results.
    
    Args:
        results: List of search results
        
    Returns:
        List of citation objects with title and url
    """
    citations = []
    for result in results:
        if result.get("type") == "source" and result.get("url"):
            citations.append({
                "title": result.get("title", "Source"),
                "url": result["url"]
            })
    return citations

# ═══════════════════════════════════════════════════════════════════════════════
# REACT AGENT WITH MULTI-STEP REASONING
# ═══════════════════════════════════════════════════════════════════════════════

import json
from openai import AsyncOpenAI

# Maximum reasoning iterations to prevent infinite loops
MAX_ITERATIONS = 3

# Tool definitions for OpenAI function calling
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for information about companies, interview processes, career advice, salary information, or job market trends.",
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


async def run_react_agent(
    query: str,
    user_name: Optional[str] = None
) -> Tuple[str, List[Dict[str, str]], List[str]]:
    """
    Run a ReAct (Reasoning + Acting) agent that can perform multi-step web searches.
    
    Args:
        query: User's original question
        user_name: User's name for personalization
        
    Returns:
        Tuple of (final_answer, citations, thought_process)
    """
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    all_citations = []
    thought_process = []
    messages = [
        {
            "role": "system",
            "content": f"""You are a career advisor AI agent that helps job seekers.
{f"The user's name is {user_name}." if user_name else ""}

You have access to tools to search the web for information. Use the ReAct approach:
1. THINK: Analyze what information you need
2. ACT: Use tools to gather information  
3. OBSERVE: Review the results
4. REPEAT if needed (max {MAX_ITERATIONS} searches)
5. RESPOND: Provide a comprehensive answer

When you have enough information, use provide_answer to give your final response.
Be thorough but efficient - don't search more than necessary."""
        },
        {
            "role": "user",
            "content": query
        }
    ]
    
    print(f"\n{'='*60}")
    print(f"🧠 ReAct Agent Started for: {query[:50]}...")
    print(f"{'='*60}")
    
    iteration = 0
    all_search_results = []
    
    while iteration < MAX_ITERATIONS:
        iteration += 1
        print(f"\n📍 Iteration {iteration}/{MAX_ITERATIONS}")
        
        try:
            # Call OpenAI with function calling
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=AGENT_TOOLS,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=1500
            )
            
            assistant_message = response.choices[0].message
            
            # Check if the model wants to call a tool
            if assistant_message.tool_calls:
                for tool_call in assistant_message.tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    print(f"🔧 Tool: {function_name}")
                    print(f"   Args: {function_args}")
                    
                    if function_name == "search_web":
                        # Execute web search
                        search_query = function_args.get("query", query)
                        thought_process.append(f"🔍 Searching: {search_query}")
                        
                        results = await search_web(search_query, max_results=5)
                        all_search_results.extend(results)
                        
                        # Extract citations from this search
                        new_citations = extract_citations(results)
                        all_citations.extend(new_citations)
                        
                        # Format results for context
                        formatted_results = format_web_results_for_llm(results)
                        
                        # Add tool response to conversation
                        messages.append(assistant_message)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": formatted_results if formatted_results else "No results found for this query."
                        })
                        
                        thought_process.append(f"📊 Found {len(results)} results")
                        
                    elif function_name == "provide_answer":
                        # Agent is ready to provide final answer
                        final_answer = function_args.get("answer", "")
                        confidence = function_args.get("confidence", "medium")
                        
                        thought_process.append(f"✅ Final answer (confidence: {confidence})")
                        
                        print(f"\n{'='*60}")
                        print(f"🎯 Agent completed in {iteration} iteration(s)")
                        print(f"📚 Total citations: {len(all_citations)}")
                        print(f"💭 Thought steps: {len(thought_process)}")
                        print(f"{'='*60}\n")
                        
                        # Deduplicate citations
                        unique_citations = []
                        seen_urls = set()
                        for cite in all_citations:
                            if cite["url"] not in seen_urls:
                                unique_citations.append(cite)
                                seen_urls.add(cite["url"])
                        
                        return (final_answer, unique_citations[:5], thought_process)
            else:
                # Model responded without tool call - treat as final answer
                final_answer = assistant_message.content or ""
                thought_process.append("💬 Direct response (no search needed)")
                
                # Deduplicate citations
                unique_citations = []
                seen_urls = set()
                for cite in all_citations:
                    if cite["url"] not in seen_urls:
                        unique_citations.append(cite)
                        seen_urls.add(cite["url"])
                
                return (final_answer, unique_citations[:5], thought_process)
                
        except Exception as e:
            print(f"❌ ReAct iteration error: {str(e)}")
            thought_process.append(f"⚠️ Error: {str(e)}")
            break
    
    # Max iterations reached - summarize what we have
    print(f"\n⚠️ Max iterations ({MAX_ITERATIONS}) reached, generating summary...")
    thought_process.append(f"⏱️ Max iterations reached, summarizing results")
    
    if all_search_results:
        # Generate final summary from accumulated results
        from services.ai_service import call_openai_api
        
        all_context = format_web_results_for_llm(all_search_results)
        
        summary = await call_openai_api(
            prompt=f"Based on the following search results, provide a comprehensive answer to: {query}\n\n{all_context}",
            system_prompt="You are a career advisor. Synthesize the information and provide a helpful, well-structured answer.",
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=1500
        )
        
        # Deduplicate citations
        unique_citations = []
        seen_urls = set()
        for cite in all_citations:
            if cite["url"] not in seen_urls:
                unique_citations.append(cite)
                seen_urls.add(cite["url"])
        
        return (summary, unique_citations[:5], thought_process)
    
    return ("I couldn't find enough information to answer your question. Please try rephrasing.", [], thought_process)


async def get_web_agent_response(
    query: str,
    user_name: Optional[str] = None,
    resume_text: Optional[str] = None,
    applications: Optional[List[Dict[str, Any]]] = None
) -> Tuple[str, List[Dict[str, str]]]:
    """
    Get a web agent response using LangGraph with user context.
    
    Uses the user's resume to understand their experience level and provide
    relevant search results (e.g., lateral hiring for experienced professionals,
    not fresher programs like NQT).
    
    Args:
        query: User's query
        user_name: User's name for personalization
        resume_text: User's resume content for context extraction
        applications: User's job applications
        
    Returns:
        Tuple of (formatted_response, citations)
    """
    try:
        # Try LangGraph agent first (context-aware)
        from services.langgraph_agent import run_langgraph_agent
        
        print(f"🌐 Using LangGraph agent with user context...")
        answer, citations, thoughts = await run_langgraph_agent(
            query=query,
            user_name=user_name,
            resume_text=resume_text,
            applications=applications
        )
        
        return (answer, citations)
        
    except ImportError as e:
        print(f"⚠️ LangGraph not available ({e}), falling back to ReAct agent...")
        # Fallback to native OpenAI ReAct if LangGraph not installed
        answer, citations, thoughts = await run_react_agent(query, user_name)
        return (answer, citations)
        
    except Exception as e:
        print(f"❌ LangGraph agent error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        
        # Fallback to single-step search
        print("⚠️ Falling back to single-step search...")
        return await _fallback_single_search(query, user_name)


async def _fallback_single_search(
    query: str,
    user_name: Optional[str] = None
) -> Tuple[str, List[Dict[str, str]]]:
    """Fallback to simple single-step search if ReAct fails."""
    from services.ai_service import call_openai_api
    
    results = await search_web(query, max_results=5)
    
    if not results:
        return ("I couldn't find relevant information. Please try rephrasing.", [])
    
    web_context = format_web_results_for_llm(results)
    
    prompt = f"""Answer this question based on the search results:
    
Question: {query}

{web_context}

Provide a helpful, well-structured answer."""

    response = await call_openai_api(
        prompt=prompt,
        system_prompt="You are a career advisor helping job seekers.",
        model="gpt-4o-mini",
        temperature=0.7,
        max_tokens=1500
    )
    
    citations = extract_citations(results)
    return (response, citations)

