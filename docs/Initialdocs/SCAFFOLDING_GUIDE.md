# Project Scaffolding Guide - Steno Demand Letter Generator

Complete step-by-step guide for backend setup and infrastructure.

> **Note**: Frontend is ✅ **COMPLETE** using Next.js 16. This guide focuses on backend scaffolding.

---

## 📊 Current Project Status

| Component | Status | Technology |
|-----------|--------|------------|
| Frontend | ✅ Complete | Next.js 16, React 19, Tailwind v4 |
| Design System | ✅ Complete | shadcn/ui with custom theming |
| Backend | ⏳ Not Started | Node.js + Express + TypeScript |
| Database | ⏳ Not Started | PostgreSQL + Prisma |
| Infrastructure | ⏳ Not Started | AWS (Terraform) |
| AI Integration | ⏳ Not Started | AWS Bedrock |

See [ENGINEERING_ROADMAP.md](./ENGINEERING_ROADMAP.md) for complete task breakdown.

---

## 📋 Prerequisites

```bash
# Verify installations
node --version    # Should be 18+
npm --version     # or pnpm
git --version
psql --version    # PostgreSQL 15+
terraform --version
docker --version  # For local development
aws --version     # AWS CLI
```

---

## 🏗️ Step 1: Verify Project Root & Setup Git

```bash
# Navigate to existing project
cd /path/to/Steno-AI  # Use your actual path

# Verify frontend exists
ls frontend/  # Should show app/, components/, lib/, etc.

# Check current structure
ls -la  # Should show: docs/, frontend/, (no backend yet)

# Initialize git if not already done
git init
git branch -M main

# Create root .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/
playwright-report/
test-results/

# Production
dist/
build/
.next/
out/

# Environment variables
.env
.env.local
.env.*.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Terraform
**/.terraform/*
*.tfstate
*.tfstate.*
*.tfvars
.terraform.lock.hcl

# AWS
.aws/

# Misc
.cache/
tmp/
temp/
*.pid
*.seed
*.pid.lock
EOF
```

---

## 🎨 Step 2: Frontend Verification (Already Complete ✅)

> **Frontend is complete!** It uses Next.js 16 with App Router, React 19, and Tailwind CSS v4.

### Verify Frontend Structure

```bash
cd frontend

# Verify Next.js configuration
cat package.json | grep "next"  # Should show "next": "16.0.0"

# Check pages exist
ls app/  # Should show: dashboard, documents, upload, templates, generation, editor, letters, analytics, settings, auth

# Check components
ls components/  # Should show: ui, layout, dashboard, upload, templates, editor, generation, etc.

# Verify it runs
pnpm dev  # or npm run dev
# Should start on http://localhost:3000

cd ..
```

### Frontend Environment Setup

If not already configured, create `.env.local`:

```bash
cat > frontend/.env.local << 'EOF'
# API Configuration (will connect to backend on port 3001)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# App Configuration
NEXT_PUBLIC_APP_NAME=Steno Demand Letter Generator
NEXT_PUBLIC_ENVIRONMENT=development
EOF
```

### Frontend Tech Stack (Pre-installed)

- ✅ Next.js 16 with App Router
- ✅ React 19 with TypeScript
- ✅ Tailwind CSS v4 (oklch color space)
- ✅ shadcn/ui components (40+ components)
- ✅ React Hook Form + Zod validation
- ✅ Recharts for analytics
- ✅ Lucide React icons
- ✅ Vercel Analytics
- ✅ Custom brand colors (Gold #A18050, Teal #193D3D, Purple #7848DF)

### ⚠️ Frontend Path Alias Configuration

The frontend uses TypeScript path aliases (`@/*`) that map to both `./src/*` and `./*`. This configuration in `tsconfig.json` allows imports like:

```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
```

**Important**: The helper utility `cn()` exists at `frontend/lib/utils.ts`. If you encounter module resolution errors, verify:

1. `frontend/lib/utils.ts` exists
2. `tsconfig.json` has paths configured:
   ```json
   "paths": {
     "@/*": ["./src/*", "./*"]
   }
   ```

**Skip to Step 3 for backend setup.**

---

## ⚙️ Step 3: Backend Setup (Node.js + Express)

```bash
# Create backend directory
mkdir backend
cd backend

# Initialize Node project
npm init -y

# Install Express and core dependencies
npm install express cors helmet morgan dotenv
npm install @prisma/client aws-sdk jsonwebtoken bcrypt joi
npm install express-rate-limit express-validator multer

# Install WebSocket
npm install socket.io

# Install job queue
npm install bull ioredis

# Install dev dependencies
npm install -D typescript @types/node @types/express @types/bcrypt \
  @types/jsonwebtoken @types/cors @types/morgan nodemon ts-node \
  prisma jest @types/jest ts-jest supertest @types/supertest

# Initialize TypeScript
npx tsc --init

# Create directory structure
mkdir -p src/{services/{auth,users,firms,upload,documents,processing,templates,ai,generation,letters,export,collaboration,websocket,queue,cache,monitoring},middleware,routes,config,utils,tests/{unit,integration,fixtures}}

mkdir -p src/services/{auth,users,firms,upload,documents,processing,templates,ai,generation,letters,export,collaboration,websocket,queue,cache,monitoring}
mkdir -p src/{middleware,routes,config,utils}
mkdir -p src/tests/{unit,integration,fixtures}
mkdir -p database/{migrations,seeds}

cd ..
```

### Configure TypeScript (backend/tsconfig.json)

```bash
cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node", "jest"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF
```

### Update package.json scripts (backend/package.json)

```bash
cat > backend/package.json << 'EOF'
{
  "name": "steno-backend",
  "version": "1.0.0",
  "description": "Backend for Steno Demand Letter Generator",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "db:seed": "ts-node database/seeds/seed.ts"
  },
  "keywords": ["legal", "ai", "demand-letters"],
  "author": "Steno",
  "license": "PROPRIETARY"
}
EOF
```

### Create nodemon config (backend/nodemon.json)

```bash
cat > backend/nodemon.json << 'EOF'
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.test.ts"],
  "exec": "ts-node src/index.ts"
}
EOF
```

### Environment file (backend/.env.example)

```bash
cat > backend/.env.example << 'EOF'
# Server
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/steno_demand_letters

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_DOCUMENTS=steno-documents-dev
AWS_S3_BUCKET_TEMPLATES=steno-templates-dev
AWS_S3_BUCKET_EXPORTS=steno-exports-dev
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

cp backend/.env.example backend/.env
```

### Create basic server (backend/src/index.ts)

```bash
cat > backend/src/index.ts << 'EOF'
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes will be added here
app.use('/api/v1', (req: Request, res: Response) => {
  res.json({ message: 'API v1 endpoint' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

export default app;
EOF
```

---

## 🗄️ Step 4: Database Setup (Prisma + PostgreSQL)

```bash
cd backend

# Initialize Prisma
npx prisma init

# This creates:
# - prisma/schema.prisma
# - .env (if not exists)
```

### Update Prisma schema (backend/prisma/schema.prisma)

```bash
# Copy the full schema from DATABASE_SCHEMA.md
# For now, create a minimal version:

cat > backend/prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Firm {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @db.VarChar(255)
  email     String?  @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  users     User[]

  @@map("firms")
}

model User {
  id           String   @id @default(uuid()) @db.Uuid
  firmId       String   @map("firm_id") @db.Uuid
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  firstName    String?  @map("first_name") @db.VarChar(100)
  lastName     String?  @map("last_name") @db.VarChar(100)
  role         String   @default("attorney") @db.VarChar(50)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  firm         Firm     @relation(fields: [firmId], references: [id], onDelete: Cascade)

  @@index([firmId])
  @@index([email])
  @@map("users")
}
EOF

cd ..
```

### Create Docker Compose for local development

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: steno-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: steno_demand_letters
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: steno-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF
```

---

## 🏗️ Step 5: Infrastructure Setup (Terraform)

```bash
# Create infrastructure directory
mkdir -p infra/terraform/modules
cd infra/terraform

# Create main files
touch main.tf variables.tf outputs.tf providers.tf
touch rds.tf s3.tf lambda.tf api-gateway.tf bedrock.tf cloudfront.tf

cd ../..
```

### Create Terraform provider (infra/terraform/providers.tf)

```bash
cat > infra/terraform/providers.tf << 'EOF'
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # bucket = "steno-terraform-state"
    # key    = "demand-letters/terraform.tfstate"
    # region = "us-east-1"
    # Uncomment and configure when ready
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Steno Demand Letter Generator"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
EOF
```

### Create basic variables (infra/terraform/variables.tf)

```bash
cat > infra/terraform/variables.tf << 'EOF'
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "steno-demand-letters"
}
EOF
```

---

## 📁 Step 6: GitHub Configuration

```bash
# Create .github directory structure
mkdir -p .github/{workflows,ISSUE_TEMPLATE}

# Create PR template
cat > .github/pull_request_template.md << 'EOF'
## PR-[NUMBER]: [Title]

### 📋 Description
Brief description of changes

### 🎯 Related Issue
Closes #

### 🔨 Changes Made
- [ ] Change 1
- [ ] Change 2

### 🧪 Testing
- [ ] All tests passing
- [ ] Manual testing completed

### ✅ Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Ready to merge
EOF
```

---

## 📚 Step 7: Documentation

```bash
# Create docs directory
mkdir -p docs

# Create README
cat > README.md << 'EOF'
# Steno Demand Letter Generator

AI-powered demand letter generation platform for law firms.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- AWS Account

### Development Setup

1. Clone the repository
\`\`\`bash
git clone <repo-url>
cd steno-demand-letter-generator
\`\`\`

2. Install dependencies
\`\`\`bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
\`\`\`

3. Start database
\`\`\`bash
docker-compose up -d
\`\`\`

4. Setup database
\`\`\`bash
cd backend
npx prisma migrate dev
npx prisma generate
\`\`\`

5. Start development servers
\`\`\`bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
\`\`\`

## Project Structure

See [ENGINEERING_ROADMAP.md](docs/Initialdocs/ENGINEERING_ROADMAP.md) for complete PR breakdown.

## Documentation

- [Engineering Roadmap](docs/Initialdocs/ENGINEERING_ROADMAP.md)
- [Quick Reference](docs/Initialdocs/QUICK_REFERENCE.md)
- [Database Schema](docs/Initialdocs/Databaseschema.md)
- [Product Requirements](docs/Initialdocs/PRD.md)
- [Frontend README](frontend/FrontendREADME.md)

## License

Proprietary - Steno
EOF

# Create basic contributing guide
cat > CONTRIBUTING.md << 'EOF'
# Contributing Guidelines

## Branch Naming
- feature/pr-XX-description
- bugfix/pr-XX-description
- hotfix/description

## Commit Messages
Follow Conventional Commits:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- test: Tests
- chore: Maintenance

## Pull Requests
1. Create branch from main
2. Make changes
3. Add tests
4. Submit PR with template
5. Wait for review
EOF
```

---

## 🧪 Step 8: Testing Setup

```bash
# Backend testing setup
cd backend

# Create Jest config
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
EOF

cd ..

# Frontend testing setup
cd frontend

cat > vitest.config.ts << 'EOF'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
EOF

cd ..
```

---

## 🎯 Step 9: Initialize Git and First Commit

```bash
# Make sure you're in the project root
cd /path/to/steno-demand-letter-generator

# Stage all files
git add .

# Create initial commit
git commit -m "chore: initial project scaffolding

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Node.js + Express + TypeScript + Prisma
- Infrastructure: Terraform + Docker Compose
- Database: PostgreSQL + Redis
- Testing: Jest + Vitest
- Documentation: Complete setup guides"

# Create develop branch
git checkout -b develop

# Push to remote (after creating repo)
# git remote add origin <your-repo-url>
# git push -u origin main
# git push -u origin develop
```

---

## ✅ Step 10: Verify Setup

```bash
# Start Docker services
docker-compose up -d

# Wait for services to be ready
sleep 5

# Check PostgreSQL
docker exec steno-postgres pg_isready

# Check Redis
docker exec steno-redis redis-cli ping

# Generate Prisma client
cd backend
npx prisma generate

# Try to start backend
npm run dev &
BACKEND_PID=$!
sleep 3

# Check if backend is running
curl http://localhost:3001/health

# Kill backend
kill $BACKEND_PID

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!
sleep 3

# Kill frontend
kill $FRONTEND_PID

echo "✅ All services verified!"
```

---

## 📦 Complete File Structure

```
Steno-AI/
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── frontend/                    # ✅ COMPLETE (Next.js 16)
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── dashboard/
│   │   ├── documents/
│   │   ├── upload/
│   │   ├── templates/
│   │   ├── generation/
│   │   ├── editor/
│   │   ├── letters/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── auth/
│   ├── components/
│   │   ├── ui/                 # 40+ shadcn components
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── upload/
│   │   ├── templates/
│   │   ├── editor/
│   │   ├── generation/
│   │   ├── documents/
│   │   ├── letters/
│   │   ├── collaboration/
│   │   └── export/
│   ├── lib/
│   ├── src/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── utils/
│   ├── public/
│   ├── tests/
│   ├── .env.local
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   └── components.json
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── firms/
│   │   │   ├── upload/
│   │   │   ├── documents/
│   │   │   ├── processing/
│   │   │   ├── templates/
│   │   │   ├── ai/
│   │   │   ├── generation/
│   │   │   ├── letters/
│   │   │   ├── export/
│   │   │   ├── collaboration/
│   │   │   ├── websocket/
│   │   │   ├── queue/
│   │   │   ├── cache/
│   │   │   └── monitoring/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── config/
│   │   ├── utils/
│   │   ├── tests/
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── nodemon.json
├── infra/
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── providers.tf
│       ├── rds.tf
│       ├── s3.tf
│       ├── lambda.tf
│       ├── api-gateway.tf
│       ├── bedrock.tf
│       └── cloudfront.tf
├── docs/
│   ├── ENGINEERING_TASK_LIST.md
│   ├── QUICK_REFERENCE.md
│   ├── DATABASE_SCHEMA.md
│   └── GITHUB_TEMPLATES.md
├── docker-compose.yml
├── .gitignore
├── README.md
└── CONTRIBUTING.md
```

---

## 🚀 Next Steps

1. **Frontend is ready!** ✅ No additional setup needed.

2. **Setup AWS credentials** (for backend):
```bash
aws configure
```

3. **Run initial Prisma migration** (after backend setup):
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

4. **Start development**:
```bash
# Terminal 1 - Infrastructure
docker-compose up -d

# Terminal 2 - Backend (after PR-01 complete)
cd backend && npm run dev
# Backend will run on http://localhost:3001

# Terminal 3 - Frontend
cd frontend && pnpm dev
# Frontend will run on http://localhost:3000
```

5. **Follow the Engineering Roadmap**:
   - Start with [PR-01: Infrastructure & Database Setup](./ENGINEERING_ROADMAP.md#pr-01-infrastructure--database-setup)
   - Progress through PR-02 (Auth), PR-03 (Upload), etc.
   - See [ENGINEERING_ROADMAP.md](./ENGINEERING_ROADMAP.md) for complete task breakdown

---

## 💡 Tips

1. **Follow the roadmap**: Use [ENGINEERING_ROADMAP.md](./ENGINEERING_ROADMAP.md) sequentially (PR-01 → PR-13)
2. **Frontend is done**: Focus on backend implementation
3. **Test as you go**: Run tests frequently (80%+ coverage goal)
4. **Commit often**: Small, atomic commits following Conventional Commits
5. **Use branches**: One branch per PR (e.g., `feature/pr-01-infrastructure`)
6. **Document changes**: Update docs when you add features
7. **API-first**: Design endpoints before implementing logic
8. **Security-first**: Add auth middleware early

---

## 🆘 Troubleshooting

### Frontend: Module not found errors

**Error**: `Module not found: Can't resolve '@/lib/utils'`

**Solution**:
```bash
cd frontend

# Verify lib/utils.ts exists
ls lib/utils.ts

# If missing, create it
mkdir -p lib
cat > lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF

# Verify tsconfig.json paths
cat tsconfig.json | grep -A 3 "paths"
# Should show: "@/*": ["./src/*", "./*"]

# Restart dev server
pnpm dev
```

### Port already in use
```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

### Frontend: Dependencies missing
```bash
cd frontend

# Check if node_modules exists
ls node_modules

# If missing or incomplete, reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Restart dev server
pnpm dev
```

### Database connection issues
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
cd backend
cat .env | grep DATABASE_URL
```

### Prisma issues
```bash
# Reset database
cd backend
npx prisma migrate reset

# Regenerate client
npx prisma generate

# Check Prisma studio
npx prisma studio
```

### Next.js build errors
```bash
cd frontend

# Clear Next.js cache
rm -rf .next

# Rebuild
pnpm build

# If dev mode has issues
pnpm dev
```

---

## 📊 Summary

### ✅ What's Complete
- **Frontend**: Fully functional Next.js 16 application
  - All pages implemented (dashboard, documents, templates, generation, editor, etc.)
  - 40+ shadcn/ui components with custom theming
  - Design system with brand colors (Gold, Teal, Purple)
  - Ready for backend API integration

### ⏳ What's Next
- **Backend**: Node.js + Express + TypeScript (Start with PR-01)
- **Database**: PostgreSQL + Prisma ORM
- **AI Integration**: AWS Bedrock (Claude 3.5 Sonnet)
- **Infrastructure**: AWS setup with Terraform
- **Testing**: Backend tests + E2E tests

### 🎯 Immediate Next Steps

1. **Complete scaffolding** by running Step 3 (Backend Setup) above
2. **Follow the roadmap**: [ENGINEERING_ROADMAP.md](./ENGINEERING_ROADMAP.md)
3. **Start with PR-01**: Infrastructure & Database Setup
4. **Connect frontend to backend APIs** in PR-07

---

**Ready to Begin!** 🚀

Frontend is complete. Backend scaffolding is outlined above. 
Follow the [Engineering Roadmap](./ENGINEERING_ROADMAP.md) for step-by-step implementation.
