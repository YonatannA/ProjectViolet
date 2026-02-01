import os
import json
from google import genai 
from google.genai import types  # 🛠️ New import for strict types
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
current_dir = Path(__file__).parent
env_file_path = current_dir / ".env"
load_dotenv(dotenv_path=env_file_path, override=True)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the new Gemini 2.0 Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
client = genai.Client(api_key=GEMINI_API_KEY)

@app.post("/analyze")
async def analyze(transcript: str = Form(...), image: UploadFile = File(...)):
    image_bytes = await image.read()
    
    # 🧠 Gemini now focuses ONLY on pixels. It doesn't know about the 3D scan.
    prompt_text = """
    ROLE: Senior Forensic Media Analyst & Behavorial Scientist
    TASK: Detect synthetic generation via pixel forensics and biological behavioral tells.

    CHECKLIST:
    1. EYE SYMMETRY: Check for mismatched pupils or inconsistent catch-lights.
    2. PERIMETER BLENDING: Look for "halos" or blurring at hair/ear boundaries.
    3. SKIN TOPOGRAPHY: Look for over-smoothing, lack of pores, or "waxy" textures.
    4. TEMPORAL JITTER: Check for "waxy" jawlines disconnected from the neck.
    5. Ocular Rhythms: Check for fixed "dead-eye" stares or abnormal/missing blinking.
    6. Emotional Sync: Flag mismatches between expressions and overly exaggerated smiles.
    7. Adaptors: Look for a lack of unconscious micro-movements (fidgets, scratching, etc.).

    RETURN ONLY VALID JSON:
    {
      "forensic_analysis": {
        "true_trust_score": (int 0-100 where 100 is definitely human),
        "details": "• Eye Symmetry: [Finding]\\n• Perimeter: [Finding]\\n• Skin: [Finding]\\n• Jitter: [Finding]"
      },
      "behavioral_analysis": {
        "behavioral_trust_score": (int 0-100 where 100 is definitely human),
        "details": "• Ocular: [Finding]\\n• Emotional: [Finding]\\n• Adaptors: [Finding]"
      },
      "is_fake_pixels": (boolean)
    }
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_text(text=prompt_text),
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
            ]
        )
        
        text_content = response.text.strip().replace("```json", "").replace("```", "")
        gemini_result = json.loads(text_content)
            
        return {
            "gemini_report": gemini_result,
            "mediaPipe_raw": "FAIL" if "FACE_ADHESION_FAILURE" in transcript else "PASS"
        }
    except Exception as e:
        return {"error": str(e)}
    
    