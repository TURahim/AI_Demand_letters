import { AppLayout } from "@/components/layout/app-layout"
import { GenerationWizard } from "@/components/generation-wizard"

export default function GenerationPage() {
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-3xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Generate Demand Letter</h1>
            <p className="text-muted-foreground">Follow the steps to create a professional demand letter</p>
          </div>

          <GenerationWizard />
        </div>
      </div>
    </AppLayout>
  )
}
