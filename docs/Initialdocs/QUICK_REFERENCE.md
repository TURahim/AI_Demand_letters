# Demand Letter Generator - Quick Reference Guide

## 🎯 Project At A Glance

**Timeline:** 3-5 months (75-105 dev days)  
**Team Size:** 2-3 developers  
**Stack:** React + Tailwind + Node.js + Python + AWS + PostgreSQL

---

## 📊 PR Dependency Tree

```
Foundation Layer
├─ PR-01: Infrastructure Setup (3-5d) ──┬──> PR-03: Document Upload (4-5d)
│                                        ├──> PR-05: Templates (4-5d)
│                                        └──> PR-02: Auth (5-7d)
│
AI Layer
├─ PR-04: Bedrock Integration (6-8d) ───┴──> PR-06: Generation Engine (7-9d)
│
UI Foundation
└─ PR-07: Design System (3-4d) ─────────┬──> PR-08: Upload UI (4-5d)
                                         ├──> PR-09: Template UI (5-6d)
                                         └──> PR-10: Editor UI (7-9d)

Export & Collaboration
├─ PR-11: Word Export (4-5d)
└─ PR-12: Real-time Collab (8-10d) [P1]

Polish & Launch
├─ PR-13: Dashboard (4-5d)
├─ PR-14: Testing Suite (5-7d)
└─ PR-15: Performance (4-6d)
```

---

## 🏗️ Project Structure

```
Steno-AI/
│
├─ frontend/                    # Next.js 16 Application (✅ COMPLETE)
│  ├─ app/                      # Next.js App Router
│  │  ├─ layout.tsx             # Root layout with metadata
│  │  ├─ page.tsx               # Landing page
│  │  ├─ globals.css            # Global styles & design tokens
│  │  ├─ dashboard/page.tsx     # Dashboard page
│  │  ├─ documents/page.tsx     # Document library
│  │  ├─ upload/page.tsx        # Upload interface
│  │  ├─ templates/page.tsx     # Template management
│  │  ├─ generation/page.tsx    # Letter generation wizard
│  │  ├─ editor/page.tsx        # Letter editor
│  │  ├─ letters/page.tsx       # Letters library
│  │  ├─ analytics/page.tsx     # Analytics dashboard
│  │  ├─ settings/page.tsx      # User settings
│  │  └─ auth/
│  │      ├─ login/page.tsx     # Login page
│  │      └─ signup/page.tsx    # Signup page
│  │
│  ├─ components/
│  │  ├─ ui/                    # Shadcn components (gold/teal themed)
│  │  │  ├─ button.tsx
│  │  │  ├─ card.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ dialog.tsx
│  │  │  └─ [40+ UI components]
│  │  │
│  │  ├─ layout/                # Layout components
│  │  │  ├─ app-layout.tsx      # Main app wrapper
│  │  │  ├─ header.tsx          # Top navigation
│  │  │  ├─ sidebar.tsx         # Navigation sidebar
│  │  │  └─ footer.tsx          # Footer
│  │  │
│  │  ├─ dashboard/             # Dashboard components
│  │  │  ├─ stats-card.tsx
│  │  │  ├─ activity-feed.tsx
│  │  │  ├─ usage-chart.tsx
│  │  │  └─ quick-actions.tsx
│  │  │
│  │  ├─ upload/                # Upload components
│  │  │  └─ document-upload.tsx
│  │  │
│  │  ├─ templates/             # Template components
│  │  │  └─ template-editor.tsx
│  │  │
│  │  ├─ editor/                # Editor components
│  │  │  └─ letter-editor.tsx
│  │  │
│  │  ├─ generation/            # Generation components
│  │  │  └─ generation-wizard.tsx
│  │  │
│  │  ├─ documents/             # Document components (stub)
│  │  ├─ letters/               # Letter components (stub)
│  │  ├─ export/                # Export components (stub)
│  │  ├─ collaboration/         # Collaboration (stub)
│  │  └─ theme-provider.tsx     # Dark mode provider
│  │
│  ├─ lib/                      # Utilities
│  │  └─ utils.ts               # cn() helper for classnames
│  │
│  ├─ src/                      # Additional source files
│  │  ├─ api/                   # API clients (ready for backend)
│  │  ├─ hooks/                 # Custom hooks
│  │  │  ├─ use-mobile.ts
│  │  │  └─ use-toast.ts
│  │  ├─ store/                 # Redux store (ready to implement)
│  │  ├─ styles/                # Additional styles
│  │  │  └─ globals.css
│  │  └─ utils/
│  │      └─ utils.ts
│  │
│  ├─ public/                   # Static assets
│  │  ├─ placeholder.svg
│  │  ├─ placeholder-logo.svg
│  │  ├─ placeholder-user.jpg
│  │  └─ [icon files]
│  │
│  ├─ tests/                    # Frontend tests
│  │  ├─ components/
│  │  ├─ hooks/
│  │  └─ integration/
│  │
│  ├─ package.json              # Dependencies (Next.js 16, React 19)
│  ├─ tsconfig.json             # TypeScript config
│  ├─ next.config.mjs           # Next.js config
│  ├─ postcss.config.mjs        # PostCSS config
│  ├─ components.json           # Shadcn config
│  └─ FrontendREADME.md         # Frontend documentation
│
├─ backend/                     # Node.js/Python Services
│  ├─ services/
│  │  ├─ auth/                # Authentication & JWT
│  │  ├─ users/               # User management
│  │  ├─ firms/               # Firm management
│  │  ├─ upload/              # S3 upload handling
│  │  ├─ documents/           # Document CRUD
│  │  ├─ processing/          # PDF/DOCX parsing
│  │  ├─ templates/           # Template management
│  │  ├─ ai/                  # Bedrock integration & prompts
│  │  ├─ generation/          # Letter generation orchestration
│  │  ├─ letters/             # Letter CRUD & versions
│  │  ├─ export/              # Word export generation
│  │  ├─ collaboration/       # OT engine & WebSocket
│  │  ├─ analytics/           # Usage statistics
│  │  ├─ websocket/           # WebSocket server
│  │  ├─ queue/               # Job queue (Bull/SQS)
│  │  ├─ cache/               # Redis caching
│  │  └─ monitoring/          # APM & logging
│  │
│  ├─ middleware/             # Express middleware
│  ├─ routes/                 # API routes
│  ├─ database/
│  │  ├─ migrations/          # SQL migrations
│  │  ├─ seeds/               # Seed data
│  │  └─ schema.prisma        # Prisma schema
│  │
│  ├─ config/                 # Configuration files
│  ├─ utils/                  # Utility functions
│  └─ tests/                  # Backend tests
│
├─ infra/                       # Infrastructure as Code
│  └─ terraform/
│     ├─ main.tf              # Core AWS resources
│     ├─ rds.tf               # PostgreSQL
│     ├─ bedrock.tf           # AI model config
│     ├─ cloudfront.tf        # CDN
│     └─ env/                 # Environment configs
│
├─ e2e/                        # End-to-end tests
│  ├─ tests/                  # Playwright/Cypress tests
│  └─ fixtures/               # Test data
│
└─ docs/                       # Documentation
   ├─ API_REFERENCE.md
   ├─ INFRASTRUCTURE.md
   ├─ DATABASE_SCHEMA.md
   ├─ TESTING.md
   └─ USER_GUIDE.md
```

---

## 🎨 Design System Quick Reference

### Colors
```css
--brand-gold:    #A18050  /* Primary buttons, accents, links */
--brand-teal:    #193D3D  /* Secondary, headers, footer */
--brand-purple:  #7848DF  /* Hover states */
--brand-paper:   #EFF2E9  /* Light backgrounds */
```

### Typography
- **Headings:** Editor (serif)
- **Body:** Apercu (sans-serif)
- **Sizes:** Scale proportionally on mobile

### Components
- **Buttons:** Pill-shaped (rounded-full), gold/teal/purple
- **Cards:** 10px border radius, soft shadows
- **Forms:** Gold-bordered inputs, light paper background
- **Header:** Fixed, white, gold underline, noise texture
- **Footer:** Deep teal (#193D3D), gold top border, white text

### Spacing
- Generous white space
- Padding reduces ~25% on mobile
- Rounded corners throughout

---

## 🔑 Key API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/me
```

### Documents
```
POST   /api/upload/presigned-url
POST   /api/upload/complete
GET    /api/documents
GET    /api/documents/:id/download
```

### Templates
```
GET    /api/templates
POST   /api/templates
PUT    /api/templates/:id
GET    /api/templates/:id/versions
```

### Generation
```
POST   /api/generation/start
GET    /api/generation/:id/status
POST   /api/generation/:id/refine
```

### Letters
```
GET    /api/letters
GET    /api/letters/:id
PUT    /api/letters/:id
GET    /api/letters/:id/versions
```

### Export
```
POST   /api/export/:letterId/word
GET    /api/export/:exportId/download
```

### AI
```
POST   /api/ai/generate
POST   /api/ai/refine
POST   /api/ai/analyze-documents
```

---

## 📦 Tech Stack Details

### Frontend
| Technology | Purpose | Notes |
|------------|---------|-------|
| Next.js 16 | Framework | App Router, React 19 |
| React 19 | UI Framework | With TypeScript |
| Tailwind CSS v4 | Styling | Custom design tokens (oklch) |
| Shadcn/ui | Components | Customized for brand (✅) |
| Redux Toolkit | State Management | Ready to implement |
| TipTap | Rich Text Editor | Ready for collaboration |
| React Hook Form | Forms | With Zod validation |
| Recharts | Charts | For analytics (✅) |
| Lucide React | Icons | Icon library (✅) |
| Vercel Analytics | Analytics | Built-in (✅) |

### Backend
| Technology | Purpose | Notes |
|------------|---------|-------|
| Node.js | Runtime | v18+ |
| Express | Web Framework | REST APIs |
| Prisma | ORM | PostgreSQL |
| AWS SDK | Cloud Services | S3, Bedrock, Lambda |
| Socket.io | WebSockets | Real-time collab |
| Bull | Job Queue | Background tasks |
| Redis | Cache | Session & data |
| JWT | Authentication | Secure tokens |

### Infrastructure
| Service | Purpose | Configuration |
|---------|---------|---------------|
| AWS Lambda | Serverless compute | Node.js runtime |
| AWS S3 | Object storage | Documents, templates |
| AWS Bedrock | AI/ML | Claude 3.5 Sonnet |
| AWS RDS | Database | PostgreSQL 15 |
| AWS API Gateway | API management | REST + WebSocket |
| CloudFront | CDN | Static assets |
| CloudWatch | Monitoring | Logs & metrics |

---

## 🧪 Testing Strategy

### Coverage Goals
- **Unit Tests:** 80%+ coverage
- **Integration Tests:** All API endpoints
- **E2E Tests:** Critical user flows
- **Performance Tests:** Sub-2s API responses

### Test Files
```
backend/tests/
├─ unit/              # Service & utility tests
├─ integration/       # API endpoint tests
├─ performance/       # Load tests (k6)
└─ fixtures/          # Test data

frontend/tests/
├─ components/        # Component tests
├─ hooks/            # Hook tests
└─ integration/      # Feature integration

e2e/tests/
├─ auth.spec.ts
├─ upload.spec.ts
├─ generation.spec.ts
└─ collaboration.spec.ts
```

---

## 🚀 Development Commands

### Backend
```bash
# Development
npm run dev              # Start dev server
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm test                 # Run tests
npm run test:watch       # Watch mode

# Production
npm run build
npm start
```

### Frontend
```bash
# Development (using pnpm)
pnpm dev                 # Start Next.js dev server
pnpm build               # Build for production
pnpm start               # Start production server
pnpm lint                # Run ESLint

# Or with npm
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
```

### Infrastructure
```bash
# Terraform
cd infra/terraform
terraform init
terraform plan
terraform apply
terraform destroy
```

### E2E Tests
```bash
# Playwright
npx playwright test
npx playwright test --ui      # UI mode
npx playwright test --debug   # Debug mode
```

---

## 🔐 Security Checklist

### Must-Have Security Measures
- [ ] HTTPS everywhere
- [ ] JWT token expiry (15min access, 7d refresh)
- [ ] Password hashing (bcrypt, 10+ rounds)
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize inputs)
- [ ] CSRF protection
- [ ] Firm-level data isolation
- [ ] File upload validation (type, size)
- [ ] Virus scanning on uploads
- [ ] Secure S3 bucket policies
- [ ] Environment variable security
- [ ] API key rotation
- [ ] Audit logging

---

## 📈 Performance Targets

### Backend
- API response time: **< 2 seconds**
- Database queries: **< 500ms**
- File upload: **< 5s for 10MB**
- AI generation: **< 30s for draft**
- Concurrent users: **100+ without degradation**

### Frontend
- First Contentful Paint: **< 1.5s**
- Time to Interactive: **< 3s**
- Largest Contentful Paint: **< 2.5s**
- Bundle size: **< 500KB (gzipped)**

### Database
- Connection pool: **10-20 connections**
- Query timeout: **10 seconds**
- Index coverage: **95%+ queries**

---

## 🎯 Success Metrics (from PRD)

### Business Goals
- [ ] **50%+ reduction** in time to draft demand letters
- [ ] **80%+ user adoption** within first year
- [ ] **Increased client satisfaction** (survey-based)
- [ ] **New sales leads** from AI innovation

### Technical KPIs
- [ ] System uptime: **99.5%+**
- [ ] API error rate: **< 1%**
- [ ] Test coverage: **80%+**
- [ ] Performance budget: **All targets met**
- [ ] Zero critical security vulnerabilities

---

## 🐛 Common Troubleshooting

### Issue: Database connection fails
**Solution:** Check DATABASE_URL, ensure PostgreSQL running, verify network access

### Issue: S3 upload fails
**Solution:** Verify AWS credentials, check bucket permissions, ensure correct region

### Issue: Bedrock API errors
**Solution:** Check AWS region, verify model access, check token limits

### Issue: WebSocket connection drops
**Solution:** Check CORS settings, verify WS URL, check nginx/proxy config

### Issue: Slow AI generation
**Solution:** Optimize context size, check token limits, verify network latency

---

## 📞 Support & Resources

### Documentation Links
- [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [TipTap Editor](https://tiptap.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### Internal Docs
- API Reference: `/docs/API_REFERENCE.md`
- Architecture: `/docs/INFRASTRUCTURE.md`
- Database Schema: `/docs/DATABASE_SCHEMA.md`
- Testing Guide: `/docs/TESTING.md`

---

**Last Updated:** [Date]  
**Version:** 1.0.0
