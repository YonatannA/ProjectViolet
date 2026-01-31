import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import google.generativeai as genai
import json
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

genai.configure(api_key=os.environ[""])
model = genai.GenerativeModel("gemini-1.5-pro")

# Initialize output file
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump([], f)

print("🎙️ Live transcription started (Ctrl+C to stop)")

def transcribe_chunk(audio_chunk):
    """Send audio chunk to Gemini and return transcription"""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        wav.write(tmp.name, SAMPLE_RATE, audio_chunk)

        with open(tmp.name, "rb") as f:
            audio_bytes = f.read()

    response = model.generate_content(
        [
            "Transcribe this audio clearly and concisely.",
            {
                "mime_type": "audio/wav",
                "data": audio_bytes,
            },
        ]
    )

    return response.text.strip()

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
