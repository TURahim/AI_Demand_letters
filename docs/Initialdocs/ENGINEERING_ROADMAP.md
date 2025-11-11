# Engineering Roadmap - Steno Demand Letter Generator

**Status**: Frontend ✅ Complete | Backend Foundation ✅ Complete (PR-01, 02, 03, 05) | Core Features 🚧 In Progress  
**Timeline**: ~35 dev days completed | ~40-70 dev days remaining  
**Team**: 2-3 developers

---

## 🏛️ Architecture Decisions

- **Application runtime**: Express application deployed on **AWS Lambda** behind **API Gateway** using `@vendia/serverless-express`. Provisioned concurrency will be enabled for steady latency, and the service runs inside a private VPC with NAT gateways.
- **Container alternative**: If sustained workloads require it, the Terraform stack includes toggles to deploy the same container image to **AWS Fargate (ECS)** behind an Application Load Balancer. The decision is made in PR-01 so downstream PRs inherit the networking and observability choices.
- **Networking & security**: API Gateway (or ALB for Fargate mode) terminates TLS. Private subnets provide access to RDS and other VPC endpoints (S3, Bedrock, Secrets Manager).
- **Secrets management**: AWS Secrets Manager stores credentials (database, third-party APIs) from day one; Lambda environment variables reference secret ARNs.
- **Observability**: CloudWatch dashboards and alarms plus Sentry (or equivalent) capture errors across environments starting in PR-01.

---

## 📊 PR Overview

| PR | Title | Complexity | Days | Dependencies | Status |
|----|-------|------------|------|--------------|--------|
| PR-01 | Infrastructure & Database | Medium | 3-5 | None | ✅ Complete |
| PR-02 | Authentication & Authorization | High | 5-7 | PR-01 | ✅ Complete |
| PR-03 | Document Upload & Storage | Medium | 4-5 | PR-01 | ✅ Complete |
| PR-04 | AI Service (Bedrock) | High | 6-8 | PR-01 | ✅ Complete |
| PR-05 | Template Management | Medium | 4-5 | PR-01, PR-02 | ✅ Complete |
| PR-06 | Letter Generation Engine | High | 7-9 | PR-03, PR-04, PR-05 | 🚧 In Progress |
| PR-07 | Frontend Integration | Medium | 5-6 | PR-02, PR-03, PR-05 | ⏳ Not Started |
| PR-08 | Letter Editor Backend | Medium | 4-5 | PR-06 | ⏳ Not Started |
| PR-09 | Word Export Service | Medium | 4-5 | PR-06 | ⏳ Not Started |
| PR-10 | Real-time Collaboration (P1) | High | 8-10 | PR-08 | ⏳ Optional |
| PR-11 | Analytics & Dashboard | Medium | 4-5 | PR-02 | ⏳ Not Started |
| PR-12 | Testing Suite | Medium | 5-7 | All | ⏳ Not Started |
| PR-13 | Performance & Production | Medium | 4-6 | All | ⏳ Not Started |

---

## PR-01: Infrastructure & Database Setup
**Complexity**: Medium | **Days**: 3-5 | **Dependencies**: None | **Status**: ✅ COMPLETE

### Objectives
Set up AWS infrastructure, PostgreSQL database, and development environment.

**Completed**: All tasks ✅ - Backend server running, database configured, Terraform infrastructure templated, security baseline established

### Tasks

#### 1. Project Initialization
- [ ] `/backend/package.json` — Initialize Node.js project
  - Express, Prisma, AWS SDK, JWT, bcrypt, zod
- [ ] `/backend/tsconfig.json` — TypeScript configuration
- [ ] `/backend/.env.example` — Environment variables template
- [ ] `/backend/.gitignore` — Git ignore rules
- [ ] `/backend/jest.config.ts` — Jest + Supertest configuration for API smoke tests
- [ ] `/backend/src/tests/setup.ts` — Test bootstrap (Supertest client, global teardown)
- [ ] `/backend/src/tests/smoke/health.test.ts` — Health check smoke test
- [ ] `/.github/workflows/backend-ci.yml` — CI/CD pipeline

#### 2. Database Setup
- [ ] `/backend/prisma/schema.prisma` — Prisma schema (use existing from Databaseschema.md)
- [ ] `/backend/prisma/migrations/` — Initial migration
- [ ] `/backend/prisma/seed.ts` — Seed data (firms, users, default templates)
- [ ] `/backend/src/config/database.ts` — Database connection config

#### 3. AWS Infrastructure (Terraform)
- [ ] `/infra/terraform/main.tf` — Core AWS setup
- [ ] `/infra/terraform/s3.tf` — S3 buckets (documents, exports)
- [ ] `/infra/terraform/rds.tf` — PostgreSQL RDS instance
- [ ] `/infra/terraform/bedrock.tf` — Bedrock model access
- [ ] `/infra/terraform/variables.tf` — Environment variables
- [ ] `/infra/terraform/outputs.tf` — Output values

#### 4. Backend Structure
- [ ] `/backend/src/server.ts` — Express server setup
- [ ] `/backend/src/app.ts` — Express app configuration
- [ ] `/backend/src/config/index.ts` — Centralized config
- [ ] `/backend/src/config/secrets.ts` — Secrets Manager loader (local env fallbacks)
- [ ] `/backend/src/middleware/error-handler.ts` — Global error handler
- [ ] `/backend/src/middleware/logger.ts` — Request logging (Winston)
- [ ] `/backend/src/middleware/compression.ts` — gzip/brotli compression middleware
- [ ] `/backend/src/utils/crypto.ts` — Helpers for hashing, checksums, and envelope encryption
- [ ] `/backend/src/utils/prisma-client.ts` — Prisma client singleton

#### 5. Security, Compliance & Monitoring Baseline
- [ ] `/infra/terraform/s3.tf` — Enable SSE-KMS, versioning, and access logging for buckets
- [ ] `/infra/terraform/rds.tf` — Enforce encryption, automated backups, CloudWatch enhanced monitoring
- [ ] `/infra/terraform/bedrock.tf` — Configure VPC endpoints & IAM least privilege for Lambda/Fargate toggle
- [ ] `/infra/terraform/cloudwatch.tf` — Dashboards & alarms (latency, error rate, throttles, queue depth)
- [ ] `/infra/terraform/secrets-manager.tf` — Secrets Manager secrets and rotation policies
- [ ] `/backend/prisma/migrations/` — Add `audit_logs` table skeleton (user, firm, action, metadata, timestamps)
- [ ] `/backend/src/middleware/audit-logger.ts` — Capture authenticated requests into `audit_logs`
- [ ] `/backend/src/services/security/encryption.service.ts` — Wrap AWS KMS for field-level encryption & signing
- [ ] `/backend/src/services/monitoring/metrics.service.ts` — Emit custom metrics (p95 latency, error counts) to CloudWatch
- [ ] `/backend/src/services/monitoring/error-reporter.ts` — Sentry/New Relic integration stub

#### 6. Testing & QA Scaffolding
- [ ] `/frontend/src/tests/msw/server.ts` — MSW server for API mocking
- [ ] `/frontend/src/tests/msw/handlers.ts` — Baseline handlers for auth & documents
- [ ] `/e2e/tests/smoke.spec.ts` — Playwright smoke test hitting `/` and `/health`
- [ ] `/e2e/playwright.config.ts` — Configure environment-aware base URLs

**Success Criteria**: 
- ✅ Database accessible
- ✅ Server runs locally on port 3001
- ✅ Health check endpoint responds
- ✅ Migrations execute successfully (including `audit_logs`)
- ✅ Baseline audit logging, metrics, compression, & encryption configured
- ✅ Smoke tests and MSW/Playwright scaffolding run in CI

---

## PR-02: Authentication & Authorization
**Complexity**: High | **Days**: 5-7 | **Dependencies**: PR-01 | **Status**: ✅ COMPLETE

### Objectives
Implement JWT-based authentication with firm-level data isolation.

**Completed**: All tasks ✅ - JWT auth working, user CRUD complete, firm isolation enforced, 15+ integration tests passing

### Tasks

#### 1. Auth Service
- [ ] `/backend/src/services/auth/auth.service.ts` — Core auth logic
  - Password hashing (bcrypt, 12 rounds)
  - JWT token generation (15min access, 7d refresh)
  - Token verification and refresh
- [ ] `/backend/src/services/auth/auth.controller.ts` — Auth endpoints
- [ ] `/backend/src/services/auth/auth.routes.ts` — Auth routes
- [ ] `/backend/src/services/auth/auth.validation.ts` — Zod schemas

#### 2. Middleware
- [ ] `/backend/src/middleware/authenticate.ts` — JWT verification
- [ ] `/backend/src/middleware/authorize.ts` — Role-based access control
- [ ] `/backend/src/middleware/firm-isolation.ts` — Ensure firm-level isolation
- [ ] `/backend/src/middleware/rate-limiter.ts` — Rate limiting (express-rate-limit)

#### 3. User & Firm Services
- [ ] `/backend/src/services/users/user.service.ts` — User CRUD
- [ ] `/backend/src/services/users/user.controller.ts` — User endpoints
- [ ] `/backend/src/services/users/user.routes.ts` — User routes
- [ ] `/backend/src/services/firms/firm.service.ts` — Firm management
- [ ] `/backend/src/services/firms/firm.controller.ts` — Firm endpoints
- [ ] `/backend/src/services/firms/firm.routes.ts` — Firm routes

#### 4. API Endpoints
```
POST   /api/auth/register    — Create account
POST   /api/auth/login       — Login
POST   /api/auth/refresh     — Refresh token
POST   /api/auth/logout      — Logout
GET    /api/auth/me          — Current user
PUT    /api/users/:id        — Update profile
GET    /api/firms/:id        — Get firm details
```

#### 5. Frontend Integration
- [ ] `/frontend/src/api/auth.api.ts` — Auth API client
- [ ] `/frontend/src/store/auth.slice.ts` — Redux auth slice
- [ ] `/frontend/src/hooks/useAuth.ts` — Auth hook
- [ ] Update `/frontend/app/auth/login/page.tsx` — Connect to API
- [ ] Update `/frontend/app/auth/signup/page.tsx` — Connect to API

#### 6. Testing & Compliance
- [ ] `/backend/src/tests/auth/auth.controller.test.ts` — Integration tests for auth flows (login, refresh, logout)
- [ ] `/backend/src/tests/middleware/firm-isolation.test.ts` — Assert firm boundary enforcement
- [ ] `/frontend/src/tests/msw/handlers/auth.ts` — Auth MSW handlers (success + failure)
- [ ] `/e2e/tests/auth-smoke.spec.ts` — Playwright smoke test covering login + protected route redirect

**Success Criteria**:
- ✅ Users can register and login
- ✅ JWT tokens issued and validated
- ✅ Protected routes require authentication
- ✅ Firm data isolation enforced
- ✅ Auth smoke tests (API, MSW, Playwright) run in CI

---

## PR-03: Document Upload & Storage
**Complexity**: Medium | **Days**: 4-5 | **Dependencies**: PR-01 | **Status**: ✅ COMPLETE

### Objectives
Build S3-based document upload with text extraction.

**Completed**: All tasks ✅ - S3 integration working, PDF/DOCX extraction done, OCR ready, file hashing implemented, 6+ tests passing

### Tasks

#### 1. Upload Service
- [ ] `/backend/src/services/upload/upload.service.ts` — Upload orchestration
- [ ] `/backend/src/services/upload/s3.service.ts` — S3 operations
- [ ] `/backend/src/services/upload/upload.controller.ts` — Upload endpoints
- [ ] `/backend/src/services/upload/upload.routes.ts` — Upload routes
- [ ] `/backend/src/services/upload/upload.validation.ts` — File validation

#### 2. Document Processing
- [ ] `/backend/src/services/documents/document.service.ts` — Document CRUD
- [ ] `/backend/src/services/documents/document.controller.ts` — Document endpoints
- [ ] `/backend/src/services/documents/document.routes.ts` — Document routes
- [ ] `/backend/src/services/processing/pdf-extractor.ts` — PDF text extraction (pdf-parse)
- [ ] `/backend/src/services/processing/docx-extractor.ts` — DOCX text extraction (mammoth)
- [ ] `/backend/src/services/processing/ocr.service.ts` — OCR fallback (AWS Textract with local Tesseract fallback)
- [ ] `/backend/src/services/processing/hash.service.ts` — File hashing (SHA-256) + metadata persistence

#### 3. Chain of Custody & Safety
- [ ] `/backend/src/services/security/antivirus.service.ts` — ClamAV/Lambda layer integration for malware scanning
- [ ] `/backend/src/services/security/evidence.service.ts` — Store chain-of-custody events (hash, uploader, timestamps)
- [ ] `/infra/terraform/s3.tf` — Lifecycle rules & Object Lock (governance mode) for evidence buckets
- [ ] `/infra/terraform/lambda.tf` — Warm OCR/antivirus Lambda (provisioned concurrency if needed)

#### 4. API Endpoints
```
POST   /api/upload/presigned-url  — Get S3 presigned URL
POST   /api/upload/complete        — Confirm upload
GET    /api/documents              — List documents
GET    /api/documents/:id          — Get document
DELETE /api/documents/:id          — Delete document
GET    /api/documents/:id/download — Download document
```

#### 5. Frontend Integration
- [ ] `/frontend/src/api/documents.api.ts` — Document API client
- [ ] `/frontend/src/hooks/useFileUpload.ts` — Upload hook
- [ ] Update `/frontend/app/upload/page.tsx` — Connect to API
- [ ] Update `/frontend/app/documents/page.tsx` — Connect to API
- [ ] Update `/frontend/components/upload/document-upload.tsx` — Real uploads

**Success Criteria**:
- ✅ Files upload to S3 successfully
- ✅ PDF and DOCX text extraction works
- ✅ OCR fallback covers scanned PDFs
- ✅ Antivirus scan + hash recorded for each upload (chain of custody)
- ✅ Document library displays uploaded files
- ✅ File size limits enforced (50MB)

---

## PR-04: AI Service Integration (AWS Bedrock)
**Complexity**: High | **Days**: 6-8 | **Dependencies**: PR-01 | **Status**: ✅ COMPLETE

### Objectives
Integrate AWS Bedrock with Claude 3.5 Sonnet for letter generation.

**Completed**: All tasks ✅ - Bedrock client integrated, prompt system complete, 5 AI endpoints live, usage tracking implemented

### Tasks

#### 1. Bedrock Client
- [ ] `/backend/src/services/ai/bedrock.client.ts` — Bedrock SDK wrapper
- [ ] `/backend/src/services/ai/bedrock.config.ts` — Model configuration
- [ ] `/backend/src/services/ai/token-counter.ts` — Token estimation

#### 2. Prompt Engineering
- [ ] `/backend/src/services/ai/prompts/base-demand-letter.txt` — Base prompt
- [ ] `/backend/src/services/ai/prompts/refinement.txt` — Refinement prompt
- [ ] `/backend/src/services/ai/prompts/tone-adjustment.txt` — Tone prompt
- [ ] `/backend/src/services/ai/prompts/system-instructions.txt` — System prompt
- [ ] `/backend/src/services/ai/prompt-builder.ts` — Dynamic prompt construction

#### 3. AI Services
- [ ] `/backend/src/services/ai/generation.service.ts` — Generation logic
- [ ] `/backend/src/services/ai/refinement.service.ts` — Refinement logic
- [ ] `/backend/src/services/ai/context-builder.ts` — Build context from documents
- [ ] `/backend/src/services/ai/ai.controller.ts` — AI endpoints
- [ ] `/backend/src/services/ai/ai.routes.ts` — AI routes

#### 4. Usage Tracking
- [ ] `/backend/src/services/ai/usage-tracker.ts` — Track AI usage
- [ ] `/backend/src/services/ai/cost-calculator.ts` — Cost estimation

#### 5. API Endpoints
```
POST   /api/ai/generate          — Generate draft
POST   /api/ai/refine            — Refine content
POST   /api/ai/analyze-documents — Analyze documents
```

**Success Criteria**:
- ✅ Bedrock API calls work
- ✅ Generate coherent demand letters
- ✅ Token usage tracked
- ✅ Error handling for API failures

---

## PR-05: Template Management System
**Complexity**: Medium | **Days**: 4-5 | **Dependencies**: PR-01, PR-02 | **Status**: ✅ COMPLETE

### Objectives
Build template CRUD with variable system.

**Completed**: All tasks ✅ - Variable parser/validator/renderer complete, template CRUD working, 3 default templates seeded, 54 tests passing (100%)

### Tasks

#### 1. Template Service
- [ ] `/backend/src/services/templates/template.service.ts` — Template CRUD
- [ ] `/backend/src/services/templates/template.controller.ts` — Template endpoints
- [ ] `/backend/src/services/templates/template.routes.ts` — Template routes
- [ ] `/backend/src/services/templates/template.validation.ts` — Validation schemas

#### 2. Variable System
- [ ] `/backend/src/services/templates/variable-parser.ts` — Parse {{variables}}
- [ ] `/backend/src/services/templates/variable-validator.ts` — Validate variables
- [ ] `/backend/src/services/templates/template-renderer.ts` — Render with data

#### 3. Default Templates
- [ ] `/backend/src/services/templates/defaults/personal-injury.md`
- [ ] `/backend/src/services/templates/defaults/breach-of-contract.md`
- [ ] `/backend/src/services/templates/defaults/property-damage.md`

#### 4. API Endpoints
```
GET    /api/templates           — List templates
POST   /api/templates           — Create template
GET    /api/templates/:id       — Get template
PUT    /api/templates/:id       — Update template
DELETE /api/templates/:id       — Delete template
POST   /api/templates/:id/clone — Clone template
```

#### 5. Frontend Integration
- [ ] `/frontend/src/api/templates.api.ts` — Template API client
- [ ] Update `/frontend/app/templates/page.tsx` — Connect to API
- [ ] Update `/frontend/components/templates/template-editor.tsx` — Real CRUD

**Success Criteria**:
- ✅ Create and edit templates
- ✅ Variable parsing works
- ✅ Default templates seeded
- ✅ Firm-specific templates isolated

---

## PR-06: Letter Generation Engine
**Complexity**: High | **Days**: 7-9 | **Dependencies**: PR-03, PR-04, PR-05 | **Status**: 🚧 READY TO START

### Objectives
Orchestrate end-to-end letter generation with AI.

**Next Step**: PR-04 ✅ Complete! Ready to implement generation orchestration, letter CRUD, versioning, and background jobs.

### Tasks

#### 1. Generation Service
- [ ] `/backend/src/services/generation/generation.service.ts` — Orchestration
- [ ] `/backend/src/services/generation/generation.controller.ts` — Generation endpoints
- [ ] `/backend/src/services/generation/generation.routes.ts` — Generation routes
- [ ] `/backend/src/services/generation/generation.validation.ts` — Validation

#### 2. Letter Management
- [ ] `/backend/src/services/letters/letter.service.ts` — Letter CRUD
- [ ] `/backend/src/services/letters/letter.controller.ts` — Letter endpoints
- [ ] `/backend/src/services/letters/letter.routes.ts` — Letter routes
- [ ] `/backend/src/services/letters/version.service.ts` — Version management
- [ ] `/backend/src/services/letters/diff.service.ts` — Calculate diffs

#### 3. Background Jobs
- [ ] `/backend/src/services/queue/queue.service.ts` — Bull queue setup
- [ ] `/backend/src/services/queue/workers/generation.worker.ts` — Generation worker
- [ ] `/backend/src/services/queue/jobs/generation.job.ts` — Job definition

#### 4. API Endpoints
```
POST   /api/generation/start      — Start generation
GET    /api/generation/:id/status — Check status
POST   /api/generation/:id/refine — Refine letter
GET    /api/letters               — List letters
GET    /api/letters/:id           — Get letter
PUT    /api/letters/:id           — Update letter
DELETE /api/letters/:id           — Delete letter
GET    /api/letters/:id/versions  — Version history
```

#### 5. Frontend Integration
- [ ] `/frontend/src/api/generation.api.ts` — Generation API client
- [ ] `/frontend/src/api/letters.api.ts` — Letters API client
- [ ] Update `/frontend/app/generation/page.tsx` — Connect wizard
- [ ] Update `/frontend/app/editor/page.tsx` — Connect editor
- [ ] Update `/frontend/app/letters/page.tsx` — Connect library

**Success Criteria**:
- ✅ Generate letter from template + documents
- ✅ Version control works
- ✅ Background jobs process correctly
- ✅ Real-time status updates

---

## PR-07: Frontend Integration & Polish
**Complexity**: Medium | **Days**: 5-6 | **Dependencies**: PR-02, PR-03, PR-05

### Objectives
Connect all frontend pages to backend APIs.

### Tasks

#### 1. State Management
- [ ] `/frontend/src/store/index.ts` — Redux store setup
- [ ] `/frontend/src/store/documents.slice.ts` — Documents slice
- [ ] `/frontend/src/store/templates.slice.ts` — Templates slice
- [ ] `/frontend/src/store/letters.slice.ts` — Letters slice
- [ ] `/frontend/src/store/generation.slice.ts` — Generation slice

#### 2. API Integration
- [ ] `/frontend/src/api/client.ts` — Axios client with interceptors
- [ ] `/frontend/src/hooks/useApi.ts` — Generic API hook
- [ ] Add loading states to all pages
- [ ] Add error handling to all pages
- [ ] Add toast notifications

#### 3. Complete Missing Components
- [ ] `/frontend/components/documents/document-list.tsx`
- [ ] `/frontend/components/documents/document-card.tsx`
- [ ] `/frontend/components/letters/letter-list.tsx`
- [ ] `/frontend/components/letters/letter-card.tsx`
- [ ] `/frontend/components/export/export-dialog.tsx`

#### 4. Polish
- [ ] Add loading skeletons
- [ ] Add empty states
- [ ] Add error boundaries
- [ ] Responsive design testing

**Success Criteria**:
- ✅ All pages connected to backend
- ✅ Loading and error states work
- ✅ Navigation flows smoothly
- ✅ Responsive on mobile/tablet

---

## PR-08: Letter Editor Backend
**Complexity**: Medium | **Days**: 4-5 | **Dependencies**: PR-06

### Objectives
Build backend support for real-time editor features.

### Tasks

#### 1. Auto-save Service
- [ ] `/backend/src/services/letters/autosave.service.ts` — Debounced auto-save
- [ ] Update letter endpoints to support incremental updates

#### 2. Comments System
- [ ] `/backend/src/services/comments/comment.service.ts` — Comment CRUD
- [ ] `/backend/src/services/comments/comment.controller.ts` — Comment endpoints
- [ ] `/backend/src/services/comments/comment.routes.ts` — Comment routes

#### 3. API Endpoints
```
POST   /api/letters/:id/comments      — Add comment
GET    /api/letters/:id/comments      — Get comments
PUT    /api/comments/:id              — Update comment
DELETE /api/comments/:id              — Delete comment
POST   /api/comments/:id/resolve      — Resolve comment
```

#### 4. Frontend Integration
- [ ] Update `/frontend/components/editor/letter-editor.tsx` — Auto-save
- [ ] Add comments sidebar to editor

**Success Criteria**:
- ✅ Auto-save works without data loss
- ✅ Comments can be added/resolved
- ✅ Version history tracks changes

---

## PR-09: Word Export Service
**Complexity**: Medium | **Days**: 4-5 | **Dependencies**: PR-06

### Objectives
Export letters to Word format with firm branding.

### Tasks

#### 1. Export Service
- [ ] `/backend/src/services/export/export.service.ts` — Export orchestration
- [ ] `/backend/src/services/export/docx-generator.ts` — DOCX generation (docx package)
- [ ] `/backend/src/services/export/export.controller.ts` — Export endpoints
- [ ] `/backend/src/services/export/export.routes.ts` — Export routes

#### 2. Styling
- [ ] `/backend/src/services/export/styles/default.json` — Default styles
- [ ] `/backend/src/services/export/formatter.ts` — Format conversion

#### 3. API Endpoints
```
POST   /api/export/:letterId/word  — Generate Word doc
GET    /api/export/:exportId/download — Download export
```

#### 4. Frontend Integration
- [ ] `/frontend/components/export/export-button.tsx`
- [ ] `/frontend/components/export/export-dialog.tsx`

**Success Criteria**:
- ✅ Export to Word with formatting
- ✅ Firm logo included
- ✅ Download link works

---

## PR-10: Real-time Collaboration (P1 - Optional)
**Complexity**: High | **Days**: 8-10 | **Dependencies**: PR-08

### Objectives
Google Docs-style real-time collaboration.

### Tasks

#### 1. WebSocket Infrastructure
- [ ] `/backend/src/services/websocket/ws-server.ts` — y-websocket compatible server (ws + auth)
- [ ] `/backend/src/services/websocket/ws-handler.ts` — Presence & awareness message handlers
- [ ] `/backend/src/services/websocket/ws-auth.ts` — WebSocket auth (JWT + firm isolation)

#### 2. Collaborative Data Layer
- [ ] `/backend/src/services/collaboration/yjs-provider.ts` — Yjs document provider with Redis persistence
- [ ] `/backend/src/services/collaboration/version.service.ts` — Snapshotting & cleanup policies
- [ ] `/infra/terraform/redis.tf` — Elasticache Redis cluster sized for Yjs state & awareness

#### 3. Frontend
- [ ] `/frontend/src/services/websocket.service.ts` — y-websocket client wrapper (TipTap + Yjs)
- [ ] `/frontend/components/collaboration/presence-indicator.tsx`
- [ ] `/frontend/components/collaboration/cursor-overlay.tsx`
- [ ] `/frontend/components/collaboration/track-changes-panel.tsx` — Minimal diff overlay using Yjs snapshots

**Success Criteria**:
- ✅ Multiple users can edit simultaneously
- ✅ Changes sync in real-time via Yjs CRDT
- ✅ Minimal track changes (snapshot diff) with firm isolation

---

## PR-11: Analytics & Dashboard
**Complexity**: Medium | **Days**: 4-5 | **Dependencies**: PR-02

### Objectives
Build analytics dashboard with usage metrics.

### Tasks

#### 1. Analytics Service
- [ ] `/backend/src/services/analytics/analytics.service.ts` — Analytics logic
- [ ] `/backend/src/services/analytics/analytics.controller.ts` — Analytics endpoints
- [ ] `/backend/src/services/analytics/analytics.routes.ts` — Analytics routes
- [ ] `/backend/src/services/analytics/aggregator.ts` — Data aggregation

#### 2. API Endpoints
```
GET    /api/analytics/dashboard  — Dashboard metrics
GET    /api/analytics/usage      — Usage statistics
GET    /api/analytics/firm-stats — Firm-wide stats
```

#### 3. Frontend Integration
- [ ] Update `/frontend/app/dashboard/page.tsx` — Real data
- [ ] Update `/frontend/app/analytics/page.tsx` — Real data

**Success Criteria**:
- ✅ Dashboard shows accurate metrics
- ✅ Charts display real data
- ✅ Activity feed works

---

## PR-12: Testing Suite
**Complexity**: Medium | **Days**: 5-7 | **Dependencies**: All

### Objectives
Comprehensive testing for backend and frontend, expanding on the smoke scaffolding introduced in PR-01/02.

### Tasks

#### 1. Backend Testing
- [ ] `/backend/src/tests/setup.ts` — Test setup
- [ ] `/backend/src/tests/helpers/` — Test helpers
- [ ] Unit tests for all services (80%+ coverage)
- [ ] Integration tests for all endpoints
- [ ] `/backend/src/tests/e2e/` — E2E test suite

#### 2. Frontend Testing
- [ ] `/frontend/src/tests/setup.ts` — Vitest setup
- [ ] Component tests for key components
- [ ] Hook tests for custom hooks
- [ ] `/e2e/tests/` — Playwright E2E tests

#### 3. Documentation
- [ ] `/docs/TESTING.md` — Testing guide

**Success Criteria**:
- ✅ 80%+ test coverage
- ✅ All E2E tests pass
- ✅ CI/CD runs tests automatically

---

## PR-13: Performance & Production Readiness
**Complexity**: Medium | **Days**: 4-6 | **Dependencies**: All

### Objectives
Optimize for production and deploy, building on the security/observability baselines established in PR-01.

### Tasks

#### 1. Performance
- [ ] `/backend/src/services/cache/redis.service.ts` — Redis caching for hot endpoints (letters, templates)
- [ ] `/backend/src/services/performance/query-profiler.ts` — Analyze and optimize slow queries
- [ ] `/backend/prisma/migrations/` — Add targeted composite indexes from profiling
- [ ] `/infra/terraform/rds-read-replica.tf` — Optional read replica / scaling configuration

#### 2. Monitoring
- [ ] `/backend/src/middleware/performance.ts` — Capture request timings & attach tracing headers
- [ ] `/backend/src/services/monitoring/logger.ts` — Structured logging refinements (PII scrubbing, context fields)
- [ ] `/infra/terraform/cloudwatch.tf` — Extend dashboards with business KPIs & anomaly alarms
- [ ] `/backend/src/services/monitoring/error-reporter.ts` — Promote Sentry integration to production-ready (environments, release tracking)

#### 3. Security
- [ ] Security audit
- [ ] Penetration testing
- [ ] HTTPS enforcement
- [ ] Rate limiting tuning

#### 4. Documentation
- [ ] `/docs/API_REFERENCE.md` — Complete API docs
- [ ] `/docs/DEPLOYMENT.md` — Deployment guide
- [ ] `/docs/USER_GUIDE.md` — End-user docs

**Success Criteria**:
- ✅ API responses < 2s
- ✅ Database queries < 500ms
- ✅ No security vulnerabilities
- ✅ Production deployment successful

---

## 🎯 Development Workflow

### Phase 1: Foundation (Weeks 1-3)
- **Week 1**: PR-01 (Infrastructure)
- **Week 2**: PR-02 (Auth) + PR-03 (Upload)
- **Week 3**: PR-04 (AI) + PR-05 (Templates)

### Phase 2: Core Features (Weeks 4-7)
- **Week 4-5**: PR-06 (Generation)
- **Week 6**: PR-07 (Frontend Integration)
- **Week 7**: PR-08 (Editor) + PR-09 (Export)

### Phase 3: Advanced (Weeks 8-10)
- **Week 8-9**: PR-10 (Collaboration) *if prioritized*
- **Week 10**: PR-11 (Analytics)

### Phase 4: Launch (Weeks 11-12)
- **Week 11**: PR-12 (Testing)
- **Week 12**: PR-13 (Production) + Bug fixes

---

## 📋 Success Metrics

### Business KPIs
- [ ] 50%+ reduction in letter drafting time
- [ ] 80%+ user adoption within first year
- [ ] Increased client satisfaction
- [ ] New sales leads generated

### Technical KPIs
- [ ] 99.5%+ uptime
- [ ] < 1% API error rate
- [ ] 80%+ test coverage
- [ ] < 2s API response time
- [ ] < 30s AI generation time

---

**Note**: This roadmap prioritizes P0 (must-have) features. PR-10 (Collaboration) is P1 and can be deferred to Phase 2 if needed.

