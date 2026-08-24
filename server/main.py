import os
import re
import tempfile
from functools import lru_cache
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="VoiceCart API",
    description="Multilingual speech-to-text and grocery command processing for VoiceCart.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_CPU_THREADS = int(os.getenv("WHISPER_CPU_THREADS", str(max(1, (os.cpu_count() or 4) - 1))))
WHISPER_BEAM_SIZE = int(os.getenv("WHISPER_BEAM_SIZE", "1"))
WHISPER_BEST_OF = int(os.getenv("WHISPER_BEST_OF", "1"))
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(25 * 1024 * 1024)))


class CommandRequest(BaseModel):
    text: str


class NLPResult(BaseModel):
    intent: str
    product: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    priceMin: Optional[float] = None
    priceMax: Optional[float] = None
    budgetAmount: Optional[float] = None
    brand: Optional[str] = None
    rawText: str


@lru_cache(maxsize=1)
def get_transcriber():
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper is not installed. Run: pip install -r server/requirements.txt"
        ) from exc

    return WhisperModel(
        WHISPER_MODEL,
        device="cpu",
        compute_type=WHISPER_COMPUTE_TYPE,
        cpu_threads=WHISPER_CPU_THREADS,
        num_workers=1,
    )


HINDI_DICT = {
    "doodh": "milk",
    "dudh": "milk",
    "seb": "apple",
    "aam": "mango",
    "pani": "water",
    "chawal": "rice",
    "atta": "flour",
    "tel": "oil",
    "pyaz": "onion",
    "pyaaz": "onion",
    "tamatar": "tomato",
    "palak": "spinach",
    "kela": "banana",
    "anda": "egg",
    "ande": "egg",
    "makhan": "butter",
    "dahi": "yogurt",
    "namkeen": "chips",
    "kele": "banana",
    "seeb": "apple",
    "aata": "flour",
}


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "VoiceCart multilingual backend is running",
        "model": WHISPER_MODEL,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "model": WHISPER_MODEL}


@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language_mode: str = Form("auto"),
):
    if language_mode not in {"auto", "english", "hindi"}:
        raise HTTPException(status_code=400, detail="language_mode must be auto, english, or hindi")

    content = await audio.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded audio is empty.")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="The audio recording is too large.")

    suffix = os.path.splitext(audio.filename or "voice.webm")[1] or ".webm"
    temp_path = ""

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        model = get_transcriber()
        language = {"english": "en", "hindi": "hi", "auto": None}[language_mode]
        segments, info = model.transcribe(
            temp_path,
            language=language,
            # Fast decoding is important for long grocery orders. Beam search 1 is
            # substantially faster than the previous 8-beam / best-of-5 setup.
            beam_size=WHISPER_BEAM_SIZE,
            best_of=WHISPER_BEST_OF,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 450, "speech_pad_ms": 120},
            condition_on_previous_text=False,
            initial_prompt=(
                "This is an Indian grocery shopping command. The speaker may mix Hindi, Hinglish and English. "
                "Common words include do kilo seb, ek kilo kela, doodh, chawal, atta, pyaz, tamatar, cart mein add kar do. "
                "Transcribe the complete order faithfully and do not translate or omit quantities."
            ),
            task="transcribe",
            word_timestamps=False,
            temperature=0.0,
        )

        text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
        return {
            "text": text,
            "language": getattr(info, "language", language or "unknown"),
            "language_probability": getattr(info, "language_probability", None),
            "mode": language_mode,
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not transcribe the audio: {exc}") from exc
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/api/parse", response_model=NLPResult)
def parse_command(request: CommandRequest):
    text = request.text.lower().strip()

    for hindi_word, english_word in HINDI_DICT.items():
        text = re.sub(rf"\b{re.escape(hindi_word)}\b", english_word, text)

    result = NLPResult(intent="UNKNOWN", rawText=request.text)

    quantity_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(bottle|packet|piece|kg|kilo|litre|liter|bag|carton|dozen|cup|tube|box|bar|bunch)s?\b",
        text,
    )
    if quantity_match:
        result.quantity = float(quantity_match.group(1))
        result.unit = quantity_match.group(2)
    else:
        number_match = re.search(r"\b(\d+(?:\.\d+)?)\b", text)
        if number_match:
            result.quantity = float(number_match.group(1))

    budget_match = re.search(r"\b(?:set\s+)?(?:my\s+)?budget\s*(?:to|is)?\s*(?:₹|rs|rupees)?\s*(\d+)", text)
    if budget_match:
        result.budgetAmount = float(budget_match.group(1))
        result.intent = "SET_BUDGET"
        return result

    under_match = re.search(r"(?:under|below|less than|within)\s*₹?\s*(\d+)", text)
    if under_match:
        result.priceMax = float(under_match.group(1))
        result.intent = "FILTER_PRODUCTS"

    if "budget" in text and "set" in text:
        result.intent = "SET_BUDGET"
    elif any(token in text for token in ["alternative", "substitute", "instead of", "replacement", "replace"]):
        result.intent = "GET_SUBSTITUTES"
    elif any(token in text for token in ["clear", "empty"]) and any(token in text for token in ["list", "cart", "everything"]):
        result.intent = "CLEAR_LIST"
    elif any(token in text for token in ["remove", "delete", "take off", "take out", "don't need"]):
        result.intent = "REMOVE_ITEM"
    elif any(token in text for token in ["change", "update", "make", "set"]) and any(token in text for token in ["to", "quantity"]):
        result.intent = "UPDATE_QUANTITY"
    elif result.priceMax is not None:
        result.intent = "FILTER_PRODUCTS"
    elif any(token in text for token in ["find", "search", "show", "look", "browse"]) and "list" not in text:
        result.intent = "SEARCH_PRODUCT"
    elif any(token in text for token in ["show", "open", "view", "what"]) and any(token in text for token in ["list", "cart"]):
        result.intent = "SHOW_LIST"
    elif any(token in text for token in ["add", "put", "buy", "need", "want", "remember", "get"]):
        result.intent = "ADD_ITEM"

    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
