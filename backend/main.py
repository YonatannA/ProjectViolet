import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI()

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

@app.get("/")
async def root():
    return {"message": "Sentinel Brain is ONLINE"}

@app.post("/analyze")
async def analyze(transcript: str = Form(...), image: UploadFile = File(...)):
    # 1. Convert the uploaded image into bytes for Gemini
    image_bytes = await image.read()
    
    # 2. The Multi-Modal Prompt
    # Ask for a JSON response so the Frontend can easily update the meters
    prompt = f"""
    You are a forensic deepfake analyst. Analyze this video frame and the context.
    TRANSCRIPT CONTEXT: "{transcript}"
    
    Evaluate three specific pillars:
    1. VISUAL: Look for jawline flickering, lighting mismatches, or screen-door effects.
    2. LOGIC: Is the transcript using high-pressure scam tactics?
    3. CONSISTENCY: Does the face look like a natural human interaction?

    RETURN ONLY A VALID JSON OBJECT:
    {{
      "trust_score": (int 0-100),
      "visual_score": (int 0-100),
      "logic_score": (int 0-100),
      "is_fake": (boolean),
      "reason": "Short one-sentence explanation"
    }}
    """
    
    try:
        # 3. Call Gemini 1.5 Flash (Multi-modal)
        response = model.generate_content([
            prompt, 
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])
        
        # 4. Parse the AI's JSON response
        # Gemini sometimes wraps JSON in ```json blocks
        clean_json = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(clean_json)
        
        return result

    except Exception as e:
        print(f"Error: {e}")
        return {"trust_score": 0, "is_fake": True, "reason": "Analysis Engine Error"}