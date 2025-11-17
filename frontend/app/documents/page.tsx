'use client'

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { DocumentList } from "@/components/documents/document-list"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DocumentUpload } from "@/components/upload/document-upload"

export default function DocumentsPage() {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-6xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Documents</h1>
              <p className="text-muted-foreground">Upload and manage reference materials for your demand letters</p>
            </div>
            <Button 
              className="gap-2 bg-primary hover:bg-primary/90"
              onClick={() => setShowUpload(true)}
            >
              <Upload className="w-4 h-4" />
              Upload New
            </Button>
          </div>

          {/* Document List Component */}
          <DocumentList showActions={true} />
        </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add reference materials to use in your demand letters. Supported formats: PDF, DOCX, TXT (up to 25MB)
            </DialogDescription>
          </DialogHeader>
          <DocumentUpload onUploadComplete={() => setShowUpload(false)} />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
