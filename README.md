# ⚡ BijliTrack — Smart Electricity Dashboard

A full-stack web application that helps Pakistani consumers monitor their electricity bills, power outages, feeder status, and complaint history — all from a single, clean dashboard.

> **Data Source:** All data is fetched from official [CCMS/PITC](https://ccms.pitc.com.pk) public services.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![Express](https://img.shields.io/badge/Express-4.19-blue?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)

---

## 🎯 What It Does

| Feature | Description |
|---------|-------------|
| **Bill Dashboard** | View current bill, amount due, due date, units consumed, payment status |
| **Bill History** | 12-month billing history with spending trend charts |
| **Bill Breakdown** | Detailed company charges (energy, fixed, FPA) and govt taxes (GST, ED, FC surcharge) |
| **Power Status** | Real-time feeder ON/OFF status, voltage, power factor |
| **Outage Tracking** | Daily outage monitoring with per-hour breakdown (minutes OFF per hour) |
| **Outage History** | Multi-day outage records with bar charts and PDF export |
| **Complaint Tracking** | Search complaints by reference number or ticket number |
| **Consumer Info** | Name, address, CNIC, meter number, connection type, tariff |
| **Load Schedule** | 24-hour scheduled maintenance grid |
| **Dark/Light Mode** | Full theme support |

---

## 🏗️ Architecture

```
bijlitrack-monorepo/
├── apps/
│   ├── backend/        → Express.js REST API + MongoDB
│   └── frontend/       → Next.js 16 (App Router) + React 19
├── package.json        → npm workspaces orchestrator
```

**Monorepo** managed with npm workspaces. Run both apps with a single command.

### Data Flow

```
User's Browser (Pakistani IP)
├── Calls CCMS APIs directly (bypasses geo-blocking)
│   ├── GET /api/details/user?reference=...
│   ├── GET /api/details/bill?reference=...
│   └── GET /get-loadinfo/...
│
└── Sends data to Backend (Railway)
    ├── POST /dashboard/:refId/save    ← Store snapshot
    ├── GET  /dashboard/:refId         ← Retrieve stored data
    ├── Auth (signup/login/me)
    └── Reference management
```

---

## 🛠️ Tech Stack

### Backend
- **Express.js 4.19** — REST API (ES Modules)
- **MongoDB** (Mongoose 8.4) — Data persistence (Atlas)
- **JWT** (jsonwebtoken) — Authentication (7-day tokens)
- **bcrypt** — Password hashing
- **node-cron** — Daily outage tracking scheduler
- **cheerio** — HTML parsing for complaint history
- **Vitest** — Testing framework
- **CCMS/PITC APIs** — Data source (get-loadinfo, user details, bill details)

### Frontend
- **Next.js 16.2.9** — App Router, Turbopack
- **React 19.2** — UI rendering
- **TypeScript 5** — Type safety
- **Tailwind CSS 4** + **shadcn/ui** + **Radix UI** — Styling and components
- **TanStack React Query 5** — Server state management
- **Recharts 3** — Charts and graphs
- **Axios** — HTTP client
- **React Hook Form 7** + **Zod 4** — Form validation
- **Sonner** — Toast notifications
- **next-themes** — Dark/light mode
- **Lucide React** — Icons

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/ahmmikun/Lesco-Electricity-Moniter.git
cd Lesco-Electricity-Moniter

# Install all dependencies (both apps)
npm install
```

### Environment Setup

Create `apps/backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bijlitrack
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
```

### Running

```bash
# Run both frontend + backend simultaneously
npm run dev

# Or run individually
npm run backend    # Express on http://localhost:5000
npm run frontend   # Next.js on http://localhost:3000
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Reference Management (all protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reference/track` | Start tracking a reference number |
| GET | `/api/reference/my` | Get user's tracked references |
| DELETE | `/api/reference/:id` | Remove tracked reference + all data |

### Dashboard (all protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/:refId` | Get latest saved snapshot |
| POST | `/api/dashboard/:refId/save` | Frontend sends CCMS data to store |
| GET | `/api/dashboard/:refId/billing` | Bill history records |
| GET | `/api/dashboard/:refId/outages` | Outage history with hourly data |
| GET | `/api/dashboard/:refId/report` | Analysis report |

### Complaints (all protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/complaints/track-by-reference?referenceNo=...` | Complaint history by reference |
| GET | `/api/complaints/track-by-ticket?ticketNo=...` | Track by ticket number |

---

## 📊 How Outage Tracking Works

1. User adds a 14-digit reference number and selects tracking duration (7/14/30 days)
2. Frontend fetches data directly from CCMS `get-loadinfo` API (client-side, avoids geo-blocking)
3. The API returns `history_data` — hourly outage minutes for the last 3-4 days
4. Frontend sends this data to the backend for persistent storage via `/dashboard/:refId/save`
5. Backend also has a sync service for server-side daily cron jobs
6. Over time, outage history accumulates in the database
7. Users can export all tracked data as PDF

**Data format:** Each hour has a value 0-60 representing minutes of outage. Example:
```
[0,0,0,0,0,0,0,0,0,0,0,0,0,0,20,55,0,0,0,0,0,0,0,0]
                                ↑  ↑
                           14:00  15:00
                           20min  55min OFF → Total: 1h 15m outage
```

---

## 🌐 Supported DISCOs

BijliTrack works with all PITC/CCMS supported public-sector DISCOs:

`LESCO` `GEPCO` `FESCO` `IESCO` `MEPCO` `PESCO` `HESCO` `SEPCO` `QESCO` `TESCO` `AJ&K`

> ⚠️ **K-Electric is NOT supported** as it uses a different system.

---

## 📱 Pages

| Route | Page |
|-------|------|
| `/` | Landing page |
| `/login` `/signup` | Authentication |
| `/dashboard` | Overview with account cards |
| `/dashboard/details` | Detailed account view (consumer, bill, feeder, schedule) |
| `/dashboard/billing` | Bill history charts + table |
| `/dashboard/outages` | Outage timeline, daily chart, PDF export |
| `/dashboard/complaints` | Track complaints by reference/ticket |
| `/dashboard/lookup` | Add new reference number |
| `/dashboard/reports` | Analysis reports |
| `/dashboard/about` | About, disclaimer, coverage info |
| `/dashboard/settings` | User settings |

---

## 🚢 Deployment

- **Backend**: Railway — Node.js, connects to MongoDB Atlas
- **Frontend**: Railway — Next.js standalone build
- CCMS calls happen from user's browser (not server) to avoid geo-blocking

---

## ⚠️ Disclaimer

BijliTrack is an **independent utility dashboard**. It is NOT an official government website and is NOT affiliated with PITC, WAPDA, or any electricity distribution company.

Data is collected from publicly available official CCMS/PITC services. We do not own, modify, or guarantee the accuracy of the official data.

---

## 📄 License

ISC

---

Built with ❤️ for Pakistani electricity consumers who deserve better tools.
