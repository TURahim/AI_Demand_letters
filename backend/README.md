# Steno Backend API

Backend API for the Steno Demand Letter Generator platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 16+
- Redis 7+
- Docker and Docker Compose (for local development)

### Local Development

1. **Start infrastructure services:**

```bash
# From project root
docker-compose up -d
```

2. **Install dependencies:**

```bash
cd backend
npm install
```

3. **Set up environment variables:**

```bash
cp env.example .env
# Edit .env with your configuration
```

4. **Initialize database:**

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run db:seed
```

5. **Start development server:**

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   ├── middleware/          # Express middleware
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   │   ├── auth/           # Authentication
│   │   ├── security/       # Encryption & security
│   │   ├── monitoring/     # Metrics & error reporting
│   │   └── ...
│   ├── utils/              # Utility functions
│   ├── tests/              # Test files
│   │   ├── unit/          # Unit tests
│   │   ├── integration/   # Integration tests
│   │   └── fixtures/      # Test fixtures
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── prisma/
│   └── schema.prisma      # Database schema
├── database/
│   ├── migrations/        # Database migrations
│   └── seeds/            # Seed data
└── package.json
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Generate coverage report
npm test -- --coverage
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database

## 🔐 Environment Variables

See `env.example` for all available configuration options.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `AWS_*` - AWS credentials and configuration
- `REDIS_*` - Redis configuration

## 📚 API Documentation

API documentation will be available at `/api/v1/docs` (TODO: Add Swagger/OpenAPI).

## 🏗️ Architecture

- **Express** - Web framework
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM
- **AWS SDK** - S3, Bedrock, KMS integration
- **Winston** - Logging
- **Jest** - Testing
- **Bull** - Job queue (Redis-backed)

## 🔒 Security

- JWT authentication
- Field-level encryption with AWS KMS
- Audit logging for all operations
- Rate limiting
- Input validation with Zod
- Helmet security headers

## 🚢 Deployment

See `../infrastructure/terraform/README.md` for AWS deployment instructions.

## 📖 Further Reading

- [Engineering Roadmap](../docs/Initialdocs/ENGINEERING_ROADMAP.md)
- [Scaffolding Guide](../docs/Initialdocs/SCAFFOLDING_GUIDE.md)
- [Quick Reference](../docs/Initialdocs/QUICK_REFERENCE.md)

