# NagarSeva (Community Hero)

AI-powered hyperlocal civic issue reporting and municipal command platform for citizens, field engineering crews, and authorities.

## 🌐 Live Deployed Application

- **Live Frontend Portal (Vercel)**: [https://nagar-seva-stavan-desai.vercel.app](https://nagar-seva-stavan-desai.vercel.app)
- **Production Backend API (Render)**: [https://nagarseva-backend.onrender.com](https://nagarseva-backend.onrender.com)

---

## 🚀 Getting Started / Quick Start

### Prerequisites
- **Node.js**: v18.x or higher
- **PostgreSQL + PostGIS**: (Can run locally via Homebrew or Docker)

### 1. Database Setup

**Option A — Local PostgreSQL:**
```bash
npm run db:setup    # creates DB + schema
npm run db:seed     # seeds demo civic infrastructure issues
```

**Option B — Docker Container:**
```bash
docker compose up -d
npm run db:seed
```

### 2. Configure Environment Variables
Copy the example environment file inside the backend directory:
```bash
cp backend/.env.example backend/.env
```
Add your **Google Gemini API Key** (`GEMINI_API_KEY`) and **Sarvam AI Key** (`SARVAM_API_KEY`) inside `backend/.env`.

### 3. Install Dependencies & Run Development Servers
Start both backend API and frontend Vite servers concurrently from the project root:
```bash
npm run install:all
npm run dev
```
- Frontend dev server: `http://localhost:5173`
- Backend API server: `http://localhost:3001`

---

## ✨ Key Features

- **Multimodal AI Classification (Powered by Google Gemini API)** — Upload a photo → Gemini API automatically classifies category, hazard severity, priority, and estimates infrastructure repair costs (INR).
- **AI Voice Assistant & Site Guidance** — Field engineering workers receive context-driven, concise voice help and step verification powered by Google Gemini API and Sarvam AI Indic speech synthesis.
- **Municipal Command Grid** — Real-time Authority dashboard featuring AI Auto-Triage & Dispatch, seasonal prediction radar, live field workforce telemetry, and SLA tracking.
- **Live GIS Heatmap & Clustering** — Interactive Leaflet maps with severity clustering and dynamic aging heatmaps (blue to critical red based on days open).
- **Community Verification & Crowdfunding** — Citizens upvote and verify neighborhood reports; integrated civic sponsorship allows funding infrastructure fixes with transparency progress bars.
- **Automated Resolution Verification** — Multimodal AI compares before and after completion evidence photos before authorizing supervisor sign-offs.
- **Civic Score & Gamification** — Reward badges, leaderboards, and engagement metrics for active civic participants.
- **Multilingual Indic Localization** — Native voice and UI translation across Indian regional languages via Sarvam AI.

---

## 🛠️ Tech Stack

**Frontend**: React · Tailwind CSS · Leaflet GIS · Recharts · Lucide Icons  
**Backend**: Node.js · Express.js · PostgreSQL · PostGIS Spatial Engine  
**AI & Intelligence**: Google Gemini API (Multimodal Vision & Reasoning) · Sarvam AI (Indic Speech & Translation) · Cloudinary  
