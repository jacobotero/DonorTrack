# DonorTrack

**A full-stack SaaS application for donor management at small nonprofits — live in production at [donortrackapp.com](https://www.donortrackapp.com)**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_18-316192?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=flat&logo=prisma&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=flat&logo=stripe&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)

---

## Overview

DonorTrack is a multi-tenant SaaS product designed for small nonprofits and churches to replace spreadsheets. Organizations sign up, manage their donors and donations, generate IRS-compliant tax letters, and export reports — all within an isolated, secure account.

The app handles the full SaaS lifecycle: free trial → Stripe subscription → active account → cancellation, with automated transactional emails and webhook-driven subscription state at each step.

**Live:** [donortrackapp.com](https://www.donortrackapp.com)

---

## Technical Highlights

- **Multi-tenant architecture** — every organization's data is fully isolated via foreign key scoping at the database level
- **Stripe billing integration** — checkout sessions, subscription lifecycle webhooks (`checkout.session.completed`, `customer.subscription.deleted`), webhook signature verification with raw body parsing
- **Transactional email pipeline** — welcome, purchase confirmation, cancellation confirmation, and trial reminder emails via Resend, with a `node-cron` daily job that checks trial expirations and sends 3-day and 1-day reminders
- **JWT authentication** — stateless auth with `bcrypt` password hashing, token expiry, and middleware-enforced route protection
- **CSV import/export** — bulk import donors and donations with validation, error reporting, and donor matching by email; export any dataset to CSV
- **PDF generation** — IRS-compliant year-end tax letters generated server-side with PDFKit, downloadable individually or as a batch ZIP
- **Admin panel** — internal management dashboard protected by email-gated middleware; view all users, extend trials, activate/cancel accounts, manually verify emails
- **Sentry error monitoring** — integrated on both frontend and backend with environment-aware initialization
- **Rate limiting** — API-level rate limiting on all routes to prevent abuse
- **SEO** — sitemap.xml and robots.txt served statically, submitted to Google Search Console

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, React Router, Recharts |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 18 with Prisma 7 ORM |
| Auth | JSON Web Tokens, bcrypt |
| Payments | Stripe (Checkout, Subscriptions, Webhooks) |
| Email | Resend, node-cron |
| PDF | PDFKit |
| CSV | csv-parse, csv-stringify (backend), PapaParse (frontend) |
| Error Tracking | Sentry |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Vercel (CDN)                     │
│          React SPA + Static Assets                   │
│          /api/* → proxied to Railway                 │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  Railway (Backend)                   │
│              Express 5 + TypeScript                  │
│         Prisma ORM → PostgreSQL 18                   │
│         node-cron (trial reminder jobs)              │
└────────────────────────┬────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     ┌─────────────┐      ┌─────────────────┐
     │  PostgreSQL  │      │  Stripe / Resend │
     │  (Railway)   │      │  (External APIs) │
     └─────────────┘      └─────────────────┘
```

---

## Features

### Donor & Donation Management
- Full CRUD for donors with type classification (Individual, Family, Business, Foundation), tags, and notes
- Donation tracking by fund, campaign, and payment method (check, cash, card, online, stock, other)
- Batch donation entry mode for high-volume data entry
- Advanced filtering by date range, fund, donor type, and tags

### Reporting & Export
- Dashboard with live stats, giving trends chart, and recent donations feed
- Date range presets (this week, last month, quarter, year-to-date, all time, custom)
- Summary, fund breakdown, and top donor reports — exportable to CSV and PDF
- Bulk donor and donation CSV export

### Tax Letters
- One-click IRS-compliant year-end tax letter generation for all donors
- Batch download as ZIP or send individually via email
- Per-letter sent/unsent tracking

### SaaS Billing
- 14-day free trial (enforced server-side, not just frontend)
- Three subscription tiers (Starter $29/mo, Growth $59/mo, Plus $99/mo)
- Stripe Checkout for payment, webhook-driven account activation
- Graceful cancellation flow with access retention until period end

---

## Project Structure

```
DonorTrack/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # DB schema (User, Organization, Donor, Donation, Fund, TaxLetter, TrialUsed)
│   ├── src/
│   │   ├── config/             # Env validation
│   │   ├── middleware/         # Auth, rate limiting
│   │   ├── routes/             # donors, donations, funds, reports, tax-letters, stripe, admin, auth
│   │   ├── utils/              # Email, PDF generation
│   │   ├── app.ts              # Express setup
│   │   ├── prisma.ts           # Prisma client with pg adapter
│   │   └── server.ts           # Entry point + cron jobs
│   └── prisma.config.ts        # Prisma 7 datasource config
└── frontend/
    ├── public/
    │   ├── sitemap.xml
    │   └── robots.txt
    └── src/
        ├── components/         # Shared UI components
        ├── hooks/              # usePageTitle, useAuth
        ├── lib/                # Axios instance, helpers
        ├── pages/              # Dashboard, Donors, Donations, Reports, TaxLetters, Settings, Admin, Auth
        └── App.tsx             # Routes + auth guard
```

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
# Clone
git clone https://github.com/jacobotero/DonorTrack.git
cd DonorTrack

# Backend
cd backend
npm install
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET, etc.
npx prisma db push
npm run dev                # http://localhost:3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

### Key Environment Variables (Backend)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/donortrack
JWT_SECRET=your-secret-key-min-32-chars
FRONTEND_URL=http://localhost:5173
RESEND_API_KEY=re_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Deployment

- **Frontend** — push to `main`, Vercel auto-deploys
- **Backend** — push to `main`, Railway auto-deploys via Dockerfile; runs `prisma db push` on container start

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production setup.
