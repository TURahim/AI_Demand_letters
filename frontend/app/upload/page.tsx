import { AppLayout } from "@/components/layout/app-layout"
import { DocumentUpload } from "@/components/upload/document-upload"

export default function UploadPage() {
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
            <p className="text-muted-foreground">Add reference materials to use in your demand letters</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-8">
            <DocumentUpload />
          </div>

          {/* Tips */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Accepted Formats</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• PDF</li>
                <li>• DOCX</li>
                <li>• TXT</li>
              </ul>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">File Limits</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Max 25MB per file</li>
                <li>• Unlimited documents</li>
              </ul>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Usage Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use for case references</li>
                <li>• Store contract templates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
