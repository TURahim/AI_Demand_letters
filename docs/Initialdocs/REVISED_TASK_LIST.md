# REVISED Engineering Task List - Steno Demand Letter Generator

**Key Changes from Original:**
- ✅ Security/compliance moved to PR-01/02 (no net scope increase)
- ✅ Legal-grade document handling in PR-03 (OCR, chain-of-custody)
- ✅ Architecture decision: Lambda-first via API Gateway
- ✅ Simplified collaboration with Yjs (PR-12)
- ✅ React Query over Redux for server state
- ✅ DOCX-first export strategy
- ✅ DMS connector interface stubs
- ✅ "Walking Skeleton" milestone at Week 2

---

## 🎯 Walking Skeleton Milestone (End of Week 2)

**Goal:** Prove end-to-end P0 flow in minimal slice

### Must Work:
1. **Upload document** (PR-03) → S3 with audit event
2. **Select default template** (PR-05 seed data)
3. **Generate draft** (`/api/ai/generate` - PR-04) → returns letter content
4. **Download DOCX** (PR-11 minimal) → formatted file
5. **Audit trail** (PR-01) → all events logged to `audit_events` table

### Acceptance:
- [ ] Demo: PDF upload → AI draft → DOCX download in <60 seconds
- [ ] Audit log shows: upload, template_selected, generation_started, generation_completed, export_requested
- [ ] Document has SHA-256 hash stored
- [ ] Encryption at rest verified (S3 SSE-KMS, RDS encrypted)
- [ ] No placeholder data (real Bedrock call, real DOCX generation)

**If this works, the product is validated. Everything else is polish.**

---

## PR-01: Infrastructure & Database Setup [REVISED]
**Complexity:** High (was Medium)  
**Estimated Time:** 5-7 days (was 3-5)

### Architecture Decision (NEW)

**We are committing to: Lambda-first via API Gateway + @vendia/serverless-express**

**Rationale:**
- Simpler ops than ECS/Fargate
- Auto-scaling built-in
- Pay-per-use (critical for early stage)
- Fast cold starts with provisioned concurrency on AI endpoints

**Trade-offs accepted:**
- 15-minute Lambda timeout (fine for async processing)
- 10GB memory limit (fine for our use case)
- Stateless only (WebSocket on separate service)

Create: `/docs/ARCHITECTURE_DECISION.md` documenting this choice.

### Updated Tasks

#### Infrastructure as Code

**Existing tasks remain, PLUS:**

- [ ] `/infra/terraform/kms.tf` — KMS key management
  ```hcl
  # Customer-managed KMS key for S3
  resource "aws_kms_key" "s3_encryption" {
    description = "KMS key for S3 bucket encryption"
    enable_key_rotation = true
  }
  
  # Customer-managed KMS key for RDS
  resource "aws_kms_key" "rds_encryption" {
    description = "KMS key for RDS encryption"
    enable_key_rotation = true
  }
  ```

- [ ] `/infra/terraform/s3.tf` — S3 buckets with SSE-KMS encryption
  ```hcl
  resource "aws_s3_bucket" "documents" {
    bucket = "${var.project_name}-documents-${var.environment}"
  }
  
  resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
    bucket = aws_s3_bucket.documents.id
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm     = "aws:kms"
        kms_master_key_id = aws_kms_key.s3_encryption.arn
      }
    }
  }
  
  # Versioning for audit trail
  resource "aws_s3_bucket_versioning" "documents" {
    bucket = aws_s3_bucket.documents.id
    versioning_configuration {
      status = "Enabled"
    }
  }
  
  # Block public access
  resource "aws_s3_bucket_public_access_block" "documents" {
    bucket = aws_s3_bucket.documents.id
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }
  ```

- [ ] `/infra/terraform/rds.tf` — Update with encryption
  ```hcl
  resource "aws_db_instance" "main" {
    # ... existing config ...
    
    # ADDED: Storage encryption
    storage_encrypted   = true
    kms_key_id         = aws_kms_key.rds_encryption.arn
    
    # ADDED: Snapshot encryption
    copy_tags_to_snapshot = true
    
    # ADDED: Backup retention for compliance
    backup_retention_period = 30
    backup_window          = "03:00-04:00"
    
    # ADDED: Enhanced monitoring
    enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  }
  ```

- [ ] `/infra/terraform/vpc-endpoints.tf` — VPC endpoints for security (NEW)
  ```hcl
  # S3 VPC endpoint (gateway type)
  resource "aws_vpc_endpoint" "s3" {
    vpc_id       = aws_vpc.main.id
    service_name = "com.amazonaws.${var.aws_region}.s3"
    vpc_endpoint_type = "Gateway"
    route_table_ids = [aws_route_table.private.id]
  }
  
  # Bedrock VPC endpoint (interface type)
  resource "aws_vpc_endpoint" "bedrock" {
    vpc_id            = aws_vpc.main.id
    service_name      = "com.amazonaws.${var.aws_region}.bedrock-runtime"
    vpc_endpoint_type = "Interface"
    subnet_ids        = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.vpc_endpoints.id]
    private_dns_enabled = true
  }
  
  # Secrets Manager VPC endpoint
  resource "aws_vpc_endpoint" "secrets_manager" {
    vpc_id            = aws_vpc.main.id
    service_name      = "com.amazonaws.${var.aws_region}.secretsmanager"
    vpc_endpoint_type = "Interface"
    subnet_ids        = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.vpc_endpoints.id]
    private_dns_enabled = true
  }
  ```

- [ ] `/infra/terraform/secrets-manager.tf` — Secrets management (NEW)
  ```hcl
  # Database credentials
  resource "aws_secretsmanager_secret" "db_credentials" {
    name = "${var.project_name}-db-credentials-${var.environment}"
    kms_key_id = aws_kms_key.secrets_encryption.arn
  }
  
  resource "aws_secretsmanager_secret_version" "db_credentials" {
    secret_id = aws_secretsmanager_secret.db_credentials.id
    secret_string = jsonencode({
      username = aws_db_instance.main.username
      password = random_password.db_password.result
      host     = aws_db_instance.main.endpoint
      database = aws_db_instance.main.db_name
    })
  }
  
  # JWT secret
  resource "aws_secretsmanager_secret" "jwt_secret" {
    name = "${var.project_name}-jwt-secret-${var.environment}"
    kms_key_id = aws_kms_key.secrets_encryption.arn
  }
  
  resource "aws_secretsmanager_secret_version" "jwt_secret" {
    secret_id = aws_secretsmanager_secret.jwt_secret.id
    secret_string = random_password.jwt_secret.result
  }
  
  resource "random_password" "jwt_secret" {
    length  = 64
    special = true
  }
  ```

- [ ] `/infra/terraform/lambda.tf` — Lambda with provisioned concurrency (UPDATED)
  ```hcl
  # Main API Lambda
  resource "aws_lambda_function" "api" {
    function_name = "${var.project_name}-api-${var.environment}"
    role          = aws_iam_role.lambda_exec.arn
    handler       = "dist/lambda.handler"
    runtime       = "nodejs18.x"
    timeout       = 30
    memory_size   = 1024
    
    environment {
      variables = {
        DATABASE_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
        JWT_SECRET_ARN      = aws_secretsmanager_secret.jwt_secret.arn
        S3_BUCKET_DOCUMENTS = aws_s3_bucket.documents.id
      }
    }
    
    vpc_config {
      subnet_ids         = aws_subnet.private[*].id
      security_group_ids = [aws_security_group.lambda.id]
    }
  }
  
  # AI Generation Lambda with provisioned concurrency
  resource "aws_lambda_function" "ai_generate" {
    function_name = "${var.project_name}-ai-generate-${var.environment}"
    role          = aws_iam_role.lambda_exec.arn
    handler       = "dist/ai-lambda.handler"
    runtime       = "nodejs18.x"
    timeout       = 900  # 15 minutes for AI generation
    memory_size   = 3008 # Maximum for fastest performance
    
    environment {
      variables = {
        BEDROCK_MODEL_ID = var.bedrock_model_id
        DATABASE_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
      }
    }
    
    vpc_config {
      subnet_ids         = aws_subnet.private[*].id
      security_group_ids = [aws_security_group.lambda.id]
    }
  }
  
  # Provisioned concurrency for AI endpoints (warm starts)
  resource "aws_lambda_provisioned_concurrency_config" "ai_generate" {
    function_name                     = aws_lambda_function.ai_generate.function_name
    provisioned_concurrent_executions = var.environment == "production" ? 5 : 1
    qualifier                         = aws_lambda_function.ai_generate.version
  }
  ```

#### Database Schema (UPDATED)

**Add to migration 001:**

- [ ] `/backend/database/migrations/001_initial_schema.sql` — Add audit_events table
  ```sql
  -- ADDED: Audit events table for compliance
  CREATE TABLE audit_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_type VARCHAR(100) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
      resource_type VARCHAR(100) NOT NULL,
      resource_id UUID NOT NULL,
      action VARCHAR(100) NOT NULL,
      metadata JSONB DEFAULT '{}',
      ip_address INET,
      user_agent TEXT,
      status VARCHAR(50) DEFAULT 'success',
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      CONSTRAINT valid_event_types CHECK (event_type IN (
          'document.uploaded', 'document.viewed', 'document.downloaded', 'document.deleted',
          'template.created', 'template.updated', 'template.deleted', 'template.used',
          'letter.generated', 'letter.viewed', 'letter.edited', 'letter.exported',
          'user.login', 'user.logout', 'user.created', 'user.updated',
          'ai.generation_started', 'ai.generation_completed', 'ai.generation_failed'
      ))
  );
  
  CREATE INDEX idx_audit_events_user_id ON audit_events(user_id, created_at DESC);
  CREATE INDEX idx_audit_events_firm_id ON audit_events(firm_id, created_at DESC);
  CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
  CREATE INDEX idx_audit_events_type_date ON audit_events(event_type, created_at DESC);
  CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
  
  -- Partition by month for performance (future-proofing)
  -- ALTER TABLE audit_events PARTITION BY RANGE (created_at);
  ```

- [ ] `/backend/database/migrations/001_initial_schema.sql` — Update documents table
  ```sql
  -- MODIFIED: Add SHA-256 hash for chain-of-custody
  CREATE TABLE documents (
      -- ... existing fields ...
      
      -- ADDED: Chain of custody
      sha256_hash VARCHAR(64) NOT NULL,  -- Computed on upload
      original_sha256 VARCHAR(64),       -- If file is modified, keep original
      
      -- ADDED: OCR metadata
      ocr_performed BOOLEAN DEFAULT FALSE,
      ocr_confidence DECIMAL(5,2),       -- Average confidence score
      
      -- ... rest of fields ...
  );
  
  CREATE UNIQUE INDEX idx_documents_sha256 ON documents(sha256_hash);
  ```

#### Backend Audit Service (NEW)

- [ ] `/backend/services/audit/audit.service.ts` — Audit event service
  ```typescript
  import { PrismaClient } from '@prisma/client';
  
  export interface AuditEventData {
    eventType: string;
    userId?: string;
    firmId: string;
    resourceType: string;
    resourceId: string;
    action: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure';
    errorMessage?: string;
  }
  
  export class AuditService {
    private prisma: PrismaClient;
    
    constructor(prisma: PrismaClient) {
      this.prisma = prisma;
    }
    
    async logEvent(data: AuditEventData): Promise<void> {
      try {
        await this.prisma.auditEvent.create({
          data: {
            eventType: data.eventType,
            userId: data.userId,
            firmId: data.firmId,
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            action: data.action,
            metadata: data.metadata || {},
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            status: data.status || 'success',
            errorMessage: data.errorMessage,
          },
        });
      } catch (error) {
        // Never let audit logging break the main flow
        console.error('Failed to log audit event:', error);
      }
    }
    
    async getEventsForResource(
      resourceType: string,
      resourceId: string,
      limit = 100
    ) {
      return this.prisma.auditEvent.findMany({
        where: { resourceType, resourceId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }
    
    async getEventsForFirm(
      firmId: string,
      startDate?: Date,
      endDate?: Date,
      limit = 1000
    ) {
      return this.prisma.auditEvent.findMany({
        where: {
          firmId,
          ...(startDate && { createdAt: { gte: startDate } }),
          ...(endDate && { createdAt: { lte: endDate } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }
  }
  ```

- [ ] `/backend/middleware/audit.middleware.ts` — Audit logging middleware (NEW)
  ```typescript
  import { Request, Response, NextFunction } from 'express';
  import { AuditService } from '../services/audit/audit.service';
  
  export const auditMiddleware = (auditService: AuditService) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json.bind(res);
      
      res.json = function(body: any) {
        // Log successful requests (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const eventType = determineEventType(req);
          if (eventType) {
            auditService.logEvent({
              eventType,
              userId: req.user?.id,
              firmId: req.user?.firmId,
              resourceType: extractResourceType(req),
              resourceId: extractResourceId(req, body),
              action: req.method,
              metadata: { path: req.path, query: req.query },
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
              status: 'success',
            }).catch(err => console.error('Audit log failed:', err));
          }
        }
        
        return originalJson(body);
      };
      
      next();
    };
  };
  
  function determineEventType(req: Request): string | null {
    const { method, path } = req;
    
    // Map routes to event types
    if (path.startsWith('/api/upload')) return 'document.uploaded';
    if (path.includes('/documents/') && method === 'GET') return 'document.viewed';
    if (path.includes('/generation/')) return 'letter.generated';
    if (path.includes('/export/')) return 'letter.exported';
    
    return null;
  }
  ```

#### Documentation

- [ ] `/docs/ARCHITECTURE_DECISION.md` — Document Lambda-first choice (NEW)
- [ ] `/docs/SECURITY.md` — Security measures documentation (NEW)
  - KMS encryption strategy
  - VPC endpoint usage
  - Secrets management
  - Audit logging
  - Chain of custody for documents

---

## PR-02: Authentication & Authorization [REVISED]
**Complexity:** High  
**Estimated Time:** 5-7 days

### Updated Tasks

**All existing tasks remain, PLUS:**

#### SSO/SCIM Preparation (NEW)

- [ ] `/backend/services/sso/interfaces.ts` — SSO interface definitions
  ```typescript
  /**
   * SSO Provider interface
   * Implementation will be added when pilot firm requires SSO
   */
  export interface ISSOProvider {
    name: string;
    type: 'saml' | 'oidc';
    
    /**
     * Initiate SSO login flow
     */
    initiateLogin(returnUrl: string): Promise<{ redirectUrl: string }>;
    
    /**
     * Handle SSO callback and exchange token
     */
    handleCallback(code: string): Promise<SSOUser>;
    
    /**
     * Validate SSO token
     */
    validateToken(token: string): Promise<boolean>;
  }
  
  export interface SSOUser {
    email: string;
    firstName?: string;
    lastName?: string;
    externalId: string;
    metadata?: Record<string, any>;
  }
  
  export interface SCIMUser {
    userName: string;
    name: {
      givenName: string;
      familyName: string;
    };
    emails: Array<{ value: string; primary: boolean }>;
    active: boolean;
    externalId: string;
  }
  
  /**
   * SCIM Provider interface
   * For automatic user provisioning/deprovisioning
   */
  export interface ISCIMProvider {
    /**
     * Create user from SCIM payload
     */
    createUser(user: SCIMUser): Promise<void>;
    
    /**
     * Update user from SCIM payload
     */
    updateUser(externalId: string, user: Partial<SCIMUser>): Promise<void>;
    
    /**
     * Deactivate user
     */
    deactivateUser(externalId: string): Promise<void>;
  }
  ```

- [ ] `/backend/services/sso/sso.service.ts` — SSO service stub
  ```typescript
  import { ISSOProvider, SSOUser } from './interfaces';
  
  export class SSOService {
    private providers: Map<string, ISSOProvider> = new Map();
    
    /**
     * Register SSO provider (e.g., Okta, Azure AD)
     * Called during app initialization if SSO is enabled
     */
    registerProvider(providerId: string, provider: ISSOProvider): void {
      this.providers.set(providerId, provider);
    }
    
    /**
     * Check if SSO is enabled for this firm
     */
    isSSOEnabled(firmId: string): boolean {
      // TODO: Check feature flag in firm settings
      return false; // Disabled by default
    }
    
    /**
     * Initiate SSO login
     */
    async initiateLogin(firmId: string, returnUrl: string): Promise<string> {
      if (!this.isSSOEnabled(firmId)) {
        throw new Error('SSO not enabled for this firm');
      }
      
      // TODO: Implement when pilot firm needs SSO
      throw new Error('SSO not yet implemented');
    }
    
    /**
     * Handle SSO callback
     */
    async handleCallback(code: string): Promise<SSOUser> {
      // TODO: Implement when pilot firm needs SSO
      throw new Error('SSO not yet implemented');
    }
  }
  ```

- [ ] `/backend/database/migrations/002_sso_fields.sql` — Add SSO fields (NEW)
  ```sql
  -- Add SSO fields to firms table
  ALTER TABLE firms ADD COLUMN sso_enabled BOOLEAN DEFAULT FALSE;
  ALTER TABLE firms ADD COLUMN sso_provider VARCHAR(50); -- 'okta', 'azure_ad', 'google'
  ALTER TABLE firms ADD COLUMN sso_config JSONB DEFAULT '{}';
  
  -- Add SSO fields to users table
  ALTER TABLE users ADD COLUMN sso_external_id VARCHAR(255);
  ALTER TABLE users ADD COLUMN sso_provider VARCHAR(50);
  ALTER TABLE users ADD COLUMN last_sso_login TIMESTAMP WITH TIME ZONE;
  
  CREATE INDEX idx_users_sso_external_id ON users(sso_external_id) WHERE sso_external_id IS NOT NULL;
  
  -- Feature flags table
  CREATE TABLE feature_flags (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
      feature_name VARCHAR(100) NOT NULL,
      enabled BOOLEAN DEFAULT FALSE,
      config JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(firm_id, feature_name)
  );
  
  CREATE INDEX idx_feature_flags_firm ON feature_flags(firm_id);
  ```

- [ ] `/backend/routes/auth.routes.ts` — Add SSO routes (stub)
  ```typescript
  // SSO routes (disabled by default)
  router.get('/sso/login/:firmId', async (req, res) => {
    const { firmId } = req.params;
    
    if (!ssoService.isSSOEnabled(firmId)) {
      return res.status(400).json({ error: 'SSO not enabled' });
    }
    
    const redirectUrl = await ssoService.initiateLogin(firmId, req.query.returnUrl as string);
    res.redirect(redirectUrl);
  });
  
  router.get('/sso/callback', async (req, res) => {
    // Handle SSO callback
    // TODO: Implement when needed
    res.status(501).json({ error: 'SSO callback not implemented' });
  });
  ```

---

## PR-03: Document Upload & Storage [REVISED]
**Complexity:** High (was Medium)  
**Estimated Time:** 6-7 days (was 4-5)

### Updated Tasks

#### File Processing (UPDATED)

- [ ] `/backend/services/processing/text-extractor.ts` — PDF text extraction WITH OCR fallback
  ```typescript
  import * as pdfParse from 'pdf-parse';
  import * as crypto from 'crypto';
  import { Textract } from 'aws-sdk';
  
  export interface ExtractionResult {
    text: string;
    pageCount: number;
    sha256: string;
    ocrPerformed: boolean;
    ocrConfidence?: number;
    metadata: {
      title?: string;
      author?: string;
      creationDate?: Date;
    };
  }
  
  export class TextExtractor {
    private textract: Textract;
    private ocrEnabled: boolean;
    
    constructor(ocrEnabled = true) {
      this.textract = new Textract();
      this.ocrEnabled = ocrEnabled;
    }
    
    /**
     * Extract text from PDF with OCR fallback
     */
    async extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
      // Calculate SHA-256 hash for chain of custody
      const sha256 = crypto
        .createHash('sha256')
        .update(buffer)
        .digest('hex');
      
      try {
        // First attempt: Standard PDF text extraction
        const data = await pdfParse(buffer);
        
        const extractedText = data.text.trim();
        const textDensity = extractedText.length / data.numpages;
        
        // If text density is low, PDF might be scanned
        const needsOCR = textDensity < 100; // Less than 100 chars per page
        
        if (needsOCR && this.ocrEnabled) {
          console.log('Low text density detected, attempting OCR');
          return await this.extractWithOCR(buffer, sha256);
        }
        
        return {
          text: extractedText,
          pageCount: data.numpages,
          sha256,
          ocrPerformed: false,
          metadata: {
            title: data.info?.Title,
            author: data.info?.Author,
            creationDate: data.info?.CreationDate,
          },
        };
      } catch (error) {
        // PDF parsing failed, try OCR
        if (this.ocrEnabled) {
          console.log('PDF parsing failed, falling back to OCR');
          return await this.extractWithOCR(buffer, sha256);
        }
        
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
    }
    
    /**
     * Extract text using AWS Textract (OCR)
     */
    private async extractWithOCR(
      buffer: Buffer,
      sha256: string
    ): Promise<ExtractionResult> {
      const response = await this.textract
        .detectDocumentText({
          Document: { Bytes: buffer },
        })
        .promise();
      
      if (!response.Blocks) {
        throw new Error('OCR failed: No text detected');
      }
      
      // Extract text and calculate confidence
      const textBlocks = response.Blocks.filter(block => block.BlockType === 'LINE');
      const text = textBlocks.map(block => block.Text).join('\n');
      
      const confidences = textBlocks
        .map(block => block.Confidence || 0)
        .filter(c => c > 0);
      
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b) / confidences.length
        : 0;
      
      return {
        text,
        pageCount: this.estimatePageCount(textBlocks.length),
        sha256,
        ocrPerformed: true,
        ocrConfidence: avgConfidence,
        metadata: {},
      };
    }
    
    private estimatePageCount(lineCount: number): number {
      // Rough estimate: ~40 lines per page
      return Math.max(1, Math.ceil(lineCount / 40));
    }
  }
  ```

- [ ] `/backend/services/upload/upload.service.ts` — UPDATE to include SHA-256 hashing
  ```typescript
  import * as crypto from 'crypto';
  
  async uploadDocument(file: Buffer, metadata: UploadMetadata): Promise<Document> {
    // Calculate SHA-256 hash
    const sha256Hash = crypto
      .createHash('sha256')
      .update(file)
      .digest('hex');
    
    // Check for duplicate (optional - may want same doc uploaded multiple times)
    const existing = await this.prisma.document.findUnique({
      where: { sha256_hash: sha256Hash },
    });
    
    if (existing && !metadata.allowDuplicates) {
      throw new Error('Document already exists');
    }
    
    // Upload to S3
    const s3Key = await this.s3Service.upload(file, metadata);
    
    // Extract text
    const extraction = await this.textExtractor.extractFromPDF(file);
    
    // Create database record
    const document = await this.prisma.document.create({
      data: {
        userId: metadata.userId,
        firmId: metadata.firmId,
        filename: metadata.filename,
        originalFilename: metadata.originalFilename,
        s3Key,
        s3Bucket: this.s3Bucket,
        fileSize: file.length,
        mimeType: metadata.mimeType,
        fileType: metadata.fileType,
        extractedText: extraction.text,
        sha256Hash: extraction.sha256,
        ocrPerformed: extraction.ocrPerformed,
        ocrConfidence: extraction.ocrConfidence,
        metadata: extraction.metadata,
        status: 'processed',
      },
    });
    
    // Log audit event
    await this.auditService.logEvent({
      eventType: 'document.uploaded',
      userId: metadata.userId,
      firmId: metadata.firmId,
      resourceType: 'document',
      resourceId: document.id,
      action: 'CREATE',
      metadata: {
        filename: metadata.originalFilename,
        fileSize: file.length,
        sha256: extraction.sha256,
        ocrPerformed: extraction.ocrPerformed,
      },
    });
    
    return document;
  }
  ```

- [ ] `/backend/config/ocr.config.ts` — OCR configuration (NEW)
  ```typescript
  export const OCRConfig = {
    enabled: process.env.OCR_ENABLED === 'true',
    provider: process.env.OCR_PROVIDER || 'textract', // 'textract' or 'tesseract'
    confidenceThreshold: 70, // Minimum confidence to accept OCR results
    fallbackToManual: true, // Allow manual review if confidence is low
  };
  ```

---

## PR-12: Real-time Collaboration [SIMPLIFIED]
**Complexity:** Medium (was High)  
**Estimated Time:** 5-7 days (was 8-10)

### Updated Approach

**Replace custom OT engine with Yjs + TipTap collaboration**

**Why:** Yjs is battle-tested, handles CRDTs better than custom OT, and integrates natively with TipTap.

### New Tasks

#### Yjs Backend

- [ ] `/backend/services/collaboration/yjs-server.ts` — Yjs WebSocket server
  ```typescript
  import * as Y from 'yjs';
  import * as syncProtocol from 'y-protocols/sync';
  import * as awarenessProtocol from 'y-protocols/awareness';
  import { WebSocket, WebSocketServer } from 'ws';
  
  export class YjsServer {
    private wss: WebSocketServer;
    private docs: Map<string, WSSharedDoc> = new Map();
    
    constructor(port: number) {
      this.wss = new WebSocketServer({ port });
      this.setupWebSocketServer();
    }
    
    private setupWebSocketServer(): void {
      this.wss.on('connection', (ws: WebSocket, req) => {
        const docId = this.getDocIdFromRequest(req);
        const userId = this.getUserIdFromRequest(req);
        
        if (!docId || !userId) {
          ws.close();
          return;
        }
        
        this.setupWSConnection(ws, docId, userId);
      });
    }
    
    private setupWSConnection(ws: WebSocket, docId: string, userId: string): void {
      ws.binaryType = 'arraybuffer';
      
      // Get or create shared doc
      const doc = this.getOrCreateDoc(docId);
      doc.conns.set(ws, new Set());
      
      // Set up message handler
      ws.on('message', (message: ArrayBuffer) => {
        this.handleMessage(ws, doc, new Uint8Array(message));
      });
      
      // Clean up on close
      ws.on('close', () => {
        doc.conns.delete(ws);
        if (doc.conns.size === 0) {
          // Persist and clean up after 5 minutes of inactivity
          setTimeout(() => {
            if (doc.conns.size === 0) {
              this.persistAndCleanup(docId, doc);
            }
          }, 5 * 60 * 1000);
        }
      });
      
      // Send sync step 1
      const encoder = syncProtocol.createSyncMessage();
      syncProtocol.writeSyncStep1(encoder, doc.doc);
      ws.send(encoder);
    }
    
    private handleMessage(ws: WebSocket, doc: WSSharedDoc, message: Uint8Array): void {
      const encoder = syncProtocol.createEncoder();
      const decoder = syncProtocol.createDecoder(message);
      const messageType = syncProtocol.readSyncMessageType(decoder);
      
      switch (messageType) {
        case syncProtocol.messageYjsSyncStep1:
          syncProtocol.readSyncStep1(decoder, encoder, doc.doc);
          break;
        case syncProtocol.messageYjsSyncStep2:
          syncProtocol.readSyncStep2(decoder, doc.doc);
          break;
        case syncProtocol.messageYjsUpdate:
          syncProtocol.readUpdate(decoder, doc.doc);
          break;
      }
      
      // Broadcast to other clients
      if (encoder.length > 0) {
        const message = encoder.toUint8Array();
        doc.conns.forEach((_, conn) => {
          if (conn !== ws && conn.readyState === WebSocket.OPEN) {
            conn.send(message);
          }
        });
      }
    }
    
    private getOrCreateDoc(docId: string): WSSharedDoc {
      if (!this.docs.has(docId)) {
        const doc = new Y.Doc();
        const wsDoc = new WSSharedDoc(doc);
        this.docs.set(docId, wsDoc);
        
        // Load persisted state
        this.loadDocFromDB(docId, doc);
      }
      return this.docs.get(docId)!;
    }
    
    private async loadDocFromDB(docId: string, doc: Y.Doc): Promise<void> {
      // Load from database
      const stored = await prisma.letterCollaboration.findUnique({
        where: { letterId: docId },
      });
      
      if (stored?.yjsState) {
        Y.applyUpdate(doc, Buffer.from(stored.yjsState, 'base64'));
      }
    }
    
    private async persistAndCleanup(docId: string, wsDoc: WSSharedDoc): Promise<void> {
      // Persist to database
      const state = Y.encodeStateAsUpdate(wsDoc.doc);
      await prisma.letterCollaboration.upsert({
        where: { letterId: docId },
        update: { yjsState: Buffer.from(state).toString('base64') },
        create: {
          letterId: docId,
          yjsState: Buffer.from(state).toString('base64'),
        },
      });
      
      // Clean up
      this.docs.delete(docId);
    }
  }
  
  class WSSharedDoc {
    doc: Y.Doc;
    conns: Map<WebSocket, Set<number>>;
    
    constructor(doc: Y.Doc) {
      this.doc = doc;
      this.conns = new Map();
    }
  }
  ```

- [ ] `/backend/database/migrations/003_collaboration.sql` — Yjs persistence (NEW)
  ```sql
  CREATE TABLE letter_collaboration (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      letter_id UUID NOT NULL REFERENCES demand_letters(id) ON DELETE CASCADE,
      yjs_state TEXT NOT NULL, -- Base64-encoded Yjs state
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(letter_id)
  );
  
  CREATE INDEX idx_letter_collab_letter ON letter_collaboration(letter_id);
  ```

#### Frontend Yjs Integration

- [ ] `/frontend/src/components/editor/CollaborativeEditor.tsx` — TipTap + Yjs
  ```typescript
  import { useEditor, EditorContent } from '@tiptap/react';
  import StarterKit from '@tiptap/starter-kit';
  import Collaboration from '@tiptap/extension-collaboration';
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
  import * as Y from 'yjs';
  import { WebsocketProvider } from 'y-websocket';
  
  export function CollaborativeEditor({ letterId, user }: Props) {
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    
    useEffect(() => {
      const ydoc = new Y.Doc();
      const wsProvider = new WebsocketProvider(
        'ws://localhost:4001', // Separate WebSocket server
        letterId,
        ydoc,
        {
          params: { userId: user.id, token: user.token },
        }
      );
      
      setProvider(wsProvider);
      
      return () => {
        wsProvider.destroy();
      };
    }, [letterId]);
    
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          history: false, // Yjs handles history
        }),
        Collaboration.configure({
          document: provider?.document,
        }),
        CollaborationCursor.configure({
          provider: provider,
          user: {
            name: `${user.firstName} ${user.lastName}`,
            color: getUserColor(user.id),
          },
        }),
      ],
    });
    
    return (
      <div className="relative">
        <EditorContent editor={editor} />
        <PresenceIndicator provider={provider} />
      </div>
    );
  }
  ```

**Remove:** All custom OT engine files, conflict resolution, operation transform logic

**Keep:** Comments system, change tracking visualization (but simplified - just show who changed what)

---

## Frontend State Management [UPDATED]

**Use React Query for all server state, drop Redux slices**

### Updated Approach

- [ ] `/frontend/src/api/queries/documents.ts` — React Query hooks
  ```typescript
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
  
  export function useDocuments(firmId: string) {
    return useQuery({
      queryKey: ['documents', firmId],
      queryFn: () => api.get(`/documents?firmId=${firmId}`),
    });
  }
  
  export function useUploadDocument() {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: (file: File) => api.upload('/upload', file),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      },
    });
  }
  ```

- [ ] `/frontend/src/store/ui.slice.ts` — Keep Redux/Zustand ONLY for UI state
  ```typescript
  import { create } from 'zustand';
  
  interface UIState {
    sidebarOpen: boolean;
    activeModal: string | null;
    toasts: Toast[];
    setSidebarOpen: (open: boolean) => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
    addToast: (toast: Toast) => void;
  }
  
  export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    activeModal: null,
    toasts: [],
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    openModal: (modalId) => set({ activeModal: modalId }),
    closeModal: () => set({ activeModal: null }),
    addToast: (toast) => set((state) => ({
      toasts: [...state.toasts, toast],
    })),
  }));
  ```

**Remove from original plan:**
- `/frontend/src/store/documents.slice.ts` ❌
- `/frontend/src/store/templates.slice.ts` ❌
- `/frontend/src/store/letters.slice.ts` ❌

---

## PR-11: Word Export [FOCUSED]
**Complexity:** Medium  
**Estimated Time:** 3-4 days (reduced from 4-5)

### Simplified Approach

**DOCX first and only. PDF export moved to P2.**

- [ ] `/backend/services/export/docx-generator.ts` — Use docxtemplater
  ```typescript
  import Docxtemplater from 'docxtemplater';
  import PizZip from 'pizzip';
  import * as fs from 'fs';
  
  export class DocxGenerator {
    async generateFromLetter(letter: DemandLetter, firm: Firm): Promise<Buffer> {
      // Load template
      const templatePath = firm.letterheadTemplate || './templates/default-letterhead.docx';
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      
      // Render with data
      doc.render({
        firmName: firm.name,
        firmAddress: firm.address,
        firmPhone: firm.phone,
        letterContent: letter.content,
        date: new Date().toLocaleDateString(),
        // Add more template variables as needed
      });
      
      const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      return buf;
    }
  }
  ```

**Remove:** PDF export logic (move to separate P2 PR after DOCX is validated)

---

## DMS Integration Stubs [NEW - P2]

- [ ] `/backend/services/connectors/dms-interface.ts` — DMS connector interface
  ```typescript
  export interface IDMSConnector {
    name: string; // 'iManage', 'NetDocuments', 'SharePoint'
    
    /**
     * Upload document to DMS
     */
    uploadDocument(
      document: Buffer,
      metadata: DMSMetadata
    ): Promise<{ dmsId: string; url: string }>;
    
    /**
     * Download document from DMS
     */
    downloadDocument(dmsId: string): Promise<Buffer>;
    
    /**
     * Search documents in DMS
     */
    searchDocuments(query: DMSSearchQuery): Promise<DMSDocument[]>;
  }
  
  export interface DMSMetadata {
    filename: string;
    matterNumber?: string;
    clientName?: string;
    documentType: string;
    author: string;
  }
  ```

- [ ] `/backend/services/connectors/imanage-stub.ts` — iManage stub
  ```typescript
  import { IDMSConnector } from './dms-interface';
  
  export class IManageConnector implements IDMSConnector {
    name = 'iManage';
    
    async uploadDocument(document: Buffer, metadata: DMSMetadata) {
      // TODO: Implement iManage Work API integration
      throw new Error('iManage integration not yet implemented');
    }
    
    async downloadDocument(dmsId: string): Promise<Buffer> {
      throw new Error('iManage integration not yet implemented');
    }
    
    async searchDocuments(query: DMSSearchQuery) {
      throw new Error('iManage integration not yet implemented');
    }
  }
  ```

---

## Updated PR Timeline

### Phase 1: Foundation + Walking Skeleton (Weeks 1-2)

**Week 1:**
- PR-01: Infrastructure (Days 1-5)
- PR-07: Design System (Days 1-3, parallel)

**Week 2:**
- PR-02: Auth (Days 6-10)
- PR-05: Templates seed data (Day 10)
- **Walking Skeleton Demo** (Day 10 EOD)

### Phase 2: Core Features (Weeks 3-6)

**Week 3:**
- PR-03: Document Upload (Days 11-16)
- PR-04: AI Integration (Days 11-16, parallel)

**Week 4-5:**
- PR-06: Generation Engine (Days 17-25)
- PR-08: Upload UI (Days 17-21, parallel)

**Week 6:**
- PR-09: Template UI (Days 26-30)
- PR-10: Editor UI (Days 26-32)

### Phase 3: Export & Collaboration (Weeks 7-8)

**Week 7:**
- PR-11: DOCX Export (Days 33-35)

**Week 8:**
- PR-12: Yjs Collaboration (Days 36-42)

### Phase 4: Polish (Weeks 9-10)

**Week 9:**
- PR-13: Dashboard (Days 43-47)
- PR-14: Testing (Days 43-47, parallel)

**Week 10:**
- PR-15: Performance (Days 48-52)
- Final QA & Launch Prep

---

## Success Metrics (Updated)

### Walking Skeleton (Week 2):
- [ ] Upload PDF → AI draft → DOCX download works end-to-end
- [ ] All audit events logged
- [ ] SHA-256 hashes stored
- [ ] Encryption verified

### Beta Launch (Week 10):
- [ ] 50% reduction in drafting time (measured)
- [ ] Zero data breaches
- [ ] <2s API response times
- [ ] 80% test coverage
- [ ] SSO interfaces ready (even if disabled)
- [ ] OCR working on scanned PDFs

---

## Key Changes Summary

✅ **Security:** KMS encryption, VPC endpoints, audit logging in PR-01  
✅ **Legal:** SHA-256 hashing, OCR fallback, chain-of-custody in PR-03  
✅ **Architecture:** Lambda-first with provisioned concurrency  
✅ **Collaboration:** Yjs instead of custom OT (faster, simpler)  
✅ **State:** React Query for server data, Zustand for UI only  
✅ **Export:** DOCX-only (PDF moved to P2)  
✅ **Future-proof:** SSO/SCIM stubs, DMS connector interfaces  
✅ **Validation:** Walking skeleton milestone at Week 2  

**Net scope:** ~Same (some additions, some removals, overall balanced)
**Timeline:** Still 10-12 weeks with 2-3 developers
**Quality:** Higher (better security, legal compliance, simpler collaboration)
