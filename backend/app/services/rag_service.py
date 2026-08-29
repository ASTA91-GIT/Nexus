import os
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Initialize ChromaDB client (local storage)
CHROMA_PATH = os.path.join(os.path.dirname(__file__), "../../../data/chroma")
os.makedirs(CHROMA_PATH, exist_ok=True)
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Use a specific collection for case evidence
collection = chroma_client.get_or_create_collection(name="case_evidence")

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len
)

def index_document(case_id: str, evidence_id: str, text: str):
    """
    Chunks text and stores it in ChromaDB with metadata linking to the case and evidence.
    """
    if not text or len(text.strip()) == 0:
        return
        
    chunks = text_splitter.split_text(text)
    
    ids = [f"{evidence_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"case_id": case_id, "evidence_id": evidence_id} for _ in chunks]
    
    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )

def query_case_context(case_id: str, query: str, n_results: int = 5) -> str:
    """
    Searches ChromaDB for relevant chunks matching the query within a specific case.
    """
    if case_id == "all":
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )
    else:
        results = collection.query(
            query_texts=[query],
            n_results=n_results,
            where={"case_id": case_id}
        )
    
    if not results or not results['documents'] or len(results['documents'][0]) == 0:
        return ""
        
    context = "\n\n".join(results['documents'][0])
    return context
