# BijliTrack - Complete Project Documentation

## Project Structure

```
bijlitrack-monorepo/
├── package.json                    # Root - npm workspaces orchestrator
├── README.md                       # Project documentation
├── .gitignore
│
├── apps/
│   ├── backend/                    # Express.js REST API
│   │   ├── package.json
│   │   ├── railway.json            # Railway deployment config
│   │   ├── Procfile
│   │   ├── .env                    # Environment variables (not in git)
│   │   └── src/
│   │       ├── index.js            # App entry point, Express setup, routes
│   │       ├── controllers/
│   │       │   ├── auth.controller.js       # Signup, login, getMe
│   │       │   ├── dashboard.controller.js  # Get/save snapshots, billing, outages
│   │       │   ├── reference.controller.js  # Track, list, delete references
│   │       │   └── complaint.controller.js  # Scrape CCMS complaint pages
│   │       ├── routes/
│   │       │   ├── auth.routes.js
│   │       │   ├── dashboard.routes.js
│   │       │   ├── reference.routes.js
│   │       │   └── complaint.routes.js
│   │       ├── middlewares/
│   │       │   └── auth.middleware.js       # JWT token verification
│   │       ├── models/
│   │       │   ├── User.js                  # email, passwordHash, name
│   │       │   ├── Reference.js             # referenceNo, trackingDays, feederCode
│   │       │   ├── ConsumerSnapshot.js      # Full data snapshot per sync
│   │       │   ├── BillHistory.js           # Monthly bill records
│   │       │   ├── OutageHistory.js         # Daily outage with hourly data
│   │       │   ├── AnalysisReport.js        # Generated reports
│   │       │   └── ScraperLog.js            # Job execution logs
│   │       ├── services/
│   │       │   ├── ccms.service.js          # CCMS API helpers (safeFetchJson, parseLoadInfo)
│   │       │   └── sync.service.js          # (Legacy - now unused, CCMS calls moved to frontend)
│   │       ├── jobs/
│   │       │   └── dailyTracker.js          # (Disabled - was cron for daily outage tracking)
│   │       ├── utils/
│   │       │   ├── masking.js               # Data masking utilities
│   │       │   ├── saveData.js
│   │       │   └── saveJson.js
│   │       └── tests/
│   │           ├── auth.test.js
│   │           └── reference.test.js
│   │
│   └── frontend/                   # Next.js 16 (App Router)
│       ├── package.json
│       ├── railway.json            # Railway deployment config
│       ├── next.config.ts          # standalone output for deployment
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       ├── eslint.config.mjs
│       ├── components.json         # shadcn/ui config
│       └── src/
│           ├── app/
│           │   ├── layout.tsx              # Root layout (fonts, Providers)
│           │   ├── globals.css             # Tailwind + theme variables (oklch)
│           │   ├── login/page.tsx
│           │   ├── signup/page.tsx
│           │   └── dashboard/
│           │       ├── layout.tsx          # Sidebar, nav, mobile drawer, footer
│           │       ├── page.tsx            # Dashboard overview (account cards)
│           │       ├── details/page.tsx    # Detailed account view
│           │       ├── billing/page.tsx    # Bill history charts + table
│           │       ├── outages/page.tsx    # Outage timeline + PDF export
│           │       ├── complaints/page.tsx # Track complaints via CCMS
│           │       ├── reports/page.tsx    # Analysis reports
│           │       ├── lookup/page.tsx     # Add new reference number
│           │       ├── about/page.tsx      # About, disclaimer, coverage
│           │       └── settings/page.tsx   # User settings
│           ├── components/
│           │   ├── ui/                     # shadcn/ui components (Button, Card, etc.)
│           │   ├── Providers.tsx           # QueryClient + ThemeProvider
│           │   └── ThemeToggle.tsx
│           ├── hooks/
│           │   └── useAuth.tsx             # Auth context (login, logout, activeRefId)
│           └── lib/
│               ├── api.ts                  # Axios instance (backend API)
│               ├── ccms.ts                 # Direct CCMS API calls (client-side)
│               └── utils.ts               # cn() helper
```

---

## Architecture

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

## Backend Details

### Tech Stack
- Express.js 4.19 (REST API)
- MongoDB via Mongoose 8.4 (Atlas)
- JWT authentication (jsonwebtoken, 7-day tokens)
- bcrypt (password hashing)
- cheerio (HTML parsing for complaints)
- node-cron (disabled - was for daily tracking)

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/auth/signup | Register user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user |
| POST | /api/reference/track | Save a reference for tracking |
| GET | /api/reference/my | Get user's references |
| DELETE | /api/reference/:id | Delete reference + all data |
| GET | /api/dashboard/:refId | Get latest snapshot |
| POST | /api/dashboard/:refId/save | Frontend sends CCMS data to store |
| GET | /api/dashboard/:refId/billing | Bill history from DB |
| GET | /api/dashboard/:refId/outages | Outage history from DB |
| GET | /api/dashboard/:refId/report | Analysis report |
| GET | /api/complaints/track-by-reference | Scrape CCMS complaint by ref |
| GET | /api/complaints/track-by-ticket | Scrape CCMS complaint by ticket |

### Database Models

**User**: name, email, passwordHash, role  
**Reference**: referenceNo, referenceNoLast4, feederCode, trackingEnabled, trackingDays, trackingStartDate, trackingEndDate  
**ConsumerSnapshot**: consumerInfo, billingInfo, feederInfo, loadManagementInfo, outageInfo, scrapedAt  
**BillHistory**: referenceId, billMonth, amountDue, status, dueDate  
**OutageHistory**: referenceId, date, hourlyOutageMinutes[24], totalOutageMinutes, actualOutageHours, feederStatus, feederName, eventLogs  
**AnalysisReport**: referenceId, reportType, summary, billingInsights, outageInsights  
**ScraperLog**: jobType, status, referenceLast4, errorDetails, startedAt, finishedAt

### Environment Variables
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
FRONTEND_URL=https://...  (for CORS)
```

---

## Frontend Details

### Tech Stack
- Next.js 16.2.9 (App Router, Turbopack)
- React 19.2
- TypeScript
- Tailwind CSS 4 + shadcn/ui + Radix UI
- TanStack React Query 5
- Axios (backend API)
- Recharts 3 (charts)
- Sonner (toasts)
- next-themes (dark/light)
- Lucide React (icons)
- React Hook Form + Zod (forms)

### Key Files

**src/lib/ccms.ts** — Client-side CCMS service:
- `fetchUserDetails(refNo)` → consumer info
- `fetchBillDetails(refNo)` → bill data
- `fetchLoadInfo(refNo)` → outage/feeder data with parseLoadInfo
- `fetchAllCCMSData(refNo)` → all three in parallel

**src/lib/api.ts** — Axios instance:
- Base URL from `NEXT_PUBLIC_API_URL` env or auto-detect
- JWT token from localStorage via interceptor
- 30s timeout

**src/hooks/useAuth.tsx** — Auth context:
- login/logout/user state
- activeRefId persistence in localStorage
- Auto-redirect to /login if not authenticated

### Data Flow (Dashboard)
1. Dashboard loads → fetches references from backend
2. For each reference → checks if snapshot exists in backend
3. If empty → auto-fetches from CCMS (client-side) → saves to backend
4. Renders account cards with bill, feeder status, voltage, power factor

### Data Flow (Outage Tracking)
1. API: `https://ccms.pitc.com.pk/get-loadinfo/{referenceNo}`
2. Returns `history_data` — hourly outage minutes for last 3-4 days
3. Format: `[0,0,0,0,...,20,55,...,0]` — each value = minutes OFF in that hour
4. Frontend parses with `parseLoadInfo()` → saves to backend via `/save`
5. Outages page shows hourly colored blocks + daily bar chart + PDF export

### Pages

| Route | Function |
|-------|----------|
| /login, /signup | Authentication |
| /dashboard | Account overview cards |
| /dashboard/details?ref=... | Full account details (consumer, bill, feeder, schedule) |
| /dashboard/billing | Bill history with spending trend chart |
| /dashboard/outages | Outage tracking with hourly timeline + PDF export |
| /dashboard/complaints | Track complaints by reference/ticket |
| /dashboard/lookup | Add new reference number (7/14/30 day tracking) |
| /dashboard/reports | Analysis reports |
| /dashboard/about | About, disclaimer, privacy, coverage |
| /dashboard/settings | User settings |

---

## CCMS APIs Used

| API | Purpose |
|-----|---------|
| `GET /api/details/user?reference=...` | Consumer name, address, CNIC, tariff, load |
| `GET /api/details/bill?reference=...` | Current bill, 12-month history, meter info |
| `GET /get-loadinfo/{referenceNo}` | Real-time feeder status, outage history, event logs |
| `GET /complainthistory?reference=...` | Complaint table (HTML, parsed with cheerio) |
| `GET /tracking/ticket?ticket_no=...` | Ticket status (HTML, parsed with cheerio) |

All APIs are from `https://ccms.pitc.com.pk` with `Access-Control-Allow-Origin: *`.

---

## Deployment (Railway)

- **Backend**: `apps/backend/` — Node.js, connects to MongoDB Atlas
- **Frontend**: `apps/frontend/` — Next.js standalone build
- CCMS calls happen from user's browser (not server) to avoid geo-blocking

---

## Supported DISCOs

LESCO, GEPCO, FESCO, IESCO, MEPCO, PESCO, HESCO, SEPCO, QESCO, TESCO, AJ&K  
**K-Electric NOT supported**
