# Deployment Guide

## Overview
Your application has been structured to support easy deployment to Vercel for the Frontend and API. However, due to the real-time nature of the video chat (Socket.io/WebRTC) and the specialized requirements of the Face Detection service (Python/OpenCV), these components must be hosted on platforms that support persistent connections and custom runtimes (like Render, Railway, or DigitalOcean).

## 1. Deploying Frontend & API (Vercel)
The Next.js application (including the new API Routes for Auth and User management) is ready for Vercel.

1.  **Push your code** to GitHub/GitLab/Bitbucket.
2.  **Import the project** in Vercel.
3.  **Configure Environment Variables** in Vercel Project Settings:
    *   `MONGO_URI`: Your MongoDB Connection String (e.g., MongoDB Atlas).
    *   `JWT_SECRET`: A secure random string for authentication tokens.
    *   `NEXT_PUBLIC_SOCKET_URL`: The URL of your deployed Signaling Server (e.g., `https://my-backend.onrender.com`).
    *   `NEXT_PUBLIC_FACE_SERVICE_URL`: The URL of your deployed Face Service (e.g., `https://my-face-service.onrender.com`).

## 2. Deploying Signaling Server (Backend)
The code in the `backend/` folder handles the WebSocket connections for video calls. Vercel Serverless Functions **do not** support WebSockets.

**Recommended Host**: [Render](https://render.com) or [Railway](https://railway.app).

### Steps for Render:
1.  Create a new **Web Service**.
2.  Connect your repository.
3.  **Root Directory**: `backend`
4.  **Build Command**: `npm install && npm run build`
5.  **Start Command**: `npm start`
6.  **Environment Variables**:
    *   `MONGO_URI`: Same as above.
    *   `PORT`: `4000` (or let Render assign one).
    *   `CORS_ORIGIN`: Your Vercel App URL (e.g., `https://my-project.vercel.app`).

### After Deploying Backend:
1.  Copy the URL provided by Render/Railway.
2.  Go back to **Vercel Settings**.
3.  Update `NEXT_PUBLIC_SOCKET_URL` with this URL.
4.  Redeploy Vercel.

## 3. Deploying Face Service (Microservice)
The `face-service/` folder contains a Python FastAPI application using OpenCV for face detection. This must be deployed as a separate service because it requires a Python runtime.

**Recommended Host**: [Render](https://render.com) or [Railway](https://railway.app).

### Steps for Render:
1.  Create a new **Web Service**.
2.  Connect your repository.
3.  **Root Directory**: `face-service`
4.  **Runtime**: **Python 3**
5.  **Build Command**: `pip install -r requirements.txt`
6.  **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7.  **Environment Variables**:
    *   `PORT`: `5001` (or let Render assign one).

### After Deploying Face Service:
1.  Copy the URL provided by Render/Railway.
2.  Go back to **Vercel Settings**.
3.  Update `NEXT_PUBLIC_FACE_SERVICE_URL` with this URL.
4.  Redeploy Vercel.

## 4. Integrated Microservices
The `microservices/` logic has been moved to `backend/src/microservices/`. These modules (Moderation, RTMP) are now directly available within the Signaling Server codebase.

*   **Moderation**: `backend/src/microservices/moderation/moderation.service.ts`
*   **RTMP**: `backend/src/microservices/rtmp/rtmp.service.ts`

You can import and use them directly in your backend logic:
`import { ModerationService } from '../microservices/moderation/moderation.service';`

## Summary of Architecture
*   **Frontend (Vercel)**: React/Next.js UI.
*   **API (Vercel)**: `/api/auth`, `/api/user` (Serverless Functions).
*   **Signaling Server (Render/Railway)**: Socket.io Server for Video/Chat (Node.js).
*   **Face Service (Render/Railway)**: Face Detection API (Python/FastAPI).
*   **Database (MongoDB Atlas)**: Shared database.
