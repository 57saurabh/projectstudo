from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import cv2
import io
import os
from nudenet import NudeClassifier

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

# Initialize NudeNet Classifier
# This will download the model on first run if not present
classifier = NudeClassifier()

@app.get("/")
def read_root():
    return {"status": "AI Service Running (OpenCV + NudeNet)"}

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        # Read image file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # 1. Face Detection (OpenCV)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        face_detected = len(faces) > 0

        # 2. NSFW Detection (NudeNet)
        # NudeNet expects a file path or numpy array (if supported by version, else save temp)
        # NudeClassifier.classify supports path. Let's save to temp file to be safe.
        temp_filename = f"temp_{file.filename}"
        cv2.imwrite(temp_filename, image)
        
        nsfw_result = classifier.classify(temp_filename)
        # Result format: {'temp_filename': {'safe': 0.99, 'unsafe': 0.01}}
        # Or newer version: {'temp_filename': {'safe': prob, 'unsafe': prob}}
        
        preds = nsfw_result.get(temp_filename, {})
        unsafe_prob = preds.get('unsafe', 0)
        
        # Cleanup temp file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

        is_safe = unsafe_prob < 0.6 # Threshold
        reason = "NSFW Content Detected" if not is_safe else None

        return {
            "faceDetected": face_detected,
            "faceCount": len(faces),
            "isSafe": is_safe,
            "unsafeScore": unsafe_prob,
            "reason": reason
        }

    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)

