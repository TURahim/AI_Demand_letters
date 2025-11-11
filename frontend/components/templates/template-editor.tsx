'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { templatesApi } from '@/src/api/templates.api'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface TemplateEditorProps {
  templateId?: string | null
  onClose: () => void
}

export function TemplateEditor({ templateId, onClose }: TemplateEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const { data: templateData, loading } = useApi(
    () => {
      if (!templateId) return Promise.resolve(null)
      return templatesApi.getTemplate(templateId)
    },
    { immediate: !!templateId }
  )

  const { mutate: createTemplate } = useMutation(templatesApi.createTemplate)
  const { mutate: updateTemplate } = useMutation(templatesApi.updateTemplate)

  useEffect(() => {
    if (templateData?.template) {
      const template = templateData.template
      setName(template.name)
      setDescription(template.description || '')
      setCategory(template.category || '')
      setContent(typeof template.content === 'string' ? template.content : JSON.stringify(template.content))
      setIsPublic(template.isPublic)
    }
  }, [templateData])

  const handleSave = async () => {
    if (!name || !content) {
      toast.error('Name and content are required')
      return
    }

    const templateData = {
      name,
      description: description || undefined,
      category: category || undefined,
      content: content, // Store as string for now
      isPublic,
    }

    if (templateId) {
      // Update existing
      const result = await updateTemplate(templateId, templateData)
      if (result.success) {
        toast.success('Template updated successfully')
        onClose()
      } else {
        toast.error(result.error || 'Failed to update template')
      }
    } else {
      // Create new
      const result = await createTemplate(templateData)
      if (result.success) {
        toast.success('Template created successfully')
        onClose()
      } else {
        toast.error(result.error || 'Failed to create template')
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{templateId ? 'Edit Template' : 'New Template'}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Template Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Standard Demand Letter"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this template"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Personal Injury, Contract"
          />
        </div>

        <div>
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your template content. Use {{variableName}} for dynamic fields."
            className="min-h-64 font-mono"
            required
          />
          <p className="text-xs text-muted-foreground mt-2">
            Tip: Wrap variable names in double curly braces, e.g. {'{{recipientName}}'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4"
          />
          <Label htmlFor="isPublic" className="cursor-pointer">
            Make this template public (visible to all firms)
          </Label>
        </div>
      </div>

      {/* Preview */}
      <Card className="p-4 border border-border bg-muted">
        <h3 className="font-semibold mb-3">Preview</h3>
        <div className="whitespace-pre-wrap text-sm font-mono text-muted-foreground bg-background p-4 rounded border border-border overflow-auto max-h-48">
          {content || 'Enter content to see preview...'}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="gap-2 bg-primary hover:bg-primary/90">
          <Save className="w-4 h-4" />
          {templateId ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  )
}
