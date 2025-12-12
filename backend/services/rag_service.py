"""
RAG Service - Retrieval-Augmented Generation using FAISS and OpenAI Embeddings

This service implements true RAG for the Interview Vault chatbot:
1. Chunks user data (applications, resume, policies) into searchable documents
2. Generates embeddings using OpenAI text-embedding-3-small
3. Builds FAISS index for efficient similarity search
4. Retrieves top-K relevant chunks for user queries
"""
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from config import settings

# FAISS import with fallback
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print("WARNING: FAISS not available, RAG will fall back to full context mode")


# ═══════════════════════════════════════════════════════════════════════════════
# EMBEDDING GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding vector using OpenAI text-embedding-3-small model.
    
    Args:
        text: Text to embed (max ~8000 tokens)
    
    Returns:
        List of 1536 floats representing the embedding vector
    """
    from openai import AsyncOpenAI
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=30.0)
    
    # Truncate very long text to avoid token limits
    truncated_text = text[:8000] if len(text) > 8000 else text
    
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=truncated_text
    )
    
    return response.data[0].embedding


async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts in a single API call (more efficient).
    
    Args:
        texts: List of texts to embed
    
    Returns:
        List of embedding vectors
    """
    from openai import AsyncOpenAI
    
    if not texts:
        return []
    
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=60.0)
    
    # Truncate each text
    truncated_texts = [t[:8000] if len(t) > 8000 else t for t in texts]
    
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=truncated_texts
    )
    
    # Sort by index to maintain order
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]


# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENT CHUNKING
# ═══════════════════════════════════════════════════════════════════════════════

def chunk_applications(applications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert each application into a searchable text chunk.
    
    Each chunk contains all relevant info about one application.
    """
    chunks = []
    
    for app in applications:
        company = app.get("name", "Unknown Company")
        job_title = app.get("job_title", "Unknown Position")
        status = app.get("current_status", "Unknown")
        applied_date = app.get("applied_date", "Unknown date")
        hr_name = app.get("hr_name", "")
        hr_email = app.get("hr_email", "")
        hr_phone = app.get("hr_phone", "")
        location = app.get("location", "")
        industry = app.get("industry", "")
        ats_score = app.get("ats_score", "")
        
        # Build comprehensive text representation
        hr_info = ""
        if hr_name or hr_email or hr_phone:
            hr_parts = []
            if hr_name:
                hr_parts.append(f"HR Contact: {hr_name}")
            if hr_email:
                hr_parts.append(f"Email: {hr_email}")
            if hr_phone:
                hr_parts.append(f"Phone: {hr_phone}")
            hr_info = ". " + ", ".join(hr_parts)
        
        extra_info = []
        if location:
            extra_info.append(f"Location: {location}")
        if industry:
            extra_info.append(f"Industry: {industry}")
        if ats_score:
            extra_info.append(f"ATS Score: {ats_score}")
        extra_str = ". " + ", ".join(extra_info) if extra_info else ""
        
        chunk_text = (
            f"APPLICATION: {company} - {job_title}. "
            f"Status: {status}. Applied on: {applied_date}{hr_info}{extra_str}"
        )
        
        chunks.append({
            "text": chunk_text,
            "type": "application",
            "company": company,
            "status": status,
            "metadata": {
                "job_title": job_title,
                "applied_date": applied_date,
                "hr_name": hr_name,
                "hr_email": hr_email,
                "hr_phone": hr_phone
            }
        })
    
    return chunks


def chunk_resume(resume_text: str, chunk_size: int = 500) -> List[Dict[str, Any]]:
    """
    Split resume text into semantic chunks.
    
    Uses section headers (EXPERIENCE, SKILLS, etc.) as natural boundaries.
    Falls back to fixed-size chunks if no headers found.
    """
    if not resume_text:
        return []
    
    chunks = []
    
    # Try to split by common resume section headers
    section_patterns = [
        "EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE",
        "EDUCATION", "SKILLS", "TECHNICAL SKILLS", "PROJECTS",
        "CERTIFICATIONS", "ACHIEVEMENTS", "SUMMARY", "OBJECTIVE"
    ]
    
    # Simple approach: split by double newlines and group
    paragraphs = resume_text.split("\n\n")
    
    current_chunk = ""
    current_section = "GENERAL"
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # Check if this is a section header
        upper_para = para.upper()
        for pattern in section_patterns:
            if pattern in upper_para and len(para) < 50:
                # Save previous chunk if exists
                if current_chunk.strip():
                    chunks.append({
                        "text": f"RESUME - {current_section}: {current_chunk.strip()}",
                        "type": "resume",
                        "section": current_section,
                        "metadata": {}
                    })
                current_section = pattern
                current_chunk = ""
                break
        
        # Add to current chunk
        if len(current_chunk) + len(para) < chunk_size:
            current_chunk += " " + para
        else:
            # Save current and start new
            if current_chunk.strip():
                chunks.append({
                    "text": f"RESUME - {current_section}: {current_chunk.strip()}",
                    "type": "resume",
                    "section": current_section,
                    "metadata": {}
                })
            current_chunk = para
    
    # Don't forget last chunk
    if current_chunk.strip():
        chunks.append({
            "text": f"RESUME - {current_section}: {current_chunk.strip()}",
            "type": "resume",
            "section": current_section,
            "metadata": {}
        })
    
    return chunks


def chunk_static_knowledge(application_knowledge: str, policy_knowledge: str) -> List[Dict[str, Any]]:
    """
    Chunk static knowledge bases (product info, founder info, policies).
    """
    chunks = []
    
    # Split application knowledge by section headers (##)
    if application_knowledge:
        sections = application_knowledge.split("##")
        for section in sections:
            section = section.strip()
            if section and len(section) > 50:  # Skip tiny fragments
                # Get section title from first line
                lines = section.split("\n", 1)
                title = lines[0].strip() if lines else "Product Info"
                content = lines[1].strip() if len(lines) > 1 else section
                
                chunks.append({
                    "text": f"PRODUCT INFO - {title}: {content[:800]}",
                    "type": "product",
                    "section": title,
                    "metadata": {}
                })
    
    # Split policy knowledge similarly
    if policy_knowledge:
        sections = policy_knowledge.split("##")
        for section in sections:
            section = section.strip()
            if section and len(section) > 50:
                lines = section.split("\n", 1)
                title = lines[0].strip() if lines else "Policy"
                content = lines[1].strip() if len(lines) > 1 else section
                
                chunks.append({
                    "text": f"POLICY - {title}: {content[:800]}",
                    "type": "policy",
                    "section": title,
                    "metadata": {}
                })
    
    return chunks


# ═══════════════════════════════════════════════════════════════════════════════
# FAISS INDEX MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

class RAGIndex:
    """
    Manages FAISS index and chunks for a single user.
    """
    def __init__(self):
        self.index: Optional[Any] = None  # faiss.IndexFlatL2
        self.chunks: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
    
    async def build(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Build FAISS index from chunks.
        """
        if not chunks or not FAISS_AVAILABLE:
            return
        
        self.chunks = chunks
        
        # Generate embeddings for all chunks
        texts = [chunk["text"] for chunk in chunks]
        embeddings_list = await generate_embeddings_batch(texts)
        
        # Convert to numpy array
        self.embeddings = np.array(embeddings_list, dtype=np.float32)
        
        # Build FAISS index (L2 distance = Euclidean)
        dimension = len(embeddings_list[0])  # 1536 for text-embedding-3-small
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(self.embeddings)
        
        print(f"RAG: Built FAISS index with {len(chunks)} chunks, dimension={dimension}")
    
    async def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Search for most relevant chunks.
        
        Args:
            query: User's question
            top_k: Number of chunks to retrieve
        
        Returns:
            List of chunks with similarity scores
        """
        if not self.index or not self.chunks:
            return []
        
        # Embed the query
        query_embedding = await generate_embedding(query)
        query_vector = np.array([query_embedding], dtype=np.float32)
        
        # Search FAISS index
        k = min(top_k, len(self.chunks))
        distances, indices = self.index.search(query_vector, k)
        
        # Build results with scores
        results = []
        for i, idx in enumerate(indices[0]):
            if idx < len(self.chunks):
                chunk = self.chunks[idx].copy()
                chunk["score"] = float(distances[0][i])  # Lower = more similar
                results.append(chunk)
        
        print(f"RAG: Retrieved {len(results)} chunks for query: '{query[:50]}...'")
        for r in results[:3]:
            print(f"  - [{r['type']}] Score: {r['score']:.4f} | {r['text'][:60]}...")
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# PER-USER INDEX CACHE
# ═══════════════════════════════════════════════════════════════════════════════

# Global cache: user_id -> RAGIndex
_user_index_cache: Dict[str, RAGIndex] = {}


async def get_or_build_user_index(
    user_id: str,
    applications: List[Dict[str, Any]],
    resume_text: str,
    application_knowledge: str,
    policy_knowledge: str,
    force_rebuild: bool = False
) -> RAGIndex:
    """
    Get cached RAG index for user, or build a new one.
    
    This is the main entry point for RAG operations.
    """
    global _user_index_cache
    
    # Check cache
    if not force_rebuild and user_id in _user_index_cache:
        print(f"RAG: Using cached index for user {user_id[:8]}...")
        return _user_index_cache[user_id]
    
    print(f"RAG: Building new index for user {user_id[:8]}...")
    
    # Chunk all data sources
    all_chunks = []
    all_chunks.extend(chunk_applications(applications))
    all_chunks.extend(chunk_resume(resume_text))
    all_chunks.extend(chunk_static_knowledge(application_knowledge, policy_knowledge))
    
    print(f"RAG: Created {len(all_chunks)} chunks total")
    
    # Build index
    rag_index = RAGIndex()
    
    if FAISS_AVAILABLE and all_chunks:
        await rag_index.build(all_chunks)
    else:
        # Fallback: store chunks without FAISS
        rag_index.chunks = all_chunks
    
    # Cache it
    _user_index_cache[user_id] = rag_index
    
    return rag_index


async def search_user_context(
    user_id: str,
    query: str,
    applications: List[Dict[str, Any]],
    resume_text: str,
    application_knowledge: str,
    policy_knowledge: str,
    top_k: int = 5
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Main RAG search function - retrieves relevant context for a user query.
    
    Returns:
        Tuple of (retrieved_chunks, formatted_context_string)
    """
    # Get or build index
    rag_index = await get_or_build_user_index(
        user_id=user_id,
        applications=applications,
        resume_text=resume_text,
        application_knowledge=application_knowledge,
        policy_knowledge=policy_knowledge
    )
    
    # If FAISS available, do semantic search
    if FAISS_AVAILABLE and rag_index.index:
        chunks = await rag_index.search(query, top_k=top_k)
    else:
        # Fallback: return all chunks (old behavior)
        chunks = rag_index.chunks[:top_k] if rag_index.chunks else []
    
    # Format context string
    if chunks:
        context_parts = []
        for chunk in chunks:
            context_parts.append(chunk["text"])
        
        formatted_context = (
            "## RETRIEVED CONTEXT (RAG)\n"
            "The following information was retrieved as most relevant to the user's query:\n\n"
            + "\n\n".join(context_parts)
        )
    else:
        formatted_context = ""
    
    return chunks, formatted_context


def invalidate_user_cache(user_id: str) -> None:
    """
    Invalidate cached index when user data changes.
    Call this when applications are added/updated/deleted.
    """
    global _user_index_cache
    if user_id in _user_index_cache:
        del _user_index_cache[user_id]
        print(f"RAG: Invalidated cache for user {user_id[:8]}...")
