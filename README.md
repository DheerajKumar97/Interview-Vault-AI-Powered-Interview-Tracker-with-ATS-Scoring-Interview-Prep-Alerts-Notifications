# Interview Vault - AI-Powered Interview Preparation & Tracking Platform 🚀

![Interview Vault Banner](https://drive.google.com/uc?export=view&id=1XBglxx9TMLkxPiHVjzkfksbyHLwQL2X_)

> **Track detailed job application analytics, analyze skill gaps with AI, generate portfolio-worthy projects, and practice with tailored interview questions.**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
  - [Option 1: Docker (Recommended)](#option-1-docker-recommended)
  - [Option 2: Local Development](#option-2-local-development)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🌟 Overview

**Interview Vault** is a comprehensive platform for job seekers to organize their search and leverage AI for a competitive edge. It goes beyond simple tracking by providing deep insights into your applications, analyzing your resume against job descriptions to find gaps, suggesting impressive projects to build, and generating real-world interview questions.

---

## ✨ Features

### 🎯 Core Functionality
- **Application Tracking**: Manage job applications with detailed status tracking (Applied, Interviewing, Offer, etc.).
- **Business Intelligence Dashboard**: Visualize your progress with real-time charts, success rates, and activity heatmaps.
- **Resume Parsing**: Automatically extract skills, experience, and education from your PDF resume.
- **AI Skill Analysis**: Compare your resume against any job description to identify:
  - ✅ **Matching Skills**: What you already have.
  - ❌ **Missing Skills**: Critical technologies you need to learn.
  - ⚠️ **Priority Gaps**: High-impact skills to focus on immediately.

### 🤖 AI-Powered Tools
- **Project Suggestions**: Get 5 innovative, industry-relevant project ideas tailored to the specific job role and your missing skills.
  - Includes detailed descriptions, tech stacks, and "Why it's impressive" justifications.
  - **New Project UI**: Beautifully card-based layout with deep analytics.
- **Interview Preparation**: Generate 15+ tailored interview questions (Technical & Behavioral) based on your exact resume and the target job description.
  - Includes code snippets for technical questions.
  - "Show Answer" functionality for self-review.

### ⚙️ System Features
- **Secure Authentication**: Email-based signup/login with Supabase Auth.
- **Dark/Light Mode**: Fully responsive UI with theme support.
- **Dockerized**: Easy deployment with Docker Compose.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI (shadcn/ui)
- **State Management**: React Hooks & Context
- **Visualizations**: Recharts
- **PDF Handling**: PDF.js

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Server**: Uvicorn
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: OpenAI (GPT-4o-mini) / Google Gemini / Perplexity
- **Parser**: PyMuPDF / LlamaParse (for Resume Parsing)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (in Docker setup)

---

## 📋 Prerequisites

- **Docker Desktop** (Recommended for easiest setup)
- **Node.js 20+** (For local frontend)
- **Python 3.11+** (For local backend)
- **Supabase Account** (For database & auth)
- **OpenAI/Gemini API Key** (For features)

---

## 🚀 Installation & Setup

### Option 1: Docker (Recommended)

Run the entire application (Frontend + Backend + Nginx) with a single command.

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/DheerajKumar97/Interview-Vault-BI-Powered-Interview-Tracker-with-ATS-Score-Calculation-Alerts-and-Nofitication.git
    cd interview-vault
    ```

2.  **Configure Environment**
    Create a `.env` file in the root directory (see [Environment Variables](#-environment-variables)).

3.  **Run with Docker Compose**
    ```bash
    docker-compose up --build
    ```

4.  **Access the App**
    - Application: `http://localhost:80` (or just `http://localhost`)
    - Backend API Docs: `http://localhost:8000/docs`

---

### Option 2: Local Development

If you prefer to run services individually without Docker.

#### 1. Backend Setup (Python)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Server
uvicorn main:app --reload --port 3001
```

#### 2. Frontend Setup (Node.js)

```bash
# In the root directory
npm install

# Run Dev Server
npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory with the following keys:

```env
# --- Supabase Configuration ---
# Found in Supabase Project Settings -> API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# --- Backend Configuration ---
# URL where the backend is running (default local or docker)
VITE_API_URL=http://localhost:3001
# OR for Docker production: http://localhost:8000

# --- AI API Keys ---
# Required for Project Suggestions & Interview Prep
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
PERPLEXITY_API_KEY=...

# --- Email Services (Optional) ---
RESEND_API_KEY=re_...
```

---

## 📂 Project Structure

```
interview-vault/
├── backend/                # Python FastAPI Backend
│   ├── main.py             # App Entry Point
│   ├── routers/            # API Endpoints (ai.py, applications.py, etc.)
│   ├── services/           # Business Logic (resume_parser, etc.)
│   ├── schemas/            # Pydantic Models
│   └── requirements.txt    # Python Dependencies
├── src/                    # React Frontend
│   ├── components/         # Reusable UI Components
│   ├── pages/              # Application Pages
│   │   ├── SkillAnalysis.tsx
│   │   ├── InterviewPreparation.tsx
│   │   └── ...
│   ├── lib/                # Utilities (supabase client, etc.)
│   └── types/              # TypeScript Definitions
├── docker-compose.yml      # Docker Orchestration
├── Dockerfile              # Frontend Dockerfile
└── README.md               # Documentation
```

---

## 📄 License

This project is licensed under the MIT License.
