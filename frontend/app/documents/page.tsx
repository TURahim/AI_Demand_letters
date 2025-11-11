import { AppLayout } from "@/components/layout/app-layout"
import { DocumentUpload } from "@/components/document-upload"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import Link from "next/link"

export default function DocumentsPage() {
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
            <Link href="/upload">
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Upload className="w-4 h-4" />
                Upload New
              </Button>
            </Link>
          </div>

          {/* Document Upload Component */}
          <DocumentUpload />
        </div>
      </div>
    </AppLayout>
  )
}
