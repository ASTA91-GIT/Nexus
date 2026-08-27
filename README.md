# NEXUS

NEXUS is a from-scratch full-stack intelligence and investigation platform featuring a 3D network graph, Hugging Face AI integration, risk scoring, and evidence management.

## Tech Stack
* **Frontend:** Next.js (App Router), React, TypeScript, TailwindCSS, Three.js (React Three Fiber)
* **Backend:** FastAPI, Python, Motor (Async MongoDB driver)
* **Database:** MongoDB
* **AI:** Hugging Face Models

## Prerequisites
* Node.js (v18+)
* Python (3.10+)
* MongoDB

## Getting Started

### Local Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Start MongoDB (via Docker):
   ```bash
   docker-compose up -d mongodb
   ```

3. Backend Setup:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

4. Frontend Setup:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Architecture
See `docs/architecture.md` for full details.
