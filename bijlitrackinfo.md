# BijliTrack - Complete Project Documentation

## Project Structure

```
bijlitrack-monorepo/
├── package.json                    # Root - npm workspaces orchestrator
├── README.md                       # Project documentation
├── bijlitrackinfo.md               # This file - detailed technical docs
├── project-tree.txt                # Full file tree listing
├── .gitignore
├── .gitattributes
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
│   │       │   ├── User.js                  # email, passwordHash, name, role
│   │       │   ├── Reference.js             # referenceNo, trackingDays, feederCode
│   │       │   ├── ConsumerSnapshot.js      # Full data snapshot per sync
│   │       │   ├── BillHistory.js           # Monthly bill records
│   │       │   ├── OutageHistory.js         # Daily outage with hourly data
│   │       │   ├── AnalysisReport.js        # Generated reports
│   │       │   └── ScraperLog.js            # Job execution logs
│   │       ├── services/
│   │       │   ├── ccms.service.js          # CCMS API helpers (safeFetchJson, parseLoadInfo, fetchAllDetails, fetchLoadInfo)
│   │       │   └── sync.service.js          # performSync, performOutageSync (server-side data sync)
│   │       ├── jobs/
│   │       │   └── dailyTracker.js          # Cron job for daily outage tracking
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
│       ├── next.config.ts          # Next.js config
│       ├── tsconfig.json
│       ├── postcss.config.mjs
│       ├── eslint.config.mjs
│       ├── components.json         # shadcn/ui config
│       ├── AGENTS.md               # AI agent instructions
│       ├── CLAUDE.md               # AI agent instructions
│       └── src/
│           ├── app/
│           │   ├── layout.tsx              # Root layout (fonts, Providers)
│           │   ├── page.tsx                # Landing page
│           │   ├── globals.css             # Tailwind + theme variables (oklch)
│           │   ├── favicon.ico
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
│           │   ├── ui/                     # shadcn/ui components
│           │   │   ├── accordion.tsx
│           │   │   ├── alert.tsx
│           │   │   ├── badge.tsx
│           │   │   ├── button.tsx
│           │   │   ├── card.tsx
│           │   │   ├── dropdown-menu.tsx
│           │   │   ├── input.tsx
│           │   │   ├── label.tsx
│           │   │   ├── sheet.tsx
│           │   │   ├── skeleton.tsx
│           │   │   ├── sonner.tsx
│           │   │   ├── table.tsx
│           │   │   └── tabs.tsx
│           │   ├── Providers.tsx           # QueryClient + ThemeProvider
│           │   ├── ThemeProvider.tsx        # next-themes wrapper
│           │   └── ThemeToggle.tsx          # Dark/light mode toggle
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

**Why client-side CCMS calls?**  
CCMS APIs are geo-restricted to Pakistani IPs. Since the backend runs on Railway (non-Pakistani IP), CCMS calls are made directly from the user's browser. The frontend then sends the fetched data to the backend for persistence.

The backend also has `ccms.service.js` and `sync.service.js` for server-side sync (used when the server has a valid IP, e.g., Pakistani VPS or daily cron with proxy).

---

## Backend Details

### Tech Stack
- Express.js 4.19 (REST API, ES Modules)
- MongoDB via Mongoose 8.4 (Atlas)
- JWT authentication (jsonwebtoken, 7-day tokens)
- bcrypt 5.1 (password hashing)
- cheerio 1.2 (HTML parsing for complaints)
- node-cron 3.0 (scheduled jobs)
- cors (cross-origin resource sharing)
- dotenv (environment config)
- Vitest 4.1 + Supertest 7.2 + mongodb-memory-server 11.2 (testing)

### API Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/auth/signup | No | Register user |
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/auth/me | Yes | Get current user |
| POST | /api/reference/track | Yes | Save a reference for tracking |
| GET | /api/reference/my | Yes | Get user's references |
| DELETE | /api/reference/:id | Yes | Delete reference + all data |
| GET | /api/dashboard/:refId | Yes | Get latest snapshot |
| POST | /api/dashboard/:refId/save | Yes | Frontend sends CCMS data to store |
| GET | /api/dashboard/:refId/billing | Yes | Bill history from DB |
| GET | /api/dashboard/:refId/outages | Yes | Outage history from DB |
| GET | /api/dashboard/:refId/report | Yes | Analysis report |
| GET | /api/complaints/track-by-reference | Yes | Scrape CCMS complaint by ref |
| GET | /api/complaints/track-by-ticket | Yes | Scrape CCMS complaint by ticket |

### Database Models

**User**: name, email, passwordHash, role (user/admin), timestamps  
**Reference**: userId, referenceNo, referenceNoLast4, feederCode, trackingEnabled, trackingDays (max 30), trackingStartDate, trackingEndDate, consentGivenAt, lastCheckedAt  
**ConsumerSnapshot**: userId, referenceId, consumerInfo, billingInfo, feederInfo, loadManagementInfo, outageInfo, scrapedAt  
**BillHistory**: userId, referenceId, billMonth, amountDue, dueDate, latePaymentSurcharge, status  
**OutageHistory**: userId, referenceId, feederCode, feederName, date, feederStatus, hourlyOutageMinutes[24], hourlyStatus[24], scheduledMinutes[24], totalOutageMinutes, actualOutageHours, scheduledOutageHours, eventLogs  
**AnalysisReport**: userId, referenceId, reportType (daily/weekly/monthly), summary, billingInsights, outageInsights, recommendations, generatedAt  
**ScraperLog**: jobType, status (success/failed), message, referenceLast4, errorDetails, startedAt, finishedAt

### Services

**ccms.service.js** — Server-side CCMS data fetcher:
- `safeFetchJson(url)` → Fetches JSON from CCMS with proper headers, handles HTML/error responses
- `parseLoadInfo(feederData)` → Parses raw CCMS load info into structured outage data
- `fetchLoadInfo(referenceNo)` → Fetches and parses load info for a single reference
- `fetchAllDetails(referenceNo)` → Fetches user, bill, and load info in sequence

**sync.service.js** — Data synchronization:
- `performSync(reference, userId)` → Full sync: fetches all CCMS data, saves snapshot + bill history + outage records
- `performOutageSync(reference, userId)` → Lightweight outage-only sync for daily cron
- `saveOutageRecords(reference, userId, loadInfo)` → Saves outage records for all available days

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
- React 19.2.4
- TypeScript 5
- Tailwind CSS 4 + shadcn/ui 4.11 + Radix UI 1.6
- TanStack React Query 5.101
- Axios 1.18 (backend API)
- Recharts 3.8 (charts)
- React Hook Form 7.79 + Zod 4.4 (form validation)
- Sonner 2.0 (toasts)
- next-themes 0.4 (dark/light)
- Lucide React 1.18 (icons)
- class-variance-authority + clsx + tailwind-merge (className utilities)
- tw-animate-css (animations)

### Key Files

**src/lib/ccms.ts** — Client-side CCMS service:
- `fetchUserDetails(refNo)` → consumer info (name, address, CNIC, tariff)
- `fetchBillDetails(refNo)` → bill data (current bill, 12-month history)
- `fetchLoadInfo(refNo)` → outage/feeder data with parseLoadInfo
- `fetchFeederStatus(refNo)` → lightweight live feeder status poll
- `fetchAllCCMSData(refNo)` → all three in parallel (Promise.allSettled)

**src/lib/api.ts** — Axios instance:
- Base URL from `NEXT_PUBLIC_API_URL` env or defaults to `http://localhost:5000/api`
- JWT token from localStorage via request interceptor
- 30s timeout
- Debug logging on request/response/error

**src/hooks/useAuth.tsx** — Auth context:
- login/logout/user state
- activeRefId persistence in localStorage
- Auto-redirect to /login if not authenticated
- Token validation via `/auth/me` on mount

### Data Flow (Dashboard)
1. Dashboard loads → fetches references from backend (`/reference/my`)
2. User selects active reference via dropdown selector
3. For the active reference → checks if snapshot exists in backend (`/dashboard/:refId`)
4. If empty/stale → auto-fetches from CCMS (client-side via `fetchAllCCMSData`)
5. Sends fetched data to backend for storage (`/dashboard/:refId/save`)
6. Renders account cards with bill, feeder status, voltage, power factor

### Data Flow (Outage Tracking)
1. Client calls: `https://ccms.pitc.com.pk/get-loadinfo/{referenceNo}`
2. Returns `history_data` — hourly outage minutes for last 3-4 days
3. Format: `[0,0,0,0,...,20,55,...,0]` — each value = minutes OFF in that hour
4. Frontend parses with `parseLoadInfo()` → saves to backend via `/dashboard/:refId/save`
5. Outages page shows hourly colored blocks + daily bar chart + PDF export
6. Backend accumulates history over time for long-term tracking

### Pages

| Route | Function |
|-------|----------|
| / | Landing page |
| /login, /signup | Authentication (email + password) |
| /dashboard | Account overview cards (bill summary, feeder status) |
| /dashboard/details?ref=... | Full account details (consumer, bill, feeder, schedule) |
| /dashboard/billing | Bill history with spending trend chart |
| /dashboard/outages | Outage tracking with hourly timeline + PDF export |
| /dashboard/complaints | Track complaints by reference/ticket (CCMS scraping) |
| /dashboard/lookup | Add new reference number (7/14/30 day tracking) |
| /dashboard/reports | Analysis reports |
| /dashboard/about | About, disclaimer, privacy, coverage |
| /dashboard/settings | User settings |

### Navigation
Dashboard layout includes:
- Desktop sidebar (fixed, 288px wide) with reference selector dropdown, nav links, user card
- Mobile drawer (Sheet component) with same navigation
- Sticky top bar with theme toggle, notifications, status indicator
- Footer with DISCO coverage disclaimer

---

## CCMS APIs Used

| API | Purpose |
|-----|---------|
| `GET /api/details/user?reference=...` | Consumer name, address, CNIC, tariff, load |
| `GET /api/details/bill?reference=...` | Current bill, 12-month history, meter info |
| `GET /get-loadinfo/{referenceNo}` | Real-time feeder status, outage history, event logs, maintenance schedule |
| `GET /complainthistory?reference=...` | Complaint table (HTML, parsed with cheerio on backend) |
| `GET /tracking/ticket?ticket_no=...` | Ticket status (HTML, parsed with cheerio on backend) |

All APIs are from `https://ccms.pitc.com.pk` with `Access-Control-Allow-Origin: *`.

### Load Info Response Structure
```json
{
  "message": "Success",
  "load": [{
    "response": {
      "data": [{
        "feeder_code": "...",
        "feeder": "Feeder Name",
        "grid": "Grid Station Name",
        "current_status": "ON",
        "current_status_time": "2026-06-20 10:30:00",
        "voltage": 415,
        "current": 120,
        "active_power_kW": 85,
        "power_factor": 0.95,
        "history_data": { "dt_20260618": [0,0,...,20,55,...,0] },
        "maintenance_data": { "dt_20260620": [0,0,...,60,...,0] },
        "maintenance_sch": [0,0,...,60,...,0],
        "tripping": [0,0,...,15,...,0],
        "event_logs": [{ "event_time": "...", "event": "OFF" }]
      }]
    }
  }]
}
```

---

## Deployment (Railway)

- **Backend**: `apps/backend/` — Node.js, connects to MongoDB Atlas
  - Procfile: `web: node src/index.js`
  - DNS configured with Google/Cloudflare DNS for MongoDB Atlas connectivity
- **Frontend**: `apps/frontend/` — Next.js build
- CCMS calls happen from user's browser (not server) to avoid geo-blocking

---

## Supported DISCOs

LESCO, GEPCO, FESCO, IESCO, MEPCO, PESCO, HESCO, SEPCO, QESCO, TESCO, AJ&K  
**K-Electric NOT supported** (uses a different system)

---

## Testing

- Backend uses **Vitest** with **mongodb-memory-server** for in-memory MongoDB
- **Supertest** for HTTP endpoint testing
- Test files: `auth.test.js`, `reference.test.js`
- Run: `npm run test -w apps/backend`
