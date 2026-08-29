# NEXUS - Intelligence Platform 🌌

**A Next-Generation AI-Driven Forensic Investigation & Case Management Platform.**
Built for the **Smart India Hackathon (SIH)**.

![NEXUS Cover](https://via.placeholder.com/1200x400.png?text=NEXUS+Intelligence+Platform) <!-- Replace with your actual cover image -->

## 🚀 Overview

NEXUS is a highly secure, modern web application designed to help intelligence agencies, law enforcement, and forensic analysts connect the dots in complex investigations. It provides a centralized hub to manage cases, map out suspect networks in 3D, parse raw evidence (PDFs, CSVs, TXT) dynamically, and query an elite AI Investigator Agent that uses Retrieval-Augmented Generation (RAG) to find insights in your uploaded documents.

## ✨ Key Features

- 🛡️ **Maximum Security Authentication**: Enforced complex passwords, clearance levels, badge numbers, and role-based access control (RBAC). The first registered user is automatically assigned the `ADMIN` role.
- 🌌 **3D Link Mapping**: Visually explore complex suspect relationships and global entity networks using interactive, physics-based 3D Three.js visualizations.
- 🤖 **AI Investigator Chatbot (RAG)**: An integrated AI agent powered by Hugging Face models. Upload case files (PDFs, text files, CSVs), and the AI will "read" the documents, allowing you to interrogate the evidence naturally in a chat interface.
- 📥 **Dynamic Evidence Ingestion**: A robust data ingestion wizard to map unstructured CSV/JSON/PDF data to a structured database schema instantly.
- 🎨 **Premium UI/UX**: A dark-mode, glassmorphic aesthetic built with Tailwind CSS, ensuring the platform looks as elite as the functionality it provides.

## 🛠️ Technology Stack

**Frontend:**
- [Next.js (App Router)](https://nextjs.org/) - React Framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling & Glassmorphism
- [Three.js](https://threejs.org/) & `react-force-graph-3d` - 3D Network Visualizations
- Font Awesome 6 - Icons

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) - High-performance Python API
- [MongoDB](https://www.mongodb.com/) & Motor - Asynchronous NoSQL Database
- [Hugging Face](https://huggingface.co/) (Inference API) - AI integration for RAG & Chat

## ⚙️ Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MongoDB (Running locally on `mongodb://localhost:27017` or via Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/nexus.git
cd nexus
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Create a `.env` file in the root of the project with your API keys:
```env
HUGGINGFACE_API_KEY=your_huggingface_key_here
```

Start the FastAPI server:
```bash
uvicorn app.main:app --port 8080 --reload
```
The API will be available at `http://localhost:8080`.

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🔒 Security Architecture
- **Strict Password Policies:** 12+ characters, uppercase, numbers, and symbols are enforced at both frontend UI and API levels.
- **JWT Tokens:** Stateless authentication with JWT. Roles (`ADMIN`, `USER`) are securely encoded.
- **Isolated Environments:** Cases are strictly sandboxed. Deleting a case cascades the deletion to all associated entities, relationships, and evidence to prevent data leaks.

## 🏆 Smart India Hackathon (SIH) Relevance
NEXUS directly addresses problem statements requiring advanced data visualization, AI integration for unstructured data parsing, and secure intra-agency communication and case management.

---

*Developed with ❤️ by the NEXUS Team for SIH.*
