# 📊 Pulse
**Your team's revenue. One dashboard.**

A lightweight, multi-tenant CRM and sales-tracking dashboard — customers, deals, revenue KPIs, and AI-generated executive summaries, built to run entirely on your own machine.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14.2-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white">
  <img alt="OpenRouter" src="https://img.shields.io/badge/AI-OpenRouter-10B981">
  <img alt="Local only" src="https://img.shields.io/badge/deployment-local%20only-F59E0B">
</p>

> [!NOTE]
> **A local demo build, not a production product.** Ships with one fictional demo tenant (Brightpath Studio) and no real users. There is no hosted version, no billing, and no data leaves your machine except the structured summaries sent to OpenRouter when you explicitly generate an AI report. See [Known limitations](#-known-limitations) for what's intentionally simplified.

---

## 📑 Table of contents

- [Why it exists](#-why-it-exists)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [How the core features work](#-how-the-core-features-work)
- [Architecture](#-architecture)
- [Security model](#-security-model)
- [Getting started](#-getting-started)
- [Known limitations](#-known-limitations)

---

## 🎯 Why it exists

Most CRMs are built for enterprise sales teams and come with a hundred features a five-person agency will never touch. Pulse is the opposite bet: one dashboard, one clear picture of revenue, and an AI summary that reads like something a sharp ops person would actually write — not a wall of unexplained widgets.

It's also built multi-tenant from the ground up, so the same instance can serve more than one company with each tenant's data fully isolated, without needing a separate deployment per customer.

---

## ✨ Features

### 📇 Customers & deals

| Feature | What it does |
|---|---|
| **Customer records** | Full CRUD — name, email, company, lifecycle status (lead / active / churned). |
| **Deals pipeline** | Full CRUD — linked to a customer, value, stage (open / won / lost), close date. |
| **Search, filter, sort** | Both tables support live search, status/stage filters, and animated column sorting. |
| **CSV export** | One click, streamed straight from the database — no external service. |

### 📈 Dashboard & analytics

| Feature | What it does |
|---|---|
| **KPI cards** | Total revenue, active deals, win rate, new customers — animated count-up, with a per-card sparkline and trend arrow, computed live from the `deals` table (never cached or stored). |
| **Revenue trend** | Won revenue by month, last 6 months. |
| **Pipeline chart** | Deal value by stage. |
| **Win/loss ratio** | All-time closed-deal ratio, as a donut with the win rate in the center. |
| **Custom layout** | KPI cards and charts can be dragged and resized, persisted per user. |

### 🤖 AI insights

| Feature | What it does |
|---|---|
| **Executive summary** | Gathers the current period's revenue, pipeline, and top-customer data into a structured object, sends it to OpenRouter, and **streams the response token-by-token** into a "thinking → typing" panel. Saved permanently to Reports history. |
| **Ask AI (⌘K)** | Type a question like *"deals closed last month over $5000"* into the command palette. OpenRouter function-calling extracts structured filters (stage, value range, date range), which are run directly against the `deals` table. |
| **Weekly summary toggle** | Since there's no real scheduler in a local build, turning this on immediately generates a backdated sample report and logs a simulated "email sent" line to the server console — see [Known limitations](#-known-limitations). |

### 🔐 Team & access

| Feature | What it does |
|---|---|
| **Roles** | `admin` and `member`, enforced **server-side** on every mutating route — not just hidden in the UI. |
| **Team invites** | Logged to the server console and the activity feed (no real email sending — see limitations). |
| **Activity feed** | Every deal, customer, invite, report, and settings change, with relative timestamps. |
| **Audit log** | Admin-only page listing every create/update/delete across the workspace, independent of the lighter activity feed. |

### ⚡ Productivity

| Feature | What it does |
|---|---|
| **Command palette (⌘K)** | Fuzzy-searches customers, deals, and every page, plus the natural-language AI search above. |
| **Mock integrations** | Slack / Zapier / Google Sheets connector cards with a working toggle UI — no real integration behind them, by design (see limitations). |
| **Dark mode** | Full working toggle; light is the default theme. |

---

## 🛠 Tech stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | API routes and Server Components in one app — no separate backend service needed for a single-tenant-per-request tool. |
| **UI** | Tailwind CSS, Framer Motion, Recharts, lucide-react | A data-forward "enterprise dashboard" look — flat cards, animated entrances, no glassmorphism. |
| **Language** | TypeScript 5 (strict) | |
| **Database** | PostgreSQL via Prisma ORM | Local Docker container, or any local Postgres install. |
| **Auth** | Custom JWT session cookies (`jose`), bcrypt password hashing | Simple and self-contained — no external auth provider to configure for a local-only tool. |
| **AI** | OpenRouter (OpenAI-compatible), default `openai/gpt-4o-mini` | One API for report generation and natural-language query, streamed via a raw `ReadableStream`. |
| **Fonts** | Geist → Inter → system sans-serif | Loaded through `next/font`, matching the brief's fallback chain. |

---

## ⚙️ How the core features work

### 📊 KPIs and charts are computed live, never stored

Every number on the dashboard — revenue, win rate, pipeline value, sparklines — is aggregated from the `deals` and `customers` tables on each request. There is no cached "stats" row that can drift from the underlying records; the tradeoff is a bit more query work per dashboard load in exchange for numbers that are always correct.

### 🏢 Tenant isolation is enforced at the query layer

Every table carries a `tenant_id`, and every Prisma query in `app/api/**` filters by the authenticated session's `tenant_id` before returning or mutating anything. This is the "equivalent query-level scoping" approach rather than native Postgres Row-Level Security — see [Known limitations](#-known-limitations) for why, and what that trade-off means in practice.

### 🧠 The AI report pipeline

`lib/report-data.ts` gathers a structured summary (revenue vs. the prior period, deal counts by stage, top customers) → a system prompt instructs the model to write a concise executive summary with 3–5 insights and 1–2 recommendations, grounded only in that data → the response streams back over a hand-rolled SSE-style protocol → the finished text is saved to the `reports` table once streaming completes.

### 🔑 Roles are checked on the server, not just hidden in the UI

A member can see a disabled "Admins only" toggle in Settings, but the underlying API route re-checks `session.role === "admin"` independently before making any change — the UI state is a convenience, not the actual gate.

---

## 🏗 Architecture

```
app/
├── login/ signup/        Public auth pages
├── (app)/                Authenticated shell: dashboard, customers, deals,
│                         reports, team, settings, audit-log
└── api/
    ├── auth/             Login, signup, logout, session
    ├── customers/ deals/ Full CRUD, scoped to tenant
    ├── dashboard/        Live KPI aggregation + per-user widget layout
    ├── ai/               Streaming report generation, natural-language query
    ├── reports/ activity/ audit-log/   History and read endpoints
    ├── team/ settings/   Invites, roles, integrations, scheduled summaries
    └── export/           CSV generation
components/
├── ui/                   Restyled shadcn-style primitives (button, dialog, table…)
├── app-shell/            Sidebar, topbar, mobile drawer
├── dashboard/ reports/   customers/ deals/ team/ settings/ activity/
└── command-palette.tsx   ⌘K, including the AI query entry point
lib/
├── auth.ts               JWT session creation/verification, password hashing
├── db.ts                 Prisma client singleton
├── openrouter.ts         Streaming + non-streaming OpenRouter calls
├── report-data.ts        Period aggregation feeding the AI prompt
└── activity.ts audit.ts  Append-only event logging
prisma/
├── schema.prisma         10 tables, all tenant- or user-scoped
└── seed.ts               Generates the entire demo tenant in one run
```

### Data model

| Table | Purpose |
|---|---|
| `tenants`, `users` | Workspace and membership, with `admin` / `member` roles |
| `customers`, `deals` | The core CRM records |
| `activities` | Lightweight, human-readable event feed |
| `audit_logs` | Structured before/after record of every mutation, admin-only |
| `reports` | Saved AI executive summaries |
| `dashboard_layout` | Per-user widget positions (drag-and-drop) |
| `integrations`, `scheduled_report_settings` | Mock connector state and the weekly-summary toggle |

Every table above except `dashboard_layout` (scoped by `user_id`, which itself belongs to exactly one tenant) carries a `tenant_id`.

---

## 🛡 Security model

| Control | Implementation |
|---|---|
| **Sessions** | httpOnly, signed JWT cookies (`jose`), 7-day expiry. No client-side token storage. |
| **Passwords** | bcrypt, 10 rounds. Never returned in any API response. |
| **Tenant isolation** | Every query filters by `tenant_id` from the server-derived session — never from a client-supplied value. This is **application-level scoping, not native Postgres Row-Level Security** (see limitations). |
| **Role checks** | Re-validated server-side on every admin-only route (team invites, role changes, integrations, scheduled reports, audit log) — a hidden button in the UI is not the security boundary. |
| **Middleware** | Redirects unauthenticated requests to `/login` before any page renders; API routes independently return `401`/`403` rather than relying on the redirect. |
| **No external credentials requested** | Signup only ever asks for a name, email, and password — there's nothing else to leak. |

---

## 🚀 Getting started

**Prerequisites:** Node.js 18.18+ (20 recommended), Docker Desktop **or** a local PostgreSQL 14+ install, and — optionally — an [OpenRouter](https://openrouter.ai) API key for the AI features.

```bash
npm install
cp .env.example .env           # then fill in SESSION_SECRET and OPENROUTER_API_KEY
docker compose up -d           # starts a local Postgres container
npm run db:push                # creates the schema
npm run seed                   # generates the demo tenant, users, customers, deals…
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the login screen with demo credentials pre-filled.

### Demo login credentials

All seeded users share the password `password123`:

| Email | Role |
|---|---|
| `morgan@brightpathstudio.com` | admin |
| `jordan@brightpathstudio.com` | admin |
| `casey@brightpathstudio.com` | member |

> [!TIP]
> Already running Postgres locally? Skip `docker compose up -d` and point `DATABASE_URL` in `.env` at your own instance instead, then run `npm run db:push` and `npm run seed` as above.

### Useful scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server at localhost:3000 |
| `npm run build` / `npm run start` | Production build and start |
| `npm run seed` | Reset and re-seed all demo data |
| `npm run db:push` | Push the Prisma schema to your database (no migration history) |
| `npm run db:generate` | Regenerate the Prisma client after schema changes |

---

## ⚠️ Known limitations

Stated plainly rather than hidden:

- **Tenant isolation is application-level, not native Postgres RLS.** Every query filters by `tenant_id` in Prisma, and it's applied consistently across every route — but a bug in a future route would be a code review problem, not something the database itself would block. A production version of this product would add real Postgres RLS as defense-in-depth.
- **No real email is ever sent.** Team invites and the weekly AI summary are logged to the server console and the activity feed instead — there's no email provider configured, by design, since this is a local-only build.
- **The "weekly summary" isn't actually scheduled.** There's no cron job or background worker. Turning the toggle on simulates one run immediately (a backdated report) rather than running on a real recurring schedule.
- **Auth is intentionally minimal.** A hand-rolled JWT cookie was chosen over a hardened provider (Supabase Auth, NextAuth) to keep the project dependency-free and fully local — there's no password reset flow, no email verification, and no OAuth.
- **No automated test suite.** The financial and aggregation logic (dashboard stats, report data gathering) is manually verified, not covered by unit tests.
- **Single demo tenant.** The seed script creates one fictional agency (Brightpath Studio); signing up creates additional real tenants, but there's no multi-tenant demo data pre-loaded beyond the one seed.
- **Mock integrations stay mock.** The Slack / Zapier / Google Sheets cards toggle real database state, but nothing is actually posted anywhere — there's no OAuth flow or webhook behind them.
