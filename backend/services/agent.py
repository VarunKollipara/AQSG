"""
LangChain agent for AQSG.

Two-layer design (per PRD §3.2):
  1. RAG chain  – retrieves relevant document chunks and generates explicit
                  test scenarios from them (deterministic / document-grounded).
  2. Domain chain – appended once after a document upload; scans the same
                    chunks for industry context and produces proactive
                    edge-case / compliance recommendations.

Both chains share a single ConversationBufferMemory so the follow-up chat
interface can reference earlier turns.
"""

import os
import time

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError
from langchain_google_genai._common import GoogleGenerativeAIError
from langchain_classic.memory import ConversationBufferMemory
from langchain_classic.chains import ConversationalRetrievalChain
from langchain_core.prompts import (
    PromptTemplate,
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)

# gemini-2.0-flash often has limit:0 on free tier; override via .env if needed.
CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
TRANSCRIBE_MODEL = os.getenv("GEMINI_TRANSCRIBE_MODEL", "gemini-2.5-flash")
MAX_RETRIES = 3
RETRY_BASE_DELAY_SEC = 5

# ---------------------------------------------------------------------------
# Shared memory – persists for the lifetime of the process (one user session)
# ---------------------------------------------------------------------------
memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="answer",
)


# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------
QA_SYSTEM_PROMPT = """You are an expert QA engineer and test architect inside the \
Agentic QA Scenario Generator (AQSG).

YOUR OUTPUT MUST ALWAYS BE VALID JSON — nothing else before or after the JSON object.

Respond with this exact structure:
{{
  "summary": "One concise sentence describing what was generated or changed.",
  "test_cases": [
    {{
      "id": "TC-001",
      "title": "Descriptive test case title",
      "state": "Design",
      "complexity": "Simple",
      "testCaseType": "End2End",
      "lineOfBusiness": "OTHER",
      "isDomainSuggestion": false,
      "steps": [
        {{"step": 1, "action": "What the tester does", "expected": "What should happen"}}
      ]
    }}
  ]
}}

Rules:
- complexity: "Simple", "Medium", or "Complex"
- testCaseType: "End2End", "Integration", "Unit", "Regression", or "Smoke"
- state: always "Design"
- 3–6 steps per test case; each step has a clear action and expected result
- For initial generation: derive explicit test cases from the document, then append \
2–4 additional cases with isDomainSuggestion=true inferred from the industry context \
(FinTech, Healthcare, E-commerce, etc.)
- For chat refinements: return ONLY the new or changed test cases (the client merges them)
- If no document has been uploaded, return: \
{{"summary": "Please upload a document first.", "test_cases": []}}

Document context:
{context}
"""

CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(
    """Given the following conversation history and a follow-up question, \
rephrase the follow-up question as a standalone question that can be \
answered without the history.

Chat History:
{chat_history}

Follow Up Input: {question}
Standalone question:"""
)


def _is_rate_limit_error(exc: BaseException) -> bool:
    msg = str(exc).upper()
    return "RESOURCE_EXHAUSTED" in msg or "429" in msg


def _friendly_rate_limit_message() -> str:
    return (
        "Gemini API rate limit reached for this model. "
        f"Wait ~{RETRY_BASE_DELAY_SEC}s and try again in the chat panel, "
        "or set `GEMINI_CHAT_MODEL=gemini-2.0-flash-lite` in `.env`."
    )


def _invoke_chain_with_retry(chain, inputs: dict) -> str:
    last_error: BaseException | None = None
    for attempt in range(MAX_RETRIES):
        try:
            result = chain.invoke(inputs)
            return result["answer"]
        except ChatGoogleGenerativeAIError as e:
            last_error = e
            if _is_rate_limit_error(e) and attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BASE_DELAY_SEC * (attempt + 1))
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("Chain invocation failed without an error")


def _build_qa_chain(retriever):
    """Build a ConversationalRetrievalChain using the supplied retriever."""
    llm = ChatGoogleGenerativeAI(
        model=CHAT_MODEL,
        google_api_key=os.environ["GOOGLE_API_KEY"],
        temperature=0.3,
        convert_system_message_to_human=True,
    )

    messages = [
        SystemMessagePromptTemplate.from_template(QA_SYSTEM_PROMPT),
        HumanMessagePromptTemplate.from_template("{question}"),
    ]
    qa_prompt = ChatPromptTemplate.from_messages(messages)

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        condense_question_prompt=CONDENSE_QUESTION_PROMPT,
        combine_docs_chain_kwargs={"prompt": qa_prompt},
        return_source_documents=False,
        output_key="answer",
        verbose=False,
    )
    return chain


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def run_chat(message: str, vector_store) -> str:
    """
    Run a user message through the RAG chain.
    Returns the assistant's markdown response string.
    """
    if vector_store is None:
        return (
            "No document has been uploaded yet. "
            "Please upload a requirements document first, then I can generate test cases for you."
        )

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 4},
    )
    chain = _build_qa_chain(retriever)
    try:
        return _invoke_chain_with_retry(chain, {"question": message})
    except (ChatGoogleGenerativeAIError, GoogleGenerativeAIError) as e:
        if _is_rate_limit_error(e):
            return _friendly_rate_limit_message()
        if "INTERNAL" in str(e) or "500" in str(e):
            return (
                "Google API returned a temporary error while searching your document. "
                "Please try again in a few seconds."
            )
        raise
    except Exception as e:
        if "INTERNAL" in str(e) or "500" in str(e):
            return (
                "A temporary API error occurred. Please try again in a few seconds."
            )
        raise


def generate_initial_suite(vector_store) -> str:
    """
    Called once right after a document is uploaded.
    Generates the first full test suite from the document.
    """
    return run_chat(
        "Analyse the uploaded document and generate a complete test suite. "
        "Include all explicit test scenarios from the document requirements, "
        "followed by your proactive domain-specific suggestions.",
        vector_store,
    )


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """
    Transcribes audio using Gemini's native audio understanding
    via the google-genai v2 SDK. Returns the transcribed text string.
    """
    from google import genai
    from google.genai import types as genai_types

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

    audio_part = genai_types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
    text_part = genai_types.Part.from_text(
        text=(
            "Please transcribe this audio recording exactly. "
            "Return only the transcribed text with no additional commentary."
        ),
    )

    last_error: BaseException | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=TRANSCRIBE_MODEL,
                contents=[genai_types.Content(parts=[audio_part, text_part])],
            )
            return response.text.strip()
        except Exception as e:
            last_error = e
            if _is_rate_limit_error(e) and attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BASE_DELAY_SEC * (attempt + 1))
                continue
            raise
    if last_error:
        raise last_error
    raise RuntimeError("Transcription failed without an error")
