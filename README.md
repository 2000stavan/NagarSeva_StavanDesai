# Community Hero

AI-powered hyperlocal civic issue reporting platform for citizens and authorities.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL + PostGIS)

### 1. Start the database

**Option A — Local PostgreSQL (Homebrew):**
```bash
npm run db:setup    # creates DB + schema
npm run db:seed     # loads 50 demo issues in Mumbai
```

**Option B — Docker:**
```bash
docker compose up -d
npm run db:seed
```

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# Add XAI_API_KEY, Cloudinary, SMTP keys as needed (optional — mock AI works without keys)
```

### 3. Install & seed
```bash
npm run install:all
npm run db:seed
```

### 4. Run the app
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Demo Accounts

Password for all: `password123`

| Email | Role |
|-------|------|
| demo@communityhero.in | Citizen |
| roads@mumbai.gov.in | Authority (Roads) |
| water@mumbai.gov.in | Authority (Water) |
| citizen1@example.com | Citizen |

## Features

- **AI Classification** — Upload a photo → Grok classifies category, severity, and estimates repair cost (INR)
- **Live Map** — Clustered pins by severity + aging heatmap (blue→red by days open)
- **Community Verification** — Upvote/flag issues; 3+ upvotes → verified
- **Duplicate Detection** — Merge nearby same-category reports within 200m
- **Authority Dashboard** — KPIs, department stats, seasonal AI patterns, aging breakdown
- **Sponsorship** — Citizens fund fixes with progress bar vs estimated cost
- **Resolution Verification** — AI compares before/after photos
- **Civic Score & Badges** — Gamified community participation
- **Auto-Escalation** — Daily cron escalates stale issues (7d / 21d / 45d)

## Environment Variables

See `backend/.env.example` for all required variables.

## Tech Stack

React + Tailwind + Leaflet · Node.js + Express · PostgreSQL + PostGIS · xAI Grok · Cloudinary · JWT Auth
