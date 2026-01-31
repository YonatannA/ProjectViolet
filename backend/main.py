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
    
    prompt_text = f"""
    You are a forensic deepfake analyst. Analyze this video frame.
    TRANSCRIPT: "{transcript}"
    
    RETURN ONLY VALID JSON:
    {{
      "trust_score": (int 0-100),
      "visual_score": (int 0-100),
      "logic_score": (int 0-100),
      "is_fake": (boolean),
      "reason": "explanation"
    }}
    """
    
    try:
        # 🛠️ THE FIX: Use types.Part to create a structured list that Pydantic accepts
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=[
                # Text Part
                types.Part.from_text(text=prompt_text),
                # Image Part
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')
            ]
        )
        
        # Robustly parse the text response
        text_content = response.text.strip()
        if text_content.startswith("```json"):
            text_content = text_content[7:-3].strip()
        elif text_content.startswith("```"):
            text_content = text_content[3:-3].strip()
            
        return json.loads(text_content)

    except Exception as e:
        print(f"Server Error: {str(e)}")
        # If it still fails, this will help you see the exact error in the logs
        return {"trust_score": 0, "is_fake": True, "reason": f"Analysis Error: {str(e)}"}