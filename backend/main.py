import os
import json
from google import genai 
from google.genai import types 
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
    
    prompt_text = """
    ROLE: Senior Forensic Media Analyst & Behavorial Scientist
    TASK: Detect synthetic generation via pixel forensics and biological behavioral tells.
    You must be extremely critical and assume the image is AI until proven otherwise.

    CHECKLIST:
    1. EYE SYMMETRY: Check for mismatched pupils or inconsistent catch-lights. Analyze eye texture. If eyes appear "glassy," "vacant," or overly reflective like plastic, lower the forensic score.
    2. PERIMETER BLENDING: Look for "halos" or blurring at hair/ear. Specifically inspect the top and sides of the hair. If any part of the face or hair is unnaturally blurred or dont show pixel definition,lower the forensic score.
    3. SKIN TOPOGRAPHY: Look for "dots" or artificial grain patterns on the skin (unnatural pores). If the face looks pixelated in some areas but smooth in others, lower the forensic score. Look for over-smoothing, lack of pores, or "waxy" textures. 
    4. TEMPORAL JITTER: Check for "waxy" jawlines disconnected from the neck. Check fir pixels on face if found,lower the forensic score
    5. OCULAR RHYTHMS: Check for fixed "dead-eye" stares or abnormal/missing blinking. If eyes are squinted in a way that obscures pupils or appears static, trigger a behavioral warning and lower the behavioral score.
    6. EMOTIONAL SYNC: Flag mismatches between expressions and overly exaggerated smiles.
    7. ADAPTORS: Look for a lack of unconscious micro-movements (fidgets, scratching, etc.).

    SCORING RULE: If you find EVEN ONE of the above artifacts, the score MUST be below 50%. Do not give high scores to images that look 'mostly' real if they have perimeter blurring.

    RETURN ONLY VALID JSON:
    {
      "forensic_analysis": {
        "true_trust_score": (int),
        "details": "• Eye Symmetry: [Finding]\\n• Perimeter: [Finding]\\n• Skin: [Finding]\\n• Jitter: [Finding]"
      },
      "behavioral_analysis": {
        "behavioral_trust_score": (int),
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
        
        # 🛡️ 3D Physical Scan Logic: Enhanced Parsing
        
        # Define what constitutes a "Hard Failure" for the Physical Scan pillar
        is_blur_fail = "PHYSICAL_FAIL_BLUR" in transcript
        is_depth_fail = "PHYSICAL_LIVENESS_FAIL" in transcript
        is_squint_fail = "BEHAVIORAL_SQUINT" in transcript # Added as a failure trigger
        
        # Aggregate failure status: If any of these hit, the status becomes 🔴 FAIL
        is_failed = is_blur_fail or is_depth_fail or is_squint_fail

        if is_blur_fail:
            physical_msg = "CRITICAL: Perimeter Blur Detected. MediaPipe lost tracking on head boundaries, indicating synthetic blending."
        elif is_squint_fail:
            # Now correctly triggers the RED status in the UI
            physical_msg = "CRITICAL: Ocular Tension Detected. Subject is persistently squinting, potentially hiding glassy eye artifacts."
        elif is_depth_fail:
            physical_msg = "CRITICAL: Physical Adhesion Failure. Zero-depth or flat screen overlay detected."
        else:
            physical_msg = "VERIFIED: 3D human geometry confirmed via volumetric skeletal mapping and sharp boundary adhesion."

        return {
            "gemini_report": gemini_result,
            "mediaPipe_raw": "FAIL" if is_failed else "PASS",
            "physical_explanation": physical_msg
        }
    except Exception as e:
        return {"error": str(e)}
    
    