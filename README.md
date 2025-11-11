# Steno AI - Demand Letter Generator

> 🚀 **Status:** Frontend Complete ✅ | Backend In Progress 🚧

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

Current Phase: **PR-01 - Infrastructure & Database Setup**

See [Engineering Roadmap](docs/Initialdocs/ENGINEERING_ROADMAP.md) for complete task breakdown.

### Completed ✅
- Frontend scaffolding (v0)
- Design system & UI components
- Page layouts & navigation
- Backend project structure
- Database schema
- Docker Compose setup
- CI/CD workflows

### In Progress 🚧
- Backend API implementation
- Authentication system
- Terraform infrastructure

### Upcoming 📅
- Document upload & storage
- AI integration (Bedrock)
- Template management
- Letter generation
- Export functionality
- Real-time collaboration
- Analytics & reporting

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
