# VIBE // Real-Time Video Chat Platform

## Overview
VIBE is a next-generation real-time video chat platform featuring random matching, group calls, and AI moderation, built with a "Gen-Z" dark aesthetic.

## Architecture
The project is structured as a monorepo for development convenience:

- **`/` (Root)**: Next.js Frontend (App Router, TailwindCSS, Zustand).
- **`/backend`**: Node.js + Express + Socket.io + Mediasoup Signaling Server.
- **`/microservices`**: Standalone worker services (Moderation, RTMP, Logging).
- **`/docs`**: Detailed architectural documentation.

## Prerequisites
- Node.js v18+
- PostgreSQL
- Redis
- FFmpeg (for RTMP service)

## Getting Started

### 1. Frontend
```bash
npm install
npm run dev
# Runs on http://localhost:3000
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
# Runs on http://localhost:4000
```

### 3. Microservices
Each microservice is designed to be run independently.
```bash
# Example: Run Moderation Service
ts-node microservices/moderation/moderation.service.ts
```

## Key Features
- **Random Chat**: Match with strangers via Redis-based queuing.
- **Group Calls**: Up to 10 users using Mediasoup SFU logic.
- **AI Moderation**: Mock pipeline for detecting NSFW content.
- **Gen-Z UI**: Custom Neon/Dark theme using TailwindCSS.

## Documentation
- [System Architecture](docs/architecture.md)
- [Database Schema](docs/database_schema.md)
- [API Specification](docs/api_spec.md)
- [Design System](docs/design_system.md)

## License
MIT
# projectstudo
