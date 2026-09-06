# DonorTrack

**A full-stack donor management application for small nonprofits — live in production at [donortrackapp.com](https://www.donortrackapp.com), free to use**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_18-316192?style=flat&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=flat&logo=prisma&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazonaws&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

---

## Overview

DonorTrack is a multi-tenant application for small nonprofits and churches to replace donor-tracking spreadsheets. Organizations sign up, manage their donors and donations, generate IRS-compliant tax letters, and export reports — all within an isolated account.

It's free to use, with no plan gating, no trial expiry, and no payment required — every account gets full access to every feature immediately.

**Live:** [donortrackapp.com](https://www.donortrackapp.com)

---

## Technical Highlights

- **Multi-tenant architecture** — every organization's data is fully isolated via foreign key scoping at the database level
- **Serverless AWS deployment** — Lambda (container image) behind API Gateway, S3 + CloudFront for the frontend, all provisioned as code via AWS CDK (Python)
- **JWT authentication** — stateless auth with `bcrypt` password hashing, token expiry, and middleware-enforced route protection
- **CSV import/export** — bulk import donors and donations with validation, error reporting, and donor matching by email; export any dataset to CSV
- **PDF generation** — IRS-compliant year-end tax letters generated server-side with PDFKit, downloadable individually or as a batch ZIP
- **Rate limiting** — API-level rate limiting on auth and general routes to slow abuse
- **SEO** — sitemap.xml and robots.txt served statically, submitted to Google Search Console
- **CI/CD via OIDC** — GitHub Actions deploys to AWS by assuming an IAM role via OpenID Connect; no long-lived AWS credentials stored anywhere

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, React Router, Recharts |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL (Neon, serverless) with Prisma 7 ORM |
| Auth | JSON Web Tokens, bcrypt |
| PDF | PDFKit |
| CSV | csv-parse, csv-stringify (backend), PapaParse (frontend) |
| Infrastructure | AWS CDK (Python) — Lambda, API Gateway, S3, CloudFront, SSM, IAM |
| CI/CD | GitHub Actions, OIDC-federated AWS deploy role |

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                  CloudFront (donortrackapp.com)            │
│   default behavior → S3 (React SPA + static assets)        │
│   /api/* behavior   → API Gateway (HTTP API)                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │   Lambda (container)  │
                  │   Express + Prisma     │
                  └──────────┬────────────┘
                             │
                ┌────────────┴────────────┐
                ▼                          ▼
       ┌─────────────────┐      ┌──────────────────────┐
       │  Neon Postgres    │      │  SSM Parameter Store  │
       │  (serverless)      │      │  (JWT secret, DB URL) │
       └─────────────────┘      └──────────────────────┘
```

Full design rationale lives in [docs/superpowers/specs/2026-09-05-aws-migration-design.md](./docs/superpowers/specs/2026-09-05-aws-migration-design.md).

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
- Batch download as ZIP, or send individually via an organization's own SMTP credentials
- Per-letter sent/unsent tracking

---

## Project Structure

```
DonorTrack/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # DB schema (User, Organization, Donor, Donation, Fund, TaxLetter)
│   ├── src/
│   │   ├── config/             # Env validation
│   │   ├── middleware/         # Auth, rate limiting
│   │   ├── routes/             # donors, donations, funds, reports, tax-letters, admin, auth
│   │   ├── utils/              # Email, PDF generation
│   │   ├── app.ts              # Express setup
│   │   ├── lambda.ts           # Lambda entry point (API Gateway proxy)
│   │   ├── loadSecrets.ts      # Fetches secrets from SSM at cold start
│   │   ├── prisma.ts           # Prisma client
│   │   └── server.ts           # Local-dev entry point
│   └── Dockerfile              # Multi-stage build → Lambda container image
├── frontend/
│   ├── public/
│   │   ├── sitemap.xml
│   │   └── robots.txt
│   └── src/
│       ├── components/         # Shared UI components
│       ├── hooks/              # usePageTitle, useAuth
│       ├── lib/                # Axios instance, helpers
│       ├── pages/              # Dashboard, Donors, Donations, Reports, TaxLetters, Settings, Admin, Auth
│       └── App.tsx             # Routes + auth guard
├── infra/
│   ├── infra/infra_stack.py    # CDK stack: S3, CloudFront, Lambda, API Gateway, IAM
│   └── tests/unit/             # pytest regression guards on the synthesized template
└── .github/workflows/
    ├── deploy-frontend.yml     # Build + sync to S3 + invalidate CloudFront
    └── deploy-infra.yml        # Test, apply DB schema, cdk deploy
```

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or a free [Neon](https://neon.tech) project)

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
```

`RESEND_API_KEY` and `SENTRY_DSN` are optional — without them, email sending and error reporting no-op gracefully rather than failing.

---

## Deployment

DonorTrack runs on AWS, provisioned entirely via CDK. See [infra/README.md](./infra/README.md) for the full architecture, the manual one-time setup (SSM secrets, ACM certificate, GitHub Actions repo variables), and how deploys work day to day.

- **Frontend** — push to `main` touching `frontend/**` → builds and syncs to S3, invalidates CloudFront
- **Backend/infra** — push to `main` touching `backend/**` or `infra/**` → tests, applies the Prisma schema, then `cdk deploy`
