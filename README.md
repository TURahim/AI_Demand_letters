# Steno AI - Demand Letter Generator

> 🚀 **Status:** Frontend Complete ✅ | Backend Core Complete ✅ | Letter Generation Complete ✅ | Frontend Integration Complete ✅
>
> **Completed**: PR-01 through PR-07 (Infrastructure, Auth, Upload, AI/Bedrock, Templates, Letter Generation, Frontend Integration)

An AI-powered platform for law firms to generate professional demand letters from uploaded case documents.

## 📋 Project Overview

Steno AI streamlines the creation of demand letters by:
- Extracting relevant information from case documents (medical records, police reports, etc.)
- Using AI (AWS Bedrock with Claude) to generate professional demand letters
- Providing templates and collaborative editing tools
- Ensuring firm-level data isolation and security

## 🏗️ Architecture

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **AI:** AWS Bedrock (Claude 3.5 Sonnet)
- **Storage:** AWS S3
- **Infrastructure:** AWS Lambda, API Gateway, CloudFront
- **Cache/Queue:** Redis, Bull

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+ (for frontend)
- Docker & Docker Compose
- AWS CLI (for deployment)
- Terraform 1.5+ (for infrastructure)

### Development Setup

1. **Clone the repository:**

```bash
git clone <repository-url>
cd Steno-AI
```

2. **Start infrastructure services:**

```bash
docker-compose up -d
```

3. **Frontend setup:**

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs at `http://localhost:3000`

4. **Backend setup:**

```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration

# Initialize database
npm run prisma:generate
npm run prisma:migrate

# Start server
npm run dev
```

Backend runs at `http://localhost:3001`

## 📁 Project Structure

```
Steno-AI/
├── frontend/              # Next.js 16 application
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   └── lib/             # Utilities
├── backend/              # Node.js API
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── tests/       # Test files
│   └── prisma/          # Database schema
├── infrastructure/       # Terraform IaC
│   └── terraform/
│       ├── modules/     # Terraform modules
│       └── environments/ # Environment configs
├── docs/                # Documentation
│   └── Initialdocs/
└── docker-compose.yml   # Local dev services
```

## 📚 Documentation

- [Product Requirements Document (PRD)](docs/Initialdocs/PRD.md)
- [Engineering Roadmap](docs/Initialdocs/ENGINEERING_ROADMAP.md)
- [Scaffolding Guide](docs/Initialdocs/SCAFFOLDING_GUIDE.md)
- [Quick Reference](docs/Initialdocs/QUICK_REFERENCE.md)
- [Frontend README](frontend/FrontendREADME.md)
- [Backend README](backend/README.md)

## 🧪 Testing

### Frontend

```bash
cd frontend
pnpm test
```

### Backend

```bash
cd backend
npm test
npm run test:integration
```

## 🚢 Deployment

See [Infrastructure Documentation](infrastructure/terraform/README.md) for AWS deployment instructions.

## 🔒 Security

- JWT-based authentication
- Field-level encryption with AWS KMS
- Firm-level data isolation
- Comprehensive audit logging
- Rate limiting and DDoS protection
- File integrity verification (SHA-256 hashing)
- Antivirus scanning for uploads

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui (50+ components)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL 16
- **Cache:** Redis 7
- **Queue:** Bull
- **Validation:** Zod
- **Logging:** Winston

### AWS Services
- **Compute:** Lambda (serverless)
- **AI:** Bedrock (Claude 3.5 Sonnet)
- **Storage:** S3
- **Database:** RDS (PostgreSQL)
- **Security:** KMS, Secrets Manager
- **Monitoring:** CloudWatch
- **CDN:** CloudFront
- **API:** API Gateway

### DevOps
- **IaC:** Terraform
- **CI/CD:** GitHub Actions
- **Containers:** Docker, Docker Compose
- **Testing:** Jest, Supertest, Playwright

## 📈 Development Roadmap

**Current Phase**: PR-10 - Real-time Collaboration (Complete ✅)

See [Engineering Roadmap](docs/Initialdocs/ENGINEERING_ROADMAP.md) for complete task breakdown.

### Completed ✅

**Frontend (PR-00)**
- Next.js 16 scaffold with App Router
- React 19, TypeScript, Tailwind CSS v4
- 50+ shadcn/ui components (gold/teal themed)
- Complete page structure (13 pages)
- Layout components & navigation
- Design system & responsive UI

**Backend Foundation (PR-01)**
- Express.js + TypeScript server
- Prisma ORM with PostgreSQL
- Docker Compose for local development
- Terraform infrastructure (modules for all AWS services)
- Security baseline: KMS encryption, Secrets Manager, audit logging
- Monitoring: CloudWatch dashboards, error tracking, metrics
- CI/CD workflows (GitHub Actions)
- Jest + Supertest test scaffolding

**Authentication & Authorization (PR-02)**
- JWT-based auth (access + refresh tokens)
- User registration & login endpoints
- Role-based access control (RBAC)
- Firm-level data isolation middleware
- Rate limiting & DDoS protection
- Password hashing (bcrypt, 12 rounds)
- 15+ integration tests

**Document Upload & Storage (PR-03)**
- S3 integration with presigned URLs
- PDF/DOCX text extraction
- OCR fallback (AWS Textract)
- File hashing (SHA-256) for chain of custody
- Antivirus scanning stub (ClamAV ready)
- Document CRUD operations
- 6+ integration tests

**AI Service Integration (PR-04)**
- AWS Bedrock client integration (Claude 3.5 Sonnet)
- Prompt engineering system (base, refinement, tone adjustment)
- Token counting and usage tracking
- Cost estimation per generation
- Context builder from documents
- 5 AI endpoints (generate, refine, analyze)
- Error handling and fallbacks

**Template Management (PR-05)**
- Variable parser (`{{variable}}` syntax)
- Variable validator with type support (string, number, date, boolean, currency)
- Template renderer with conditionals
- Template CRUD with versioning
- 3 default legal templates (Personal Injury, Breach of Contract, Property Damage)
- Public vs firm-specific templates
- Usage tracking & analytics
- 54 unit + integration tests (100% passing)

**Letter Generation Engine (PR-06)**
- End-to-end letter generation orchestration
- BullMQ queue infrastructure with Redis
- Background job processing for AI generation with robust worker startup
- Letter CRUD operations with many-to-many document linking
- Version control system with diff calculation
- Generation status tracking (pending, processing, completed, failed)
- Letter-document relationship management
- **Enhanced Generation Worker (Refactored):**
  - Retry mechanism with exponential backoff (3 attempts, 0.5-2s delays)
  - 60-second hard timeout for AI generation calls
  - Zod schema validation before processing (validates required fields)
  - Metadata preservation (merges instead of replacing)
  - Dynamic progress updates (5% → 10% → 50% → 70% → 100%)
  - Parallelized version creation and usage tracking
  - Enhanced error logging with full stack traces
  - Job deduplication using letterId as jobId
  - Security comments for PII handling
  - Structured error responses for AI failures (no fallback content)
- 6+ integration tests

**Frontend Integration & Polish (PR-07)**
- API client with fetch-based interceptors
- Connected all pages to backend APIs (auth, documents, templates, letters, generation)
- Loading states, error handling, and toast notifications (Sonner)
- Completed missing components (document/letter lists and cards)
- Loading skeletons and empty states
- Error boundaries for resilience
- Build passing with no compilation errors
- Fixed authentication UX (error display, navigation)
- Fixed backend error handling (queue, logging)
- Fixed Radix Select empty value errors
- Fixed dashboard infinite reload loop

**Letter Editor Backend (PR-08)** - Complete ✅
- **Backend Features:**
  - Comment model with threaded replies and position tracking
  - Full CRUD comment service (create, read, update, delete)
  - Resolve/unresolve comments with resolver tracking
  - Comment controller with Zod validation
  - 8 REST API endpoints for comments
  - Firm-level isolation and permissions
  - Integration with letter routes
  - Auto-save service with 2-second debounce
  - Incremental letter updates (auto-save vs manual save)
  - Integration tests for comment system
- **Frontend Features:**
  - Comments sidebar with real-time updates
  - Threaded comment replies
  - Comment editing, deletion, and resolution
  - Auto-save with status indicator (saved/saving/unsaved/error)
  - Toggle for showing/hiding resolved comments
  - Responsive 3-column layout (editor + refinement + comments)
  - Save status indicator with visual feedback
  - Comments API client with TypeScript types

**Bug Fixes & Improvements (Post PR-08)** - Complete ✅
- **Document Upload & Download:**
  - Fixed CORS preflight failures on S3 bucket uploads
  - Fixed API parameter naming (fileType → contentType) for presigned URLs
  - Fixed download returning JSON instead of binary (now uses presigned download URLs)
  - Added support for .doc files alongside PDF, DOCX, TXT
  - Download preserves original filename
- **UI Fixes:**
  - Fixed document card title overflow with line-clamp and word-break
  - Fixed status/size badges wrapping properly
- **Performance:**
  - Fixed "Maximum update depth exceeded" in generation wizard
  - Memoized API calls in useApi hook dependencies
  - Eliminated infinite render loops on /generation page
- **AI Generation Reliability:**
  - Fixed AWS Bedrock model ID (using inference profile format)
  - Fixed BullMQ worker startup race conditions (5-strategy approach)
  - Implemented structured error handling (no fallback content on AI failure)
  - Generation worker now reliably starts on every server restart
- **All builds passing:** Backend TypeScript ✅ | Frontend Next.js ✅

**Word Export Service (PR-09)** - Complete ✅
- **Backend Features:**
  - Export service with DOCX generation using `docx` package
  - Configurable export options (header, footer, firm branding)
  - S3 integration for export file storage with firm isolation
  - Presigned download URLs (1-hour expiration)
  - Export tracking (download count, file size)
  - Automatic cleanup of expired exports (7-day retention)
  - 4 REST API endpoints for export management
  - Audit logging for export actions
- **Frontend Features:**
  - Enhanced export dialog with options checkboxes
  - Format selection (DOCX ready, PDF/HTML coming soon)
  - Real-time export with progress indicator
  - Automatic file download after generation
  - Export API client with TypeScript types
  - Integrated export button in letter editor
- **Document Formatting:**
  - Professional heading styles (H1, H2)
  - Proper paragraph spacing and line height
  - Standard 1-inch margins
  - Auto-detection of headings
  - Optional header/footer with branding

**Real-time Collaboration (PR-10)** - Complete ✅
- **Backend Infrastructure:**
  - WebSocket server on `/collaboration` path
  - Yjs CRDT document synchronization protocol
  - Redis persistence with debounced saves (500ms)
  - JWT authentication via WebSocket params
  - Firm-level access control and letter ownership validation
  - Graceful connection/disconnection handling
  - Awareness protocol for presence tracking
- **Frontend Implementation:**
  - TipTap rich text editor with Yjs integration
  - Real-time collaborative editing across multiple clients
  - Presence indicators showing active users with avatars
  - Live cursor positions with user colors
  - `/collab-editor` page with full features
  - Connection status indicator (connected/connecting/disconnected)
  - Comments sidebar and export integration
- **Features:**
  - Conflict-free real-time synchronization (Yjs CRDT)
  - Sub-second latency for edits
  - Automatic conflict resolution
  - Data persistence to Redis and PostgreSQL
  - Offline support with sync on reconnection
  - Secure JWT authentication for all connections

### Upcoming 📅
- PR-11: Analytics & Dashboard (usage metrics, firm-wide statistics)
- PR-12: Testing Suite (comprehensive E2E coverage, 80%+ code coverage)
- PR-13: Performance & Production Readiness (Redis caching, query optimization, security hardening)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

Proprietary - All rights reserved

## 👥 Team

- Product Owner: [Name]
- Tech Lead: [Name]
- Developers: [Names]

## 📞 Support

For questions or issues, please contact:
- Email: support@steno.ai
- Slack: #steno-ai

---

**Built with ❤️ for legal professionals**
