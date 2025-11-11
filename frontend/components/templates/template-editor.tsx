"use client"

import { useState } from "react"
import { Plus, X, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface Variable {
  id: string
  name: string
  placeholder: string
  required: boolean
}

interface Template {
  id: string
  name: string
  content: string
  variables: Variable[]
  createdAt: Date
  updatedAt: Date
}

export function TemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: "1",
      name: "Standard Demand Letter",
      content:
        "Dear {{recipientName}},\n\nThis is to formally demand payment of {{amount}} due to {{reason}}.\n\nPlease remit payment within {{days}} days.\n\nRegards,\n{{senderName}}",
      variables: [
        { id: "1", name: "recipientName", placeholder: "Recipient Name", required: true },
        { id: "2", name: "amount", placeholder: "Amount Due", required: true },
        { id: "3", name: "reason", placeholder: "Reason for Demand", required: true },
        { id: "4", name: "days", placeholder: "Days to Pay", required: true },
        { id: "5", name: "senderName", placeholder: "Your Name", required: true },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(templates[0])
  const [editingContent, setEditingContent] = useState(templates[0].content)
  const [newVarName, setNewVarName] = useState("")
  const [newVarPlaceholder, setNewVarPlaceholder] = useState("")

  const handleAddVariable = () => {
    if (!newVarName) return
    const newVar: Variable = {
      id: Math.random().toString(36).substr(2, 9),
      name: newVarName,
      placeholder: newVarPlaceholder || newVarName,
      required: true,
    }
    if (selectedTemplate) {
      const updated = {
        ...selectedTemplate,
        variables: [...selectedTemplate.variables, newVar],
        updatedAt: new Date(),
      }
      setSelectedTemplate(updated)
      setTemplates(templates.map((t) => (t.id === updated.id ? updated : t)))
    }
    setNewVarName("")
    setNewVarPlaceholder("")
  }

  const handleRemoveVariable = (varId: string) => {
    if (selectedTemplate) {
      const updated = {
        ...selectedTemplate,
        variables: selectedTemplate.variables.filter((v) => v.id !== varId),
        updatedAt: new Date(),
      }
      setSelectedTemplate(updated)
      setTemplates(templates.map((t) => (t.id === updated.id ? updated : t)))
    }
  }

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Template",
      content: "",
      variables: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTemplates([...templates, newTemplate])
    setSelectedTemplate(newTemplate)
    setEditingContent("")
  }

  const handleUpdateContent = (content: string) => {
    setEditingContent(content)
    if (selectedTemplate) {
      const updated = {
        ...selectedTemplate,
        content,
        updatedAt: new Date(),
      }
      setSelectedTemplate(updated)
      setTemplates(templates.map((t) => (t.id === updated.id ? updated : t)))
    }
  }

  const handleCloneTemplate = (template: Template) => {
    const cloned: Template = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      name: `${template.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTemplates([...templates, cloned])
  }

  return (
    <div className="grid md:grid-cols-[250px_1fr] gap-6">
      {/* Templates List */}
      <div className="space-y-2">
        <Button onClick={handleCreateTemplate} className="w-full gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              setSelectedTemplate(template)
              setEditingContent(template.content)
            }}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTemplate?.id === template.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            <div className="truncate">{template.name}</div>
            <div className="text-xs opacity-75">{template.variables.length} variables</div>
          </button>
        ))}
      </div>

      {/* Editor */}
      {selectedTemplate && (
        <div className="space-y-6">
          <div>
            <label className="text-sm font-semibold block mb-2">Template Name</label>
            <Input
              value={selectedTemplate.name}
              onChange={(e) => {
                const updated = { ...selectedTemplate, name: e.target.value }
                setSelectedTemplate(updated)
                setTemplates(templates.map((t) => (t.id === updated.id ? updated : t)))
              }}
            />
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2">Content</label>
            <Textarea
              value={editingContent}
              onChange={(e) => handleUpdateContent(e.target.value)}
              placeholder="Enter your template content. Use {{variableName}} for dynamic fields."
              className="min-h-64 font-mono"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Wrap variable names in double curly braces, e.g. {"{{recipientName}}}"}
            </p>
          </div>

          {/* Variables Panel */}
          <Card className="p-4 border border-border">
            <h3 className="font-semibold mb-4">Template Variables</h3>
            <div className="space-y-3 mb-4">
              {selectedTemplate.variables.map((variable) => (
                <div key={variable.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-mono text-sm">
                      {"{{"}
                      {variable.name}
                      {"}}"}
                    </p>
                    <p className="text-xs text-muted-foreground">{variable.placeholder}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveVariable(variable.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Variable Form */}
            <div className="space-y-2 pt-4 border-t border-border">
              <Input
                placeholder="Variable name (e.g., recipientName)"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Placeholder text (optional)"
                value={newVarPlaceholder}
                onChange={(e) => setNewVarPlaceholder(e.target.value)}
                className="text-sm"
              />
              <Button onClick={handleAddVariable} className="w-full gap-2 bg-accent hover:bg-accent/90">
                <Plus className="w-4 h-4" />
                Add Variable
              </Button>
            </div>
          </Card>

          {/* Preview */}
          <Card className="p-4 border border-border bg-muted">
            <h3 className="font-semibold mb-3">Preview</h3>
            <div className="whitespace-pre-wrap text-sm font-mono text-muted-foreground bg-background p-4 rounded border border-border overflow-auto max-h-48">
              {editingContent}
            </div>
          </Card>

          <div className="flex gap-2">
            <Button onClick={() => handleCloneTemplate(selectedTemplate)} variant="outline" className="gap-2">
              <Copy className="w-4 h-4" />
              Clone
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
