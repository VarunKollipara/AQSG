import os
from langchain_community.document_loaders import (
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
    CSVLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# In-memory vector store shared across the session.
vector_store: Chroma | None = None

# Local embeddings avoid per-query Google API calls (and quota/500 errors on embed_query).
_embeddings: HuggingFaceEmbeddings | None = None


def _get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
        )
    return _embeddings


def get_vector_store() -> Chroma | None:
    return vector_store


def get_document_loader(file_path: str):
    """Select the correct LangChain loader based on file extension."""
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    loaders = {
        ".docx": Docx2txtLoader,
        ".pdf": PyPDFLoader,
        ".csv": CSVLoader,
        ".txt": TextLoader,
        ".md": TextLoader,
    }
    if ext not in loaders:
        raise ValueError(f"Unsupported file extension: {ext}")
    return loaders[ext](file_path)


def process_and_store_document(file_path: str) -> dict:
    """
    Loads the document, splits it into chunks, embeds locally with
    sentence-transformers, and stores in ChromaDB.
    """
    global vector_store

    try:
        loader = get_document_loader(file_path)
        documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=150,
        )
        chunks = text_splitter.split_documents(documents)
        embeddings = _get_embeddings()

        if vector_store is None:
            vector_store = Chroma.from_documents(
                documents=chunks,
                embedding=embeddings,
                collection_name="aqsg_documents",
            )
        else:
            vector_store.add_documents(chunks)

        return {
            "status": "success",
            "chunks_processed": len(chunks),
            "message": f"Successfully processed {os.path.basename(file_path)}",
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
