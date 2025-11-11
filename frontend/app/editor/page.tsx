import { AppLayout } from "@/components/layout/app-layout"
import { LetterEditor } from "@/components/letter-editor"

export default function EditorPage() {
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Edit Letter</h1>
            <p className="text-muted-foreground">Refine your demand letter with AI-powered suggestions</p>
          </div>

          <LetterEditor />
        </div>
      </div>
    </AppLayout>
  )
}
