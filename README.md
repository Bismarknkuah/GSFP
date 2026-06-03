# Ghana School Feeding Programme — District Management System v2

**Enterprise national-scale platform for managing Ghana's School Feeding Programme across all 16 regions.**

---

## User Roles & Demo Credentials

| Username | Password | Role |
|---|---|---|
| superadmin | super123 | Super Administrator |
| nationaladmin | natadm123 | National Administrator |
| nationalfin | natfin123 | National Finance Officer |
| regionalmin | regmin123 | Regional Minister (Western North) |
| regionalcoo | regcoo123 | Regional Feeding Coordinator |
| regfin | regfin123 | Regional Finance Officer |
| director | dir123 | District Director |
| coordinator | coord123 | District Feeding Coordinator |
| financeofficer | fin123 | Finance Officer |
| auditor1 | aud123 | Auditor |
| head1–head8 | head123 | Headmasters |
| caterer1–caterer8 | cat123 | Caterers |

---

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI to your Atlas connection string
npm install
node src/db/seed.js --force   # seed database
npm start                      # start on port 4000
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_BACKEND_URL=http://localhost:4000
npm install
npm run dev
```

---

## Deployment

### Railway (Backend)
1. Connect GitHub repo to Railway
2. Set root directory to `backend`
3. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`

### Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variable: `VITE_BACKEND_URL`

---

## Features

- 18 user roles with full RBAC
- National → Regional → District reporting chain
- Financial management: budgets, allocations, disbursements
- Complete payment tracking with arrears detection
- Messaging & broadcasts (district, regional, national)
- Analytics dashboards per level
- Audit trail for all system actions
- PDF export for reports and payments
- Mobile-responsive interface
- District management across all 16 Ghana regions
