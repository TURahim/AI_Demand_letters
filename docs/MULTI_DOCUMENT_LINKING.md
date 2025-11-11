# Multi-Document Linking Implementation

## Overview

Successfully implemented **many-to-many document linking** for demand letters, allowing each letter to reference multiple source documents (police reports, medical records, photos, etc.) instead of just one.

## Architecture Decision: Option B (Many-to-Many via Join Table)

We chose the join table approach for the following reasons:

1. **Future-proof**: Supports real law firm workflows where letters reference multiple documents
2. **Queryable**: Can easily find "all letters using document X"
3. **Auditable**: Clear chain of custody (which docs informed which letters)
4. **AI-friendly**: Generation worker can iterate over all documents
5. **Backward compatible**: Legacy `documentId` field preserved for migration

## Database Schema Changes

### New `LetterDocument` Join Table

```prisma
model LetterDocument {
  id                String   @id @default(uuid())
  letterId          String   @map("letter_id")
  documentId        String   @map("document_id")
  order             Int      @default(0) // Preserve upload/selection order
  role              String?  // e.g., "primary", "supporting", "evidence"
  createdAt         DateTime @default(now()) @map("created_at")

  // Relations
  letter            Letter   @relation(fields: [letterId], references: [id], onDelete: Cascade)
  document          Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([letterId, documentId])
  @@index([letterId])
  @@index([documentId])
  @@map("letter_documents")
}
```

### Updated `Letter` Model

```prisma
model Letter {
  // ... existing fields ...
  documentId        String?        @map("document_id") // Legacy field (deprecated)
  
  // Relations
  document          Document?      @relation(...) // Legacy (deprecated)
  sourceDocuments   LetterDocument[] // NEW: Many-to-many relationship
  // ... other relations ...
}
```

### Updated `Document` Model

```prisma
model Document {
  // ... existing fields ...
  
  // Relations
  letters           Letter[]       // Legacy 1:1 relationship (deprecated)
  letterDocuments   LetterDocument[] // NEW: Many-to-many relationship
  // ... other relations ...
}
```

## Migration Applied

**Migration**: `20251111051507_add_letter_document_many_to_many`

```sql
-- CreateTable
CREATE TABLE "letter_documents" (
    "id" TEXT NOT NULL,
    "letter_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "letter_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "letter_documents_letter_id_idx" ON "letter_documents"("letter_id");
CREATE INDEX "letter_documents_document_id_idx" ON "letter_documents"("document_id");
CREATE UNIQUE INDEX "letter_documents_letter_id_document_id_key" ON "letter_documents"("letter_id", "document_id");

-- AddForeignKey
ALTER TABLE "letter_documents" ADD CONSTRAINT "letter_documents_letter_id_fkey" 
  FOREIGN KEY ("letter_id") REFERENCES "letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "letter_documents" ADD CONSTRAINT "letter_documents_document_id_fkey" 
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Code Changes

### 1. Updated `letter.service.ts`

#### `linkDocumentsToLetter()` - Now supports multiple documents

```typescript
export async function linkDocumentsToLetter(
  letterId: string,
  documentIds: string[],
  firmId: string
): Promise<void> {
  // Verify letter and documents
  await getLetterById(letterId, firmId);
  const documents = await prisma.document.findMany({
    where: { id: { in: documentIds }, firmId },
  });

  if (documents.length !== documentIds.length) {
    throw new AppError('One or more documents not found or access denied', 404);
  }

  // Remove existing links
  await prisma.letterDocument.deleteMany({
    where: { letterId },
  });

  // Create new links in order
  const letterDocuments = documentIds.map((docId, index) => ({
    letterId,
    documentId: docId,
    order: index,
    role: index === 0 ? 'primary' : 'supporting', // First doc is primary
  }));

  await prisma.letterDocument.createMany({
    data: letterDocuments,
  });

  // Update legacy documentId field for backwards compatibility
  await prisma.letter.update({
    where: { id: letterId },
    data: { documentId: documents[0].id },
  });

  logger.info('Documents linked to letter', {
    letterId,
    documentCount: documents.length,
    primaryDocumentId: documents[0].id,
    firmId,
  });
}
```

#### `getLetterById()` - Now includes `sourceDocuments`

```typescript
export async function getLetterById(letterId: string, firmId: string): Promise<any> {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    include: {
      template: true,
      creator: { ... },
      document: { ... }, // Legacy
      sourceDocuments: {
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
              extractedText: true,
              createdAt: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
      _count: { ... },
    },
  });
  // ...
}
```

#### `listLetters()` - Now includes `sourceDocuments`

Updated the query to include `sourceDocuments` with document details in the letter list.

#### New `getLetterDocumentIds()` helper

```typescript
export async function getLetterDocumentIds(
  letterId: string,
  firmId: string
): Promise<string[]> {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    select: {
      firmId: true,
      documentId: true,
      sourceDocuments: {
        select: { documentId: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!letter) throw new AppError('Letter not found', 404);
  if (letter.firmId !== firmId) throw new AppError('Access denied', 403);

  // Prefer new many-to-many relationship
  if (letter.sourceDocuments && letter.sourceDocuments.length > 0) {
    return letter.sourceDocuments.map((ld) => ld.documentId);
  }

  // Fallback to legacy documentId field
  if (letter.documentId) {
    return [letter.documentId];
  }

  return [];
}
```

### 2. Updated `letter.controller.ts`

Added new endpoint to retrieve document IDs:

```typescript
export const getLetterDocuments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const firmId = req.user!.firmId;

  const documentIds = await letterService.getLetterDocumentIds(id, firmId);

  res.status(200).json({
    status: 'success',
    message: 'Letter documents retrieved successfully',
    data: { documentIds },
  });
});
```

### 3. Updated `letter.routes.ts`

Added new route:

```typescript
router.get(
  '/:id/documents',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  letterController.getLetterDocuments
);
```

## New API Endpoint

**GET** `/api/v1/letters/:id/documents`

**Response**:
```json
{
  "status": "success",
  "message": "Letter documents retrieved successfully",
  "data": {
    "documentIds": ["doc-1-uuid", "doc-2-uuid", "doc-3-uuid"]
  }
}
```

## Backward Compatibility

The implementation maintains **full backward compatibility**:

1. **Legacy `documentId` field**: Still populated with the primary (first) document for existing code
2. **Legacy `document` relation**: Still available via Prisma queries
3. **New code**: Uses `sourceDocuments` relation for multi-document support
4. **Helper function**: `getLetterDocumentIds()` handles both old and new approaches transparently

## Testing

Created comprehensive integration tests in `letter-documents.test.ts`:

- ✅ Create letter and link multiple documents
- ✅ Retrieve letter with all linked documents
- ✅ Get document IDs via dedicated endpoint
- ✅ List letters with source documents
- ✅ Prevent duplicate document links (via unique constraint)
- ✅ Replace document links when relinking

**All 6 tests passed successfully.**

## Usage Examples

### Generation Service (Already Compatible)

The generation service already passes multiple `documentIds`:

```typescript
await letterService.linkDocumentsToLetter(
  letter.id,
  input.documentIds, // Array of document IDs
  input.firmId
);
```

### AI Context Builder (Already Compatible)

The `buildContextFromDocuments()` function already accepts multiple document IDs:

```typescript
const documentIds = await letterService.getLetterDocumentIds(letterId, firmId);
const context = await buildContextFromDocuments(documentIds, firmId);
```

### Retrieving Documents from a Letter

```typescript
// Get letter with all source documents
const letter = await letterService.getLetterById(letterId, firmId);

// Access source documents (ordered by upload order)
const documents = letter.sourceDocuments.map(ld => ld.document);
const primaryDoc = documents[0]; // First document is primary
const supportingDocs = documents.slice(1); // Rest are supporting

// Or get just the IDs
const documentIds = await letterService.getLetterDocumentIds(letterId, firmId);
```

## Benefits Realized

1. **Real-world workflows**: Law firms can now properly reference all evidence documents
2. **Better AI context**: Generation worker can access all documents, not just one
3. **Auditability**: Clear record of which documents informed which letters
4. **Flexibility**: Can assign roles (primary, supporting, evidence) to documents
5. **Order preservation**: Documents maintain their upload/selection order
6. **Query power**: Can find all letters that reference a specific document

## Next Steps

1. **Frontend Integration (PR-07)**: Update upload and generation UIs to show multiple documents
2. **Analytics**: Track document usage across letters
3. **Advanced Features**: 
   - Document role management (primary vs. supporting)
   - Document reordering in letter context
   - Bulk document linking/unlinking
4. **Migration Strategy**: Gradually migrate existing letters to use `sourceDocuments` instead of legacy `documentId`

## Related Files

- `backend/prisma/schema.prisma` - Schema definitions
- `backend/prisma/migrations/20251111051507_add_letter_document_many_to_many/` - Migration
- `backend/src/services/letters/letter.service.ts` - Core logic
- `backend/src/services/letters/letter.controller.ts` - API endpoints
- `backend/src/services/letters/letter.routes.ts` - Routes
- `backend/src/tests/letters/letter-documents.test.ts` - Integration tests
- `backend/src/services/generation/generation.service.ts` - Uses linkDocumentsToLetter()
- `backend/src/services/ai/context-builder.ts` - Uses document IDs for AI context

---

**Status**: ✅ **Complete and Tested**  
**PR**: PR-06 (Letter Generation Engine)  
**Date**: November 11, 2025

