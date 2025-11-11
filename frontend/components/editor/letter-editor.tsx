"use client"

import { useState } from "react"
import { Bold, Italic, Underline, Type, RotateCcw, Download, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"

interface LetterVersion {
  id: string
  content: string
  createdAt: Date
  tone?: string
  status: "draft" | "refined" | "final"
}

export function LetterEditor() {
  const [content, setContent] = useState(
    "Dear Recipient,\n\nThis letter serves as formal notice of demand for payment of the sum due and owing.\n\n[Details of Claim]\n\nPlease remit full payment within 30 days of receipt of this letter.\n\nRegards,\nYour Name",
  )
  const [versions, setVersions] = useState<LetterVersion[]>([
    {
      id: "1",
      content: "Original draft",
      createdAt: new Date(),
      status: "draft",
    },
  ])
  const [showVersions, setShowVersions] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<LetterVersion | null>(null)
  const [refinementPanel, setRefinementPanel] = useState(true)
  const [selectedRefine, setSelectedRefine] = useState<"tone" | "length" | "emphasis" | null>(null)

  const toneOptions = [
    { id: "formal", label: "More Formal", description: "Increase legal formality" },
    { id: "aggressive", label: "More Assertive", description: "Strengthen the demand" },
    { id: "concise", label: "More Concise", description: "Reduce length while keeping key points" },
  ]

  const lengthOptions = [
    { id: "shorter", label: "Shorter", description: "Reduce by 25%" },
    { id: "longer", label: "Longer", description: "Add more detail" },
  ]

  const emphasisOptions = [
    { id: "legal", label: "Add Legal References", description: "Cite relevant statutes" },
    { id: "consequences", label: "Emphasize Consequences", description: "Highlight legal action" },
    { id: "deadline", label: "Tighten Deadline", description: "More urgent payment request" },
  ]

  const handleApplyRefinement = (type: string) => {
    const newVersion: LetterVersion = {
      id: Math.random().toString(36).substr(2, 9),
      content: content,
      createdAt: new Date(),
      tone: type,
      status: "refined",
    }
    setVersions([...versions, newVersion])
  }

  const saveVersion = () => {
    const newVersion: LetterVersion = {
      id: Math.random().toString(36).substr(2, 9),
      content: content,
      createdAt: new Date(),
      status: "draft",
    }
    setVersions([...versions, newVersion])
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      {/* Main Editor */}
      <div className="space-y-4">
        {/* Toolbar */}
        <Card className="p-3 bg-card border border-border flex items-center gap-1 flex-wrap">
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Bold className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Italic className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Underline className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 border-r border-border pr-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Type className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVersions(!showVersions)}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Versions ({versions.length})
            </Button>
          </div>
        </Card>

        {/* Letter Textarea */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Your demand letter..."
          className="min-h-96 font-serif text-base leading-relaxed p-6"
        />

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={saveVersion} variant="outline" className="gap-2 bg-transparent">
            <RotateCcw className="w-4 h-4" />
            Save Version
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4" />
            Export as PDF
          </Button>
          <Button className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Send className="w-4 h-4" />
            Send
          </Button>
        </div>
      </div>

      {/* Right Sidebar - Refinement Panel */}
      {refinementPanel && (
        <div className="space-y-4">
          <Card className="p-4 border border-border">
            <h3 className="font-semibold mb-4">AI Refinement</h3>

            {/* Tone */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">TONE</span>
                {selectedRefine === "tone" && <span className="text-xs text-primary">Customizing...</span>}
              </div>
              <div className="space-y-2">
                {toneOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedRefine("tone")
                      handleApplyRefinement(opt.id)
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-border text-sm"
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Length */}
            <div className="mb-4 pb-4 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">LENGTH</span>
              </div>
              <div className="space-y-2">
                {lengthOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleApplyRefinement(opt.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-border text-sm"
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Emphasis */}
            <div className="pb-4 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">EMPHASIS</span>
              </div>
              <div className="space-y-2">
                {emphasisOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleApplyRefinement(opt.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-border text-sm"
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Version History */}
          {showVersions && (
            <Card className="p-4 border border-border">
              <h4 className="font-semibold mb-3 text-sm">Version History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {versions.map((version, idx) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className="w-full text-left p-2 rounded hover:bg-muted transition-colors border border-transparent hover:border-border text-xs"
                  >
                    <div className="font-medium">Version {idx + 1}</div>
                    <div className="text-muted-foreground text-xs">{formatDate(version.createdAt)}</div>
                    {version.tone && <div className="text-primary text-xs mt-1">{version.tone}</div>}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
