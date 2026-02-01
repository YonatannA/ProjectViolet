from dotenv import load_dotenv
from google.genai import types
import os

load_dotenv()  # loads .env into environment variables

api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise RuntimeError("GOOGLE_API_KEY not found in environment")

import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import google.genai as genai
import json
import io
import os
import time
from datetime import datetime
import tempfile

# -----------------------------
# Configuration
# -----------------------------
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_DURATION = 2  # seconds (lower = more "real-time")
OUTPUT_JSON = "live_transcription.json"

client = genai.Client(api_key=api_key)

MODEL_NAME = "gemini-2.5-flash-lite"

# Initialize output file
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump([], f)

print("🎙️ Live transcription started (Ctrl+C to stop)")

def transcribe_chunk(audio_chunk):
    buffer = io.BytesIO()
    wav.write(buffer, SAMPLE_RATE, audio_chunk)
    audio_bytes = buffer.getvalue()

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": "Transcribe this audio clearly and concisely."},
                    {
                        "inline_data": {
                            "mime_type": "audio/wav",
                            "data": audio_bytes,
                        }
                    },
                ],
            }
        ],
    )

    return response.text.strip() if response.text else ""

    return response.text.strip() if response.text else ""

try:
    while True:
        # Record chunk
        audio = sd.rec(
            int(CHUNK_DURATION * SAMPLE_RATE),
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="int16"
        )
        sd.wait()

        audio_np = np.squeeze(audio)

        # Transcribe immediately
        text = transcribe_chunk(audio_np)

        if text:
            entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "text": text
            }

            # Append to JSON file
            with open(OUTPUT_JSON, "r+", encoding="utf-8") as f:
                data = json.load(f)
                data.append(entry)
                f.seek(0)
                json.dump(data, f, indent=2, ensure_ascii=False)

            print(f"> {text}")

except KeyboardInterrupt:
    print("\n🛑 Transcription stopped")
