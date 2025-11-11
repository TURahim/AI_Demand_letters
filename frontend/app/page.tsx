import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-primary bg-card sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-lg">Steno</span>
          </Link>
          <Button size="sm">Sign In</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-card via-background to-background">
        <div className="container max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-balance">
            Demand Letters,
            <span className="text-primary"> Instantly</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-balance">
            AI-powered demand letter generation for legal professionals. Save hours on drafting with intelligent
            templates and refinement tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Get Started
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Choose Steno</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Smart Templates", description: "Pre-built legal templates optimized for demand letters" },
              { title: "AI Refinement", description: "Polish your letters with tone, length, and emphasis controls" },
              { title: "Document Upload", description: "Upload case files and reference materials seamlessly" },
              { title: "Version History", description: "Track changes and compare different letter versions" },
              { title: "Quick Generation", description: "4-step wizard to generate professional letters" },
              { title: "Analytics", description: "Track your usage and optimize your workflow" },
            ].map((feature, i) => (
              <div key={i} className="p-6 border border-border rounded-lg bg-card hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2 text-primary">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-secondary">
        <div className="container max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-secondary-foreground">Ready to streamline your practice?</h2>
          <p className="text-secondary-foreground/80 mb-8">
            Join legal professionals saving hours every week with Steno.
          </p>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Steno. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
