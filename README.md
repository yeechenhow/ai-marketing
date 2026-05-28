# AI Sales Operating System

**A hybrid CRM + AI agent platform that profiles prospects, automates follow-up, and helps human or AI agents close deals across chat channels.**

This repository implements the product blueprint for a multi-tenant sales automation platform with two agent types:

- **Human agents** — AI co-pilot for research, profiling, funnel management, follow-up, and closing support
- **AI agents** — Digital sales workers for inbound handling, qualification, nurture, and human escalation

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma 7 |
| Auth | Auth.js (NextAuth v5) |
| UI | Tailwind CSS 4 + Radix primitives |
| AI (Phase 2+) | LLM orchestration layer (OpenAI / Anthropic) |

## Architecture

```
Platform
├── Auth & Tenant Management          ← Sprint Cluster 1 ✓
├── CRM & Customer 360                  ← Sprint Cluster 1 ✓
├── Funnel & Opportunity Management     ← Sprint Cluster 1 ✓
├── Messaging Hub                       ← Sprint Cluster 2 (scaffolded)
├── AI Engine                           ← Sprint Cluster 3 (schema ready)
├── Workflow Automation                 ← Phase 2 (schema ready)
├── Campaign Automation                 ← Phase 2 (schema ready)
├── Analytics & Forecasting             ← Phase 4
├── Compliance / Audit / Consent        ← schema ready
└── Billing / Subscription              ← Phase 2+
```

### Core Services (planned)

- Auth, Tenant, CRM, Messaging, Workflow, AI Orchestration
- Enrichment/Profiling, Analytics, Notification, File, Audit/Compliance

### Data Stores

- **PostgreSQL** — core business data (organizations, prospects, funnels, tasks)
- **Document store** (Phase 2) — conversation transcripts, enrichment blobs
- **Vector store** (Phase 2) — knowledge base retrieval
- **Event stream** (Phase 3) — activities and analytics pipeline

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (local or [Prisma Postgres](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch))

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start local PostgreSQL (no Docker required)
npm run db:start

# If db:start prints a different port, update DATABASE_URL in .env
# (run `npm run db:status` to see the current TCP URL)

# Apply schema + seed demo data
npm run setup

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role | Email | Password | Portal |
|------|-------|----------|--------|
| Super Admin | platform@demo.com | demo1234 | `/admin` |
| Org Admin | admin@demo.com | demo1234 | `/org` |
| Manager | manager@demo.com | demo1234 | `/manager` |
| Agent | agent@demo.com | demo1234 | `/dashboard` |

## Portal Structure

| Portal | Path | Roles |
|--------|------|-------|
| **Company Admin** | `/org` | Org Admin, Analyst |
| **Manager Portal** | `/manager` | Manager (+ Org Admin) |
| Agent Portal | `/dashboard` | Agent (+ all roles for day-to-day work) |
| **Super Admin** | `/admin` | Super Admin (platform owner) |
| Login | `/login` | Public |

Login redirects by role: Super Admin → `/admin`, Org Admin → `/org`, Manager → `/manager`, Agent → `/dashboard`.

### Manager Portal Pages

- **Team Dashboard** — pipeline value, leaderboard, workload
- **Team Pipeline** — full-team kanban view
- **Leaderboard** — agent conversion, scores, open tasks
- **Conversations** — quality review, escalations, AI handoffs
- **Coaching** — AI insights, workload alerts, focus areas
- **Team Tasks** — SLA compliance, overdue follow-ups
- **Reports** — team conversion and source metrics

### Super Admin Portal Pages

- **Overview** — platform stats, tenants, audit activity
- **Organizations** — all tenants, plans, usage
- **Users** — platform-wide user directory
- **Billing** — subscriptions, MRR estimate, plan management
- **AI Settings** — LLM providers, safety policies
- **Templates** — global template library across tenants
- **Analytics** — cross-tenant metrics
- **Audit Logs** — platform activity trail
- **Compliance** — consent, retention, enrichment controls
- **Settings** — feature flags, quotas, integrations

### Company Admin Portal Pages

- **Overview** — org stats, pipeline breakdown, team snapshot
- **Team** — members, roles, specialties
- **Channels** — WhatsApp, Messenger, web chat integrations
- **Pipelines** — funnel and stage configuration
- **Campaigns** — campaign manager
- **AI Agents** — digital agent setup
- **Templates** — approved message templates
- **Reports** — conversion, sources, agent workload
- **Integrations** — webhooks and third-party connectors
- **Settings** — workspace, quotas, compliance

### Agent Portal Pages (V1)

- **Dashboard** — pipeline stats, recent prospects, activity timeline
- **Prospects** — CRM list with lifecycle stage, scores, readiness
- **Prospect 360** — personality profile, next-best-actions, tasks, timeline
- **Pipeline** — kanban-style funnel view
- **Tasks** — follow-ups and reminders
- **Inbox** — unified messaging (Sprint 2)
- **AI Insights** — profiling and recommendations (Sprint 3)
- **Settings** — org config (Sprint 2+)

## Development Roadmap

Aligned with the product blueprint phases:

### Phase 1 — MVP (current)

- [x] Multi-tenant org/team/user roles
- [x] CRM schema (prospects, companies, activities)
- [x] Funnel + pipeline UI
- [x] Personality profile + lead score schema
- [x] Task/reminder engine (data layer)
- [x] Agent portal shell
- [x] Company admin portal (`/org`)
- [x] Super admin portal (`/admin`)
- [x] Manager portal (`/manager`)
- [x] Role-based login redirect
- [ ] WhatsApp + Messenger inbox (Sprint 2)
- [ ] AI-assisted replies (Sprint 3)
- [ ] Template library (Sprint 2)

### Phase 2 — Smart Automation

- Workflow builder, follow-up sequences, campaigns
- Booking + proposal modules
- Message policy guardrails (WhatsApp 24h window, template categories)

### Phase 3 — AI Digital Sales Agents

- Autonomous inbound qualification
- Hybrid AI/human handoff
- Auto nurture with policy-aware outbound rules

### Phase 4 — Advanced Intelligence

- Cross-channel attribution, forecasting, coaching AI
- Offline visit intelligence, team benchmarking

## Messaging Policy Design

WhatsApp and Messenger automation is built around **official platform constraints**, not unlimited follow-up:

- Template-driven outbound outside customer-service windows
- 24-hour WhatsApp service window awareness
- Conversation category and consent tracking
- Opt-in / do-not-contact suppression
- Sending limits and approval workflows

See `ChannelConnection`, `MessageTemplate`, and `ConsentRecord` models in `prisma/schema.prisma`.

## Key Data Models

`Organization`, `Team`, `User`, `Prospect`, `Funnel`, `FunnelStage`, `Opportunity`, `Conversation`, `Message`, `Task`, `Activity`, `PersonalityProfile`, `LeadScore`, `Recommendation`, `AIAgent`, `Workflow`, `Campaign`, `AuditLog`, `ConsentRecord`

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run migrations
npm run db:push      # Push schema to DB (dev)
npm run db:seed      # Load demo data
npm run db:studio    # Open Prisma Studio
```

## License

Private — all rights reserved.
