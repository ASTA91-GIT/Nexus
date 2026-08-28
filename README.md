# NEXUS

NEXUS is an advanced full-stack intelligence and forensic investigation platform designed for rapid entity analysis. It features a spatial 3D network graph, Hugging Face AI integration, anomaly detection, dynamic risk scoring, and evidence management.

## Key Features

- **3D Intelligence Command Center**: Immersive, hardware-accelerated 3D relationship network graph powered by React Three Fiber.
- **NEXUS AI Investigator**: Integrated AI chatbot (Hugging Face) grounded in case evidence, capable of predicting suspects and tracing connection paths.
- **Anomaly Detection**: Automated detection of high-value transfers, suspicious communications, and operational anomalies.
- **Risk Dashboards**: Real-time evaluation and visualization of threat indexes across cases and entities.
- **Connection Explorer**: Pathfinding algorithms to discover the shortest links between any two entities in a case file.
- **Advanced Theming**: Dynamic Light/Dark glassmorphic UI utilizing CSS custom variables.

## Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript, TailwindCSS, Three.js (@react-three/fiber)
- **Backend**: FastAPI, Python, Motor (Async MongoDB driver), NetworkX
- **Database**: MongoDB
- **AI Engine**: Hugging Face Models

## Prerequisites

- Node.js (v18+)
- Python (3.10+)
- MongoDB

## Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

### 2. Database Setup

Start MongoDB (via Docker if available):

```bash
docker-compose up -d mongodb
```

### 3. Backend Setup

Initialize the Python backend and FastAPI server:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 4. Frontend Setup

Initialize the Next.js frontend:

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to access the NEXUS OS.

## Architecture & Documentation

See the `docs/` directory for full system architecture, database schema, and API route documentation.
