from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
import io
import os
from transformers import pipeline
from PIL import Image

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenCV Face Detector (Haar Cascade)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Initialize Transformers NSFW Classifier
# This will download the model on first run
classifier = pipeline("image-classification", model="Falconsai/nsfw_image_detection")

@app.get("/")
def read_root():
    return {"status": "AI Service Running (OpenCV + Transformers)"}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # Read image file
        contents = await file.read()
        
        # 1. Process for OpenCV (Face Detection)
        nparr = np.frombuffer(contents, np.uint8)
        cv_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if cv_image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Face Detection
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        face_detected = len(faces) > 0

        # 2. Process for Transformers (NSFW Detection)
        # Convert bytes to PIL Image
        pil_image = Image.open(io.BytesIO(contents))
        
        # Classify
        results = classifier(pil_image)
        # Result format: [{'label': 'nsfw', 'score': 0.99}, {'label': 'normal', 'score': 0.01}]
        
        nsfw_score = 0.0
        for result in results:
            if result['label'] == 'nsfw':
                nsfw_score = result['score']
                break
            
        is_safe = nsfw_score < 0.6 # Threshold
        reason = "NSFW Content Detected" if not is_safe else None

        return {
            "faceDetected": face_detected,
            "faceCount": len(faces),
            "isSafe": is_safe,
            "unsafeScore": float(nsfw_score),
            "reason": reason
        }

    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)

