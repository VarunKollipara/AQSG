import os
import json
import re
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from services.document_processor import process_and_store_document, get_vector_store
from services.agent import run_chat, generate_initial_suite, transcribe_audio

app = FastAPI(title="AQSG Backend", description="Agentic QA Scenario Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("temp_uploads", exist_ok=True)


def _parse_agent_json(raw: str) -> tuple[str, list]:
    """
    Try to extract structured JSON from the agent's response.
    Returns (summary_str, test_cases_list).
    Falls back gracefully if the model didn't return valid JSON.
    """
    if not raw:
        return ("", [])

    # Strip markdown code fences if present
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)

    # Find the outermost {...} block
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1:
        cleaned = cleaned[start : end + 1]

    try:
        data = json.loads(cleaned)
        return (data.get("summary", raw), data.get("test_cases", []))
    except Exception:
        return (raw, [])


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Req 3.1.1 / 3.1.2 – Accept, embed, store, then generate initial test suite.
    """
    allowed_extensions = {".pdf", ".docx", ".md", ".csv", ".txt"}
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(allowed_extensions)}",
        )

    file_location = f"temp_uploads/{file.filename}"
    with open(file_location, "wb+") as f:
        f.write(await file.read())

    result = process_and_store_document(file_location)

    if os.path.exists(file_location):
        os.remove(file_location)

    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    test_cases: list = []
    suite_summary = ""
    suite_error = None

    try:
        vs = get_vector_store()
        raw = generate_initial_suite(vs)
        suite_summary, test_cases = _parse_agent_json(raw)
    except Exception as e:
        err = str(e)
        if "RESOURCE_EXHAUSTED" in err or "429" in err:
            suite_error = (
                "Document indexed. Gemini rate limit hit — ask in the chat panel: "
                "'Generate a complete test suite from the uploaded document.'"
            )
        else:
            suite_error = err

    return {
        "status": "success",
        "filename": file.filename,
        "chunks": result["chunks_processed"],
        "message": suite_summary or "Document processed. Use chat to generate test cases.",
        "test_cases": test_cases,
        "suite_error": suite_error,
    }


@app.post("/chat")
async def text_chat(message: str = Form(...)):
    """
    Req 3.3.1 – Persistent chat with ConversationBufferMemory.
    """
    vs = get_vector_store()
    try:
        raw = run_chat(message, vs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    summary, test_cases = _parse_agent_json(raw)
    return {
        "response": summary or raw,
        "test_cases": test_cases,
    }


@app.post("/voice")
async def voice_input(audio: UploadFile = File(...)):
    """
    Req 3.3.2 – Transcribe via Gemini, feed to RAG chain.
    """
    audio_bytes = await audio.read()
    mime_type = audio.content_type or "audio/webm"

    try:
        transcription = transcribe_audio(audio_bytes, mime_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

    vs = get_vector_store()
    try:
        raw = run_chat(transcription, vs)
    except Exception as e:
        raw = f"Transcription succeeded but agent failed: {e}"

    summary, test_cases = _parse_agent_json(raw)
    return {
        "transcription": transcription,
        "agent_response": summary or raw,
        "test_cases": test_cases,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
