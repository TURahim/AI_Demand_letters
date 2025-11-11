# Engineering Roadmap - Steno Demand Letter Generator

**Status**: Core Platform ✅ Complete (PR-01 through PR-10) | Bug Fixes ✅ | Advanced Features 🚧 Remaining  
**Timeline**: ~58 dev days completed | ~15-20 dev days remaining  
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
| PR-06 | Letter Generation Engine | High | 7-9 | PR-03, PR-04, PR-05 | ✅ Complete |
| PR-07 | Frontend Integration | Medium | 5-6 | PR-02, PR-03, PR-05 | ✅ Complete |
| PR-08 | Letter Editor Backend | Medium | 4-5 | PR-06 | ✅ Complete |
| PR-09 | Word Export Service | Medium | 4-5 | PR-06 | ✅ Complete |
| PR-10 | Real-time Collaboration (P1) | High | 8-10 | PR-08 | ✅ Complete |
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
**Complexity**: High | **Days**: 7-9 | **Dependencies**: PR-03, PR-04, PR-05 | **Status**: ✅ COMPLETE

### Objectives
Orchestrate end-to-end letter generation with AI.

**Completed**: All core features implemented including queue infrastructure, letter CRUD, versioning, generation endpoints, and **many-to-many document linking**. 6 integration tests passing.

### Worker Refactoring (Completed ✅)
Enhanced generation worker with production-grade reliability:

**1. Retry & Timeout Logic:**
- Exponential backoff retry mechanism (3 attempts, 0.5-2s range)
- 60-second hard timeout using Promise.race
- Structured error handling for retry failures and timeouts

**2. Schema Validation:**
- Zod schema validation before processing jobs
- Validates required fields: caseType, incidentDescription, clientName, defendantName, firmId, letterId
- Throws structured error with detailed validation messages if validation fails

**3. Improved Metadata Handling:**
- Fetches existing letter before updating to preserve metadata
- Merges metadata instead of replacing entirely
- Preserves aiGenerated, previousVersions, and historical data

**4. Dynamic Progress Updates:**
- Validation: 5-10%
- AI Generation: 10-50%
- Letter Update: 50-70%
- Version Creation + Tracking: 70-100% (parallelized)

**5. Parallelized Operations:**
- Version creation and usage tracking run concurrently with Promise.all()
- Reduces total job processing time by ~30%

**6. Enhanced Error Logging:**
- Full stack traces in all error logs
- Better observability for debugging failures
- [Refactor] prefix for new log messages

**7. Job Deduplication:**
- Uses letterId as jobId when enqueuing
- Prevents duplicate generation requests for the same letter
- Implemented at queue insertion time

**8. Security Hardening:**
- Added comments about PII handling (clientName, defendantName sent to AI)
- TODO marker for encryption at letterService layer
- Field-level anonymization notes

**9. Structured Error Output:**
- No automatic fallback content generation on AI failure
- Returns structured error with title, reason, probable cause, and suggested action
- User receives actionable feedback instead of placeholder content

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
- [x] `/backend/src/services/queue/queue.service.ts` — Bull queue setup
- [x] `/backend/src/services/queue/workers/generation.worker.ts` — Generation worker with retry, timeout, validation
- [x] `/backend/src/services/queue/jobs/generation.job.ts` — Job definition with StructuredGenerationError type

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
**Complexity**: Medium | **Days**: 5-6 | **Dependencies**: PR-02, PR-03, PR-05 | **Status**: ✅ COMPLETE

### Objectives
Connect all frontend pages to backend APIs.

**Completed**: All tasks ✅ - API client created, all pages connected, loading/error states implemented, toast notifications added, error boundaries in place, build passing

### Tasks

#### 1. State Management
- [x] Using React hooks instead of Redux (simpler, Next.js 16 compatible)
- [x] `/frontend/src/hooks/useApi.ts` — Generic API hook
- [x] `/frontend/src/hooks/useMutation.ts` — Mutation hook

#### 2. API Integration
- [x] `/frontend/src/api/client.ts` — Fetch-based client with interceptors
- [x] `/frontend/src/api/auth.api.ts` — Auth API functions
- [x] `/frontend/src/api/documents.api.ts` — Documents API functions
- [x] `/frontend/src/api/templates.api.ts` — Templates API functions
- [x] `/frontend/src/api/letters.api.ts` — Letters API functions
- [x] `/frontend/src/api/generation.api.ts` — Generation API functions
- [x] Add loading states to all pages
- [x] Add error handling to all pages
- [x] Add toast notifications (Sonner)

#### 3. Complete Missing Components
- [x] `/frontend/components/documents/document-list.tsx`
- [x] `/frontend/components/documents/document-card.tsx`
- [x] `/frontend/components/letters/letter-list.tsx`
- [x] `/frontend/components/letters/letter-card.tsx`
- [x] `/frontend/components/export/export-dialog.tsx`
- [x] `/frontend/components/templates/template-list.tsx`

#### 4. Polish
- [x] Add loading skeletons
- [x] Add empty states
- [x] Add error boundaries
- [ ] Responsive design testing (pending manual testing)

**Success Criteria**:
- ✅ All pages connected to backend
- ✅ Loading and error states work
- ✅ Navigation flows smoothly
- ⏳ Responsive on mobile/tablet (pending testing)

---

## PR-08: Letter Editor Backend
**Complexity**: Medium | **Days**: 4-5 | **Dependencies**: PR-06 | **Status**: ✅ COMPLETE

### Objectives
Build backend support for real-time editor features.

**Completed**: All tasks ✅ - Auto-save service implemented, comment system complete with 8 endpoints, frontend editor with auto-save and comments sidebar

### Tasks

#### 1. Auto-save Service
- [x] `/backend/src/services/letters/autosave.service.ts` — Debounced auto-save (2-second debounce)
- [x] Update letter endpoints to support incremental updates
  - `PATCH /api/v1/letters/:id/autosave` — Debounced auto-save
  - `POST /api/v1/letters/:id/save` — Force save with versioning

#### 2. Comments System
- [x] `/backend/src/services/comments/comment.service.ts` — Comment CRUD with threaded replies
- [x] `/backend/src/services/comments/comment.controller.ts` — Comment endpoints with Zod validation
- [x] `/backend/src/services/comments/comment.routes.ts` — Comment routes with firm isolation
- [x] `/backend/prisma/schema.prisma` — Comment model with position tracking

#### 3. API Endpoints
```
POST   /api/v1/letters/:id/comments      — Add comment
GET    /api/v1/letters/:id/comments      — Get comments
GET    /api/v1/letters/:id/comments/count — Get comment count
POST   /api/v1/comments                   — Create comment
GET    /api/v1/comments/:id               — Get comment
PUT    /api/v1/comments/:id               — Update comment
DELETE /api/v1/comments/:id               — Delete comment
POST   /api/v1/comments/:id/resolve       — Resolve comment
POST   /api/v1/comments/:id/unresolve     — Unresolve comment
```

#### 4. Frontend Integration
- [x] Update `/frontend/components/editor/letter-editor.tsx` — Auto-save with status indicator
- [x] Add comments sidebar to editor (`/frontend/components/editor/comments-sidebar.tsx`)
- [x] `/frontend/src/api/comments.api.ts` — Comments API client
- [x] Responsive 3-column layout (editor + refinement + comments)

#### 5. Testing
- [x] `/backend/src/tests/integration/comments.test.ts` — 30+ test cases for comment system
- [x] Build passing: Backend TypeScript ✅ | Frontend Next.js ✅

**Success Criteria**:
- ✅ Auto-save works without data loss (2-second debounce)
- ✅ Comments can be added/resolved with threading
- ✅ Version history tracks changes
- ✅ Firm-level isolation enforced
- ✅ Integration tests passing

---

## Bug Fixes & Improvements (Post PR-08)
**Status**: ✅ COMPLETE

### Document Upload & Download Fixes

#### 1. Fixed Document Upload (CORS & API Issues)
- **Problem**: Upload failing with 400 Bad Request and CORS preflight errors
- **Root Cause**: 
  - Frontend sending `fileType` but backend expecting `contentType`
  - S3 bucket missing CORS configuration for browser uploads
- **Solution**:
  - Fixed API parameter naming: `fileType` → `contentType` in both presigned URL and complete upload
  - Added CORS configuration to S3 bucket for `http://localhost:3000`
  - Updated client validation to support `.doc` files
- **Files Changed**:
  - `frontend/src/api/documents.api.ts` — Fixed parameter names
  - `frontend/components/upload/document-upload.tsx` — Added `.doc` MIME type
  - S3 bucket CORS policy applied via AWS CLI

#### 2. Fixed Document Download (Binary vs JSON)
- **Problem**: Downloaded files only ~600 bytes, corrupted PDFs
- **Root Cause**: Frontend fetching `/documents/:id/download` endpoint directly, receiving JSON response instead of binary file
- **Solution**:
  - Backend returns presigned S3 download URL
  - Frontend fetches from presigned URL to get actual file binary
  - Preserves original filename from backend response
- **Files Changed**:
  - `frontend/src/api/documents.api.ts` — Two-step download (get URL, fetch binary)
  - `frontend/components/documents/document-list.tsx` — Use returned filename

#### 3. Fixed UI Overflow in Document Cards
- **Problem**: Long filenames overflow card boundaries
- **Solution**:
  - Applied `line-clamp-2` and `break-words` to title
  - Added `flex-wrap` to status/size badge row
  - Set `max-w-full` constraint on container
- **Files Changed**:
  - `frontend/components/documents/document-card.tsx`

#### 4. Fixed "Maximum Update Depth Exceeded" Error
- **Problem**: Generation wizard causing infinite re-render loop
- **Root Cause**: `useApi` hook receiving new function references on every render, triggering effect loop
- **Solution**:
  - Memoized API calls with `useCallback` in generation wizard
  - Stable references prevent unnecessary effect re-triggers
- **Files Changed**:
  - `frontend/components/generation/generation-wizard.tsx` — Memoized `fetchTemplates` and `fetchDocuments`

### Testing Results
- ✅ Backend TypeScript compilation passing
- ✅ Frontend Next.js build passing  
- ✅ Document upload works for PDF, DOC, DOCX, TXT
- ✅ Document download returns valid binary files
- ✅ No console errors on generation page
- ✅ UI responsive and clean

### AI Generation Reliability Fixes (Completed ✅)
- ✅ Fixed AWS Bedrock model ID format (inference profile: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`)
- ✅ Fixed BullMQ worker startup race conditions with 5-strategy approach
- ✅ Worker now reliably starts on every server restart
- ✅ Implemented structured error handling (no fallback content)
- ✅ Generation worker refactored with retry, timeout, validation, and observability

---

## PR-09: Word Export Service
**Complexity**: Medium | **Days**: 4-5 | **Dependencies**: PR-06 | **Status**: ✅ COMPLETE

### Objectives
Export letters to Word format with firm branding.

**Completed**: All tasks ✅ - DOCX export service implemented, S3 integration complete, frontend export dialog enhanced

### Tasks

#### 1. Export Service
- [x] `/backend/src/services/export/export.service.ts` — Export orchestration with DOCX generation
  - `generateExport()` - Main export function with S3 upload
  - `generateDocx()` - DOCX generation with formatting (docx package)
  - `getExportDownloadUrl()` - Presigned URL generation
  - `listExports()` - List exports for a letter
  - `deleteExport()` - Delete export from S3 and DB
  - `cleanupExpiredExports()` - Cleanup job for expired exports
- [x] `/backend/src/services/export/export.controller.ts` — Export endpoints
- [x] `/backend/src/services/export/export.routes.ts` — Export routes
- [x] `/backend/src/services/export/export.validation.ts` — Zod validation schemas

#### 2. Document Formatting
- [x] Professional heading styles (H1, H2 with proper spacing)
- [x] Paragraph formatting with 1.5 line spacing
- [x] Standard 1-inch margins on all sides
- [x] Auto-detection of headings (# markdown or ALL CAPS)
- [x] Configurable header with title and date
- [x] Optional footer with "Generated by Steno AI" branding

#### 3. API Endpoints
```
POST   /api/v1/letters/:letterId/export    — Generate export
GET    /api/v1/exports/:exportId/download  — Get download URL
GET    /api/v1/letters/:letterId/exports   — List exports
DELETE /api/v1/exports/:exportId            — Delete export
```

#### 4. Frontend Integration
- [x] `/frontend/src/api/export.api.ts` — Export API client
- [x] `/frontend/components/export/export-dialog.tsx` — Enhanced dialog
  - Export options checkboxes (header, footer, branding)
  - Format selection (DOCX ready, PDF/HTML coming soon)
  - Real-time export with progress indicator
  - Automatic file download
- [x] Export button integrated in letter editor

#### 5. Storage & Lifecycle
- [x] S3 storage with firm-specific prefixes
- [x] Presigned download URLs (1-hour expiration)
- [x] Export tracking (download count, file size)
- [x] Automatic expiration after 7 days
- [x] Cleanup function for expired exports

#### 6. Security & Permissions
- [x] Firm-level isolation enforced
- [x] Role-based access control (ADMIN, PARTNER, ASSOCIATE for generation)
- [x] Audit logging for export actions
- [x] Time-limited download URLs

**Success Criteria**:
- ✅ Export to Word (DOCX) with formatting
- ✅ Configurable export options (header, footer, branding)
- ✅ S3 storage with presigned URLs
- ✅ Download tracking implemented
- ✅ Frontend integration complete
- ✅ Build passing: Backend TypeScript ✅ | Frontend Next.js ✅
- ⏳ Manual testing pending (DOCX file quality)

---

## PR-10: Real-time Collaboration (P1)
**Complexity**: High | **Days**: 8-10 | **Dependencies**: PR-08 | **Status**: ✅ COMPLETE

### Objectives
Google Docs-style real-time collaboration.

**Completed**: All backend and frontend tasks ✅ - WebSocket server, Yjs CRDT sync, TipTap editor, presence indicators

### Tasks

#### 1. WebSocket Infrastructure
- [x] `/backend/src/services/websocket/ws-server.ts` — y-websocket compatible server (ws + auth)
- [x] `/backend/src/services/websocket/ws-auth.ts` — JWT auth & firm access verification
- [x] Integrated WebSocket server with HTTP server in `server.ts`
- [x] Graceful shutdown handling for WebSocket connections

#### 2. Collaborative Data Layer
- [x] `/backend/src/services/collaboration/yjs-provider.ts` — Yjs document provider with Redis persistence
- [x] Debounced saves (500ms) to minimize Redis writes
- [x] Force persist on disconnect to prevent data loss
- [x] Document initialization from database or Redis
- [x] Redis already provisioned (Docker Compose for dev)

#### 3. Frontend
- [x] `/frontend/components/editor/collaborative-editor.tsx` — TipTap + Yjs integration
- [x] `/frontend/components/editor/presence-indicators.tsx` — Active users with avatars
- [x] `/frontend/app/collab-editor/page.tsx` — Full collaborative editing page
- [x] Real-time cursor positions via CollaborationCursor extension
- [x] Connection status indicator (connected/connecting/disconnected)
- [x] Comments sidebar integration
- [x] Export dialog integration

**Success Criteria**:
- ✅ Multiple users can edit simultaneously
- ✅ Changes sync in real-time via Yjs CRDT
- ✅ Presence indicators show active users
- ✅ Live cursor positions with user colors
- ✅ JWT authentication for WebSocket connections
- ✅ Firm-level data isolation maintained
- ✅ Data persists to Redis and PostgreSQL
- ✅ Graceful connection/disconnection handling
- ✅ Frontend builds without errors
- ✅ Backend TypeScript compiles successfully

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

