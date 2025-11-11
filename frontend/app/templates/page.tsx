import { AppLayout } from "@/components/layout/app-layout"
import { TemplateEditor } from "@/components/template-editor"

export default function TemplatesPage() {
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-6xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Templates</h1>
            <p className="text-muted-foreground">Create and manage demand letter templates with dynamic variables</p>
          </div>

          {/* Template Editor */}
          <TemplateEditor />
        </div>
      </div>
    </AppLayout>
  )
}
