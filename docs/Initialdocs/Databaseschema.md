# Database Schema - Steno Demand Letter Generator

Complete database schema design with SQL migrations and Prisma ORM configuration.

---

## 📊 Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│    Firms    │◄────────┤    Users    │         │  Documents   │
│             │ 1     * │             │ 1     * │              │
│  - id       │         │  - id       │────────►│  - id        │
│  - name     │         │  - email    │         │  - filename  │
│  - settings │         │  - firm_id  │         │  - s3_key    │
│  - logo_url │         │  - role     │         │  - user_id   │
└─────────────┘         │  - password │         │  - firm_id   │
      │                 └─────────────┘         │  - status    │
      │ 1                      │ 1              └──────────────┘
      │                        │
      │                        │
      │ *                      │ *
┌─────────────┐         ┌─────────────┐
│  Templates  │         │   Letters   │
│             │         │             │
│  - id       │         │  - id       │
│  - firm_id  │         │  - user_id  │
│  - name     │    ┌────┤  - firm_id  │
│  - content  │    │    │  - template_id
│  - variables│    │    │  - content  │
│  - created  │    │    │  - status   │
└─────────────┘    │    └─────────────┘
                   │           │ 1
                   │           │
                   │           │ *
                   │    ┌──────────────────┐
                   │    │ Letter_Versions  │
                   │    │                  │
                   │    │  - id            │
                   │    │  - letter_id     │
                   │    │  - version_num   │
                   │    │  - content       │
                   │    │  - created_by    │
                   │    │  - created_at    │
                   │    └──────────────────┘
                   │
                   │ *
           ┌───────────────────┐
           │ Letter_Documents  │
           │                   │
           │  - letter_id      │
           │  - document_id    │
           └───────────────────┘
```

---

## 🗄️ Complete Schema SQL

### Migration 001: Initial Schema

File: `backend/database/migrations/001_initial_schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FIRMS TABLE
-- ============================================================================
CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    logo_url TEXT,
    letterhead_template TEXT,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'standard',
    subscription_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_firms_name ON firms(name);
CREATE INDEX idx_firms_subscription ON firms(subscription_status);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'attorney',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('admin', 'attorney', 'paralegal', 'viewer'))
);

CREATE INDEX idx_users_firm_id ON users(firm_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    s3_key TEXT NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'uploaded',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('uploading', 'uploaded', 'processing', 'processed', 'error', 'deleted')),
    CONSTRAINT valid_file_type CHECK (file_type IN ('pdf', 'docx', 'txt', 'doc'))
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_firm_id ON documents(firm_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX idx_documents_s3_key ON documents(s3_key);

-- Full-text search index on extracted text
CREATE INDEX idx_documents_text_search ON documents USING gin(to_tsvector('english', extracted_text));

-- ============================================================================
-- TEMPLATES TABLE
-- ============================================================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    category VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT firm_or_default CHECK (
        (firm_id IS NOT NULL AND is_default = FALSE) OR 
        (firm_id IS NULL AND is_default = TRUE)
    )
);

CREATE INDEX idx_templates_firm_id ON templates(firm_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_default ON templates(is_default);
CREATE INDEX idx_templates_created_by ON templates(created_by);
CREATE INDEX idx_templates_usage ON templates(usage_count DESC);

-- ============================================================================
-- TEMPLATE_VERSIONS TABLE
-- ============================================================================
CREATE TABLE template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    change_description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(template_id, version_number)
);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_created_at ON template_versions(created_at DESC);

-- ============================================================================
-- DEMAND_LETTERS TABLE
-- ============================================================================
CREATE TABLE demand_letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    generation_params JSONB DEFAULT '{}',
    ai_model VARCHAR(100),
    word_count INTEGER,
    character_count INTEGER,
    current_version INTEGER DEFAULT 1,
    tags TEXT[],
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'in_progress', 'review', 'approved', 'sent', 'archived'))
);

CREATE INDEX idx_letters_user_id ON demand_letters(user_id);
CREATE INDEX idx_letters_firm_id ON demand_letters(firm_id);
CREATE INDEX idx_letters_template_id ON demand_letters(template_id);
CREATE INDEX idx_letters_status ON demand_letters(status);
CREATE INDEX idx_letters_created_at ON demand_letters(created_at DESC);
CREATE INDEX idx_letters_updated_at ON demand_letters(updated_at DESC);
CREATE INDEX idx_letters_tags ON demand_letters USING gin(tags);

-- Full-text search on title and content
CREATE INDEX idx_letters_text_search ON demand_letters USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
);

-- ============================================================================
-- LETTER_VERSIONS TABLE
-- ============================================================================
CREATE TABLE letter_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    word_count INTEGER,
    change_description TEXT,
    diff JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(letter_id, version_number)
);

CREATE INDEX idx_letter_versions_letter_id ON letter_versions(letter_id);
CREATE INDEX idx_letter_versions_created_at ON letter_versions(created_at DESC);

-- ============================================================================
-- LETTER_DOCUMENTS (Junction Table)
-- ============================================================================
CREATE TABLE letter_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(letter_id, document_id)
);

CREATE INDEX idx_letter_documents_letter_id ON letter_documents(letter_id);
CREATE INDEX idx_letter_documents_document_id ON letter_documents(document_id);

-- ============================================================================
-- EXPORTS TABLE
-- ============================================================================
CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(50) NOT NULL,
    s3_key TEXT NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'pending',
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_format CHECK (format IN ('docx', 'pdf', 'txt')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_exports_letter_id ON exports(letter_id);
CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_status ON exports(status);
CREATE INDEX idx_exports_created_at ON exports(created_at DESC);

-- ============================================================================
-- COMMENTS TABLE
-- ============================================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position_start INTEGER,
    position_end INTEGER,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_letter_id ON comments(letter_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_resolved ON comments(is_resolved);

-- ============================================================================
-- COLLABORATION_SESSIONS TABLE
-- ============================================================================
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255),
    cursor_position INTEGER,
    selection_start INTEGER,
    selection_end INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_collab_sessions_letter_id ON collaboration_sessions(letter_id);
CREATE INDEX idx_collab_sessions_user_id ON collaboration_sessions(user_id);
CREATE INDEX idx_collab_sessions_active ON collaboration_sessions(is_active);

-- ============================================================================
-- AI_GENERATIONS TABLE (For tracking AI usage)
-- ============================================================================
CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID REFERENCES demand_letters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    generation_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_estimate DECIMAL(10, 4),
    duration_ms INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_generation_type CHECK (generation_type IN ('initial_draft', 'refinement', 'suggestion', 'analysis')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_ai_generations_letter_id ON ai_generations(letter_id);
CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_firm_id ON ai_generations(firm_id);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at DESC);

-- ============================================================================
-- AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_firm_id ON audit_logs(firm_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_letters_updated_at BEFORE UPDATE ON demand_letters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        UPDATE templates SET usage_count = usage_count + 1 WHERE id = NEW.template_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_template_usage_trigger AFTER INSERT ON demand_letters
    FOR EACH ROW EXECUTE FUNCTION increment_template_usage();

-- Create initial version when letter is created
CREATE OR REPLACE FUNCTION create_initial_letter_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content IS NOT NULL THEN
        INSERT INTO letter_versions (letter_id, version_number, content, created_by)
        VALUES (NEW.id, 1, NEW.content, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_initial_version_trigger AFTER INSERT ON demand_letters
    FOR EACH ROW EXECUTE FUNCTION create_initial_letter_version();
```

---

### Migration 002: Performance Indexes

File: `backend/database/migrations/002_indexes.sql`

```sql
-- Additional composite indexes for common query patterns

-- User lookup by firm and role
CREATE INDEX idx_users_firm_role ON users(firm_id, role) WHERE is_active = true;

-- Document lookup by firm and type
CREATE INDEX idx_documents_firm_type ON documents(firm_id, file_type, status);

-- Letters by firm and status with date
CREATE INDEX idx_letters_firm_status_date ON demand_letters(firm_id, status, created_at DESC);

-- Recent activity queries
CREATE INDEX idx_documents_recent_activity ON documents(firm_id, created_at DESC) WHERE status != 'deleted';
CREATE INDEX idx_letters_recent_activity ON demand_letters(firm_id, updated_at DESC) WHERE status != 'archived';

-- AI usage analytics
CREATE INDEX idx_ai_usage_firm_date ON ai_generations(firm_id, created_at DESC) WHERE status = 'completed';

-- Template search optimization
CREATE INDEX idx_templates_search ON templates(firm_id, category, is_default) WHERE is_public = true OR firm_id IS NOT NULL;

-- Partial indexes for common filters
CREATE INDEX idx_active_users ON users(firm_id) WHERE is_active = true;
CREATE INDEX idx_uploaded_documents ON documents(firm_id, upload_date DESC) WHERE status = 'uploaded' OR status = 'processed';
CREATE INDEX idx_draft_letters ON demand_letters(firm_id, updated_at DESC) WHERE status = 'draft';
```

---

### Migration 003: Analytics Tables

File: `backend/database/migrations/003_analytics.sql`

```sql
-- Daily aggregates for analytics
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    letters_created INTEGER DEFAULT 0,
    letters_completed INTEGER DEFAULT 0,
    documents_uploaded INTEGER DEFAULT 0,
    ai_generations INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    avg_generation_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(firm_id, date)
);

CREATE INDEX idx_daily_analytics_firm_date ON daily_analytics(firm_id, date DESC);

-- User activity tracking
CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_firm_id ON user_activity(firm_id, created_at DESC);

-- Materialized view for firm statistics (refresh periodically)
CREATE MATERIALIZED VIEW firm_statistics AS
SELECT 
    f.id as firm_id,
    f.name as firm_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.last_login > NOW() - INTERVAL '30 days') as active_users_30d,
    COUNT(DISTINCT dl.id) as total_letters,
    COUNT(DISTINCT dl.id) FILTER (WHERE dl.created_at > NOW() - INTERVAL '30 days') as letters_last_30d,
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT t.id) FILTER (WHERE t.firm_id = f.id) as custom_templates,
    AVG(aig.duration_ms) as avg_generation_time_ms,
    SUM(aig.total_tokens) as total_tokens_used,
    MAX(dl.updated_at) as last_activity
FROM firms f
LEFT JOIN users u ON u.firm_id = f.id
LEFT JOIN demand_letters dl ON dl.firm_id = f.id
LEFT JOIN documents d ON d.firm_id = f.id
LEFT JOIN templates t ON t.firm_id = f.id
LEFT JOIN ai_generations aig ON aig.firm_id = f.id AND aig.status = 'completed'
GROUP BY f.id, f.name;

CREATE UNIQUE INDEX idx_firm_statistics_firm_id ON firm_statistics(firm_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_firm_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY firm_statistics;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 Prisma Schema

File: `backend/database/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Firm {
  id                   String         @id @default(uuid()) @db.Uuid
  name                 String         @db.VarChar(255)
  settings             Json           @default("{}")
  logoUrl              String?        @map("logo_url") @db.Text
  letterheadTemplate   String?        @map("letterhead_template") @db.Text
  address              String?        @db.Text
  phone                String?        @db.VarChar(50)
  email                String?        @db.VarChar(255)
  subscriptionTier     String         @default("standard") @map("subscription_tier") @db.VarChar(50)
  subscriptionStatus   String         @default("active") @map("subscription_status") @db.VarChar(50)
  createdAt            DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  users                User[]
  documents            Document[]
  templates            Template[]
  demandLetters        DemandLetter[]
  aiGenerations        AiGeneration[]
  auditLogs            AuditLog[]

  @@index([name])
  @@index([subscriptionStatus])
  @@map("firms")
}

model User {
  id                  String              @id @default(uuid()) @db.Uuid
  firmId              String              @map("firm_id") @db.Uuid
  email               String              @unique @db.VarChar(255)
  passwordHash        String              @map("password_hash") @db.VarChar(255)
  firstName           String?             @map("first_name") @db.VarChar(100)
  lastName            String?             @map("last_name") @db.VarChar(100)
  role                String              @default("attorney") @db.VarChar(50)
  isActive            Boolean             @default(true) @map("is_active")
  lastLogin           DateTime?           @map("last_login") @db.Timestamptz(6)
  preferences         Json                @default("{}")
  createdAt           DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime            @updatedAt @map("updated_at") @db.Timestamptz(6)

  firm                Firm                @relation(fields: [firmId], references: [id], onDelete: Cascade)
  documents           Document[]
  demandLetters       DemandLetter[]      @relation("UserLetters")
  letterVersions      LetterVersion[]
  templates           Template[]
  comments            Comment[]           @relation("UserComments")
  collaborationSessions CollaborationSession[]
  aiGenerations       AiGeneration[]
  exports             Export[]

  @@index([firmId])
  @@index([email])
  @@index([role])
  @@index([isActive])
  @@map("users")
}

model Document {
  id               String        @id @default(uuid()) @db.Uuid
  userId           String        @map("user_id") @db.Uuid
  firmId           String        @map("firm_id") @db.Uuid
  filename         String        @db.VarChar(255)
  originalFilename String        @map("original_filename") @db.VarChar(255)
  s3Key            String        @map("s3_key") @db.Text
  s3Bucket         String        @map("s3_bucket") @db.VarChar(255)
  fileSize         BigInt        @map("file_size")
  mimeType         String        @map("mime_type") @db.VarChar(100)
  fileType         String        @map("file_type") @db.VarChar(50)
  extractedText    String?       @map("extracted_text") @db.Text
  metadata         Json          @default("{}")
  status           String        @default("uploaded") @db.VarChar(50)
  uploadDate       DateTime      @default(now()) @map("upload_date") @db.Timestamptz(6)
  lastAccessed     DateTime?     @map("last_accessed") @db.Timestamptz(6)
  createdAt        DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  user             User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  firm             Firm          @relation(fields: [firmId], references: [id], onDelete: Cascade)
  letterDocuments  LetterDocument[]

  @@index([userId])
  @@index([firmId])
  @@index([status])
  @@index([uploadDate(sort: Desc)])
  @@index([s3Key])
  @@map("documents")
}

model Template {
  id          String            @id @default(uuid()) @db.Uuid
  firmId      String?           @map("firm_id") @db.Uuid
  name        String            @db.VarChar(255)
  description String?           @db.Text
  content     String            @db.Text
  variables   Json              @default("[]")
  category    String?           @db.VarChar(100)
  isDefault   Boolean           @default(false) @map("is_default")
  isPublic    Boolean           @default(false) @map("is_public")
  usageCount  Int               @default(0) @map("usage_count")
  createdBy   String?           @map("created_by") @db.Uuid
  createdAt   DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)

  firm        Firm?             @relation(fields: [firmId], references: [id], onDelete: Cascade)
  creator     User?             @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  versions    TemplateVersion[]
  letters     DemandLetter[]

  @@index([firmId])
  @@index([category])
  @@index([isDefault])
  @@index([createdBy])
  @@index([usageCount(sort: Desc)])
  @@map("templates")
}

model DemandLetter {
  id                String            @id @default(uuid()) @db.Uuid
  userId            String            @map("user_id") @db.Uuid
  firmId            String            @map("firm_id") @db.Uuid
  templateId        String?           @map("template_id") @db.Uuid
  title             String            @db.VarChar(255)
  content           String?           @db.Text
  status            String            @default("draft") @db.VarChar(50)
  generationParams  Json              @default("{}") @map("generation_params")
  aiModel           String?           @map("ai_model") @db.VarChar(100)
  wordCount         Int?              @map("word_count")
  characterCount    Int?              @map("character_count")
  currentVersion    Int               @default(1) @map("current_version")
  tags              String[]
  notes             String?           @db.Text
  metadata          Json              @default("{}")
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  lastEditedBy      String?           @map("last_edited_by") @db.Uuid
  completedAt       DateTime?         @map("completed_at") @db.Timestamptz(6)

  user              User              @relation("UserLetters", fields: [userId], references: [id], onDelete: Cascade)
  firm              Firm              @relation(fields: [firmId], references: [id], onDelete: Cascade)
  template          Template?         @relation(fields: [templateId], references: [id], onDelete: SetNull)
  versions          LetterVersion[]
  letterDocuments   LetterDocument[]
  comments          Comment[]
  collaborationSessions CollaborationSession[]
  aiGenerations     AiGeneration[]
  exports           Export[]

  @@index([userId])
  @@index([firmId])
  @@index([templateId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@index([updatedAt(sort: Desc)])
  @@map("demand_letters")
}

model LetterVersion {
  id                String        @id @default(uuid()) @db.Uuid
  letterId          String        @map("letter_id") @db.Uuid
  versionNumber     Int           @map("version_number")
  content           String        @db.Text
  wordCount         Int?          @map("word_count")
  changeDescription String?       @map("change_description") @db.Text
  diff              Json?
  createdBy         String?       @map("created_by") @db.Uuid
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)

  letter            DemandLetter  @relation(fields: [letterId], references: [id], onDelete: Cascade)
  creator           User?         @relation(fields: [createdBy], references: [id], onDelete: SetNull)

  @@unique([letterId, versionNumber])
  @@index([letterId])
  @@index([createdAt(sort: Desc)])
  @@map("letter_versions")
}

model LetterDocument {
  id         String       @id @default(uuid()) @db.Uuid
  letterId   String       @map("letter_id") @db.Uuid
  documentId String       @map("document_id") @db.Uuid
  addedAt    DateTime     @default(now()) @map("added_at") @db.Timestamptz(6)

  letter     DemandLetter @relation(fields: [letterId], references: [id], onDelete: Cascade)
  document   Document     @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([letterId, documentId])
  @@index([letterId])
  @@index([documentId])
  @@map("letter_documents")
}

model Export {
  id            String       @id @default(uuid()) @db.Uuid
  letterId      String       @map("letter_id") @db.Uuid
  userId        String       @map("user_id") @db.Uuid
  format        String       @db.VarChar(50)
  s3Key         String       @map("s3_key") @db.Text
  s3Bucket      String       @map("s3_bucket") @db.VarChar(255)
  fileSize      BigInt?      @map("file_size")
  status        String       @default("pending") @db.VarChar(50)
  downloadCount Int          @default(0) @map("download_count")
  expiresAt     DateTime?    @map("expires_at") @db.Timestamptz(6)
  createdAt     DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  letter        DemandLetter @relation(fields: [letterId], references: [id], onDelete: Cascade)
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([letterId])
  @@index([userId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("exports")
}

model Comment {
  id                String       @id @default(uuid()) @db.Uuid
  letterId          String       @map("letter_id") @db.Uuid
  userId            String       @map("user_id") @db.Uuid
  parentCommentId   String?      @map("parent_comment_id") @db.Uuid
  content           String       @db.Text
  positionStart     Int?         @map("position_start")
  positionEnd       Int?         @map("position_end")
  isResolved        Boolean      @default(false) @map("is_resolved")
  resolvedBy        String?      @map("resolved_by") @db.Uuid
  resolvedAt        DateTime?    @map("resolved_at") @db.Timestamptz(6)
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)

  letter            DemandLetter @relation(fields: [letterId], references: [id], onDelete: Cascade)
  user              User         @relation("UserComments", fields: [userId], references: [id], onDelete: Cascade)
  parentComment     Comment?     @relation("CommentReplies", fields: [parentCommentId], references: [id], onDelete: Cascade)
  replies           Comment[]    @relation("CommentReplies")

  @@index([letterId])
  @@index([userId])
  @@index([parentCommentId])
  @@index([isResolved])
  @@map("comments")
}

model CollaborationSession {
  id             String       @id @default(uuid()) @db.Uuid
  letterId       String       @map("letter_id") @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  socketId       String?      @map("socket_id") @db.VarChar(255)
  cursorPosition Int?         @map("cursor_position")
  selectionStart Int?         @map("selection_start")
  selectionEnd   Int?         @map("selection_end")
  isActive       Boolean      @default(true) @map("is_active")
  lastSeen       DateTime     @default(now()) @map("last_seen") @db.Timestamptz(6)
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  letter         DemandLetter @relation(fields: [letterId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([letterId])
  @@index([userId])
  @@index([isActive])
  @@map("collaboration_sessions")
}

model AiGeneration {
  id             String       @id @default(uuid()) @db.Uuid
  letterId       String?      @map("letter_id") @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  firmId         String       @map("firm_id") @db.Uuid
  generationType String       @map("generation_type") @db.VarChar(50)
  modelName      String       @map("model_name") @db.VarChar(100)
  promptTokens   Int?         @map("prompt_tokens")
  completionTokens Int?       @map("completion_tokens")
  totalTokens    Int?         @map("total_tokens")
  costEstimate   Decimal?     @map("cost_estimate") @db.Decimal(10, 4)
  durationMs     Int?         @map("duration_ms")
  status         String       @default("pending") @db.VarChar(50)
  errorMessage   String?      @map("error_message") @db.Text
  metadata       Json         @default("{}")
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  letter         DemandLetter? @relation(fields: [letterId], references: [id], onDelete: Cascade)
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  firm           Firm          @relation(fields: [firmId], references: [id], onDelete: Cascade)

  @@index([letterId])
  @@index([userId])
  @@index([firmId])
  @@index([createdAt(sort: Desc)])
  @@map("ai_generations")
}

model AuditLog {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String?   @map("user_id") @db.Uuid
  firmId     String?   @map("firm_id") @db.Uuid
  entityType String    @map("entity_type") @db.VarChar(100)
  entityId   String    @map("entity_id") @db.Uuid
  action     String    @db.VarChar(100)
  oldValues  Json?     @map("old_values")
  newValues  Json?     @map("new_values")
  ipAddress  String?   @map("ip_address")
  userAgent  String?   @map("user_agent") @db.Text
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  firm       Firm?     @relation(fields: [firmId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([firmId])
  @@index([entityType, entityId])
  @@index([createdAt(sort: Desc)])
  @@map("audit_logs")
}

model TemplateVersion {
  id                String    @id @default(uuid()) @db.Uuid
  templateId        String    @map("template_id") @db.Uuid
  versionNumber     Int       @map("version_number")
  content           String    @db.Text
  variables         Json      @default("[]")
  changeDescription String?   @map("change_description") @db.Text
  createdBy         String?   @map("created_by") @db.Uuid
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  template          Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, versionNumber])
  @@index([templateId])
  @@index([createdAt(sort: Desc)])
  @@map("template_versions")
}
```

---

## 📝 Seed Data

File: `backend/database/seeds/dev_data.sql`

```sql
-- Development seed data
-- Run this after running the initial migration

-- Insert demo firm
INSERT INTO firms (id, name, settings, email, phone, address) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Acme Law Firm', 
 '{"timezone": "America/New_York", "dateFormat": "MM/DD/YYYY"}',
 'info@acmelaw.com', '(555) 123-4567', '123 Legal Street, New York, NY 10001');

-- Insert demo users
INSERT INTO users (id, firm_id, email, password_hash, first_name, last_name, role) VALUES
('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000',
 'admin@acmelaw.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
 'Jane', 'Smith', 'admin'),
('770e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000',
 'attorney@acmelaw.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
 'John', 'Doe', 'attorney'),
('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000',
 'paralegal@acmelaw.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
 'Sarah', 'Johnson', 'paralegal');

-- Insert default templates
INSERT INTO templates (name, description, content, variables, category, is_default, is_public) VALUES
('Personal Injury Demand Letter',
 'Standard template for personal injury cases',
 'Dear {{opposing_counsel}},

I am writing on behalf of my client, {{client_name}}, regarding the incident that occurred on {{incident_date}} at {{incident_location}}.

## Summary of Incident
{{incident_summary}}

## Injuries and Damages
{{injuries_description}}

## Medical Treatment
{{medical_treatment}}

## Damages
- Medical Expenses: {{medical_expenses}}
- Lost Wages: {{lost_wages}}
- Pain and Suffering: {{pain_suffering}}
- Total Demand: {{total_demand}}

## Demand for Settlement
We demand payment of {{total_demand}} to settle this matter...

Sincerely,
{{attorney_name}}
{{attorney_title}}',
 '["opposing_counsel", "client_name", "incident_date", "incident_location", "incident_summary", "injuries_description", "medical_treatment", "medical_expenses", "lost_wages", "pain_suffering", "total_demand", "attorney_name", "attorney_title"]',
 'Personal Injury',
 true,
 true);

-- Add more default templates as needed
```

---

## 🚀 Setup Instructions

### 1. Initial Database Setup

```bash
# Create database
createdb steno_demand_letters

# Set environment variable
export DATABASE_URL="postgresql://user:password@localhost:5432/steno_demand_letters"

# Run migrations
psql $DATABASE_URL < backend/database/migrations/001_initial_schema.sql
psql $DATABASE_URL < backend/database/migrations/002_indexes.sql
psql $DATABASE_URL < backend/database/migrations/003_analytics.sql

# Seed development data
psql $DATABASE_URL < backend/database/seeds/dev_data.sql
```

### 2. Prisma Setup

```bash
cd backend

# Install Prisma
npm install @prisma/client
npm install -D prisma

# Generate Prisma Client
npx prisma generate

# Verify setup
npx prisma db pull
npx prisma studio  # Opens database GUI
```

---

## 📊 Query Examples

### Get firm statistics
```sql
SELECT * FROM firm_statistics WHERE firm_id = '550e8400-e29b-41d4-a716-446655440000';
```

### Find recent letters with documents
```sql
SELECT 
    dl.*,
    u.first_name || ' ' || u.last_name as author,
    COUNT(ld.document_id) as document_count
FROM demand_letters dl
JOIN users u ON u.id = dl.user_id
LEFT JOIN letter_documents ld ON ld.letter_id = dl.id
WHERE dl.firm_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY dl.id, u.first_name, u.last_name
ORDER BY dl.updated_at DESC
LIMIT 10;
```

### Calculate AI usage costs by firm
```sql
SELECT 
    f.name,
    COUNT(*) as total_generations,
    SUM(total_tokens) as total_tokens,
    SUM(cost_estimate) as total_cost,
    AVG(duration_ms) as avg_duration_ms
FROM ai_generations aig
JOIN firms f ON f.id = aig.firm_id
WHERE aig.status = 'completed'
GROUP BY f.id, f.name
ORDER BY total_cost DESC;
```

---

**Database Version:** 1.0.0  
**Last Updated:** [Date]
