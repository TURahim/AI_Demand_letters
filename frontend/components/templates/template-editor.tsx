'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { templatesApi, type Template } from '@/src/api/templates.api'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface TemplateEditorProps {
  templateId?: string | null
  initialTemplate?: Template | null
  onClose: () => void
}

/**
 * Normalize template content to string format
 * Prefers string content, falls back to JSON.stringify only if necessary
 */
function normalizeContent(content: any): string {
  if (typeof content === 'string') {
    return content
  }
  // Only use JSON.stringify if content is an object/array
  if (content && typeof content === 'object') {
    // Try to extract string content if it exists
    if ('text' in content && typeof content.text === 'string') {
      return content.text
    }
    if ('content' in content && typeof content.content === 'string') {
      return content.content
    }
    // Last resort: stringify with formatting
    return JSON.stringify(content, null, 2)
  }
  return String(content || '')
}

/**
 * Validate template variable syntax
 * Checks for malformed patterns like {{{broken}}} or {{ missing } braces
 */
function validateTemplateVariables(content: string): { valid: boolean; error?: string } {
  // Valid pattern: {{variableName}} with optional whitespace
  const validPattern = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g
  
  // Find all potential variable patterns
  const allBraces = content.match(/\{\{|\}\}/g) || []
  const openBraces = allBraces.filter(b => b === '{{').length
  const closeBraces = allBraces.filter(b => b === '}}').length
  
  // Check for mismatched braces
  if (openBraces !== closeBraces) {
    return {
      valid: false,
      error: 'Mismatched braces: Make sure all {{ are closed with }}',
    }
  }
  
  // Check for triple braces or other malformed patterns
  const tripleBracePattern = /\{\{\{|\}\}\}/
  if (tripleBracePattern.test(content)) {
    return {
      valid: false,
      error: 'Invalid variable syntax: Found triple braces. Use {{variableName}} format.',
    }
  }
  
  // Check for unclosed single braces
  const unclosedPattern = /\{\{[^}]*$|\{[^}]*\}\}/
  if (unclosedPattern.test(content)) {
    return {
      valid: false,
      error: 'Unclosed variable: Make sure variables use {{variableName}} format.',
    }
  }
  
  // Check for invalid variable names (non-alphanumeric/underscore)
  const invalidVarPattern = /\{\{\s*[^a-zA-Z0-9_\s]+\s*\}\}/
  if (invalidVarPattern.test(content)) {
    return {
      valid: false,
      error: 'Invalid variable name: Variables can only contain letters, numbers, and underscores.',
    }
  }
  
  return { valid: true }
}

export function TemplateEditor({ templateId, initialTemplate = null, onClose }: TemplateEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPublicDialog, setShowPublicDialog] = useState(false)
  const [pendingPublicValue, setPendingPublicValue] = useState(false)
  
  // Track if we've initialized to prevent re-initialization
  const initializedRef = useRef(false)

  const shouldFetch = !!templateId && !initialTemplate

  const { data: templateData, loading } = useApi(
    () => templatesApi.getTemplate(templateId as string),
    { immediate: shouldFetch }
  )

  const { mutate: createTemplate } = useMutation(
    (data: Parameters<typeof templatesApi.createTemplate>[0]) => templatesApi.createTemplate(data)
  )
  const { mutate: updateTemplate } = useMutation(
    ({ id, data }: { id: string; data: Parameters<typeof templatesApi.updateTemplate>[1] }) =>
      templatesApi.updateTemplate(id, data)
  )

  // Single initialization pipeline: initialTemplate → API data → never re-initialize
  useEffect(() => {
    // Only initialize once
    if (initializedRef.current) return

    const template: Template | null =
      initialTemplate ?? (templateData && 'template' in templateData ? (templateData as any).template : null)

    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setCategory(template.category || '')
      setContent(normalizeContent(template.content))
      setIsPublic(template.isPublic)
      initializedRef.current = true
    } else if (!shouldFetch && !loading) {
      // New template - mark as initialized
      initializedRef.current = true
    }
  }, [initialTemplate, templateData, shouldFetch, loading])

  // Handle public toggle with confirmation dialog
  const handlePublicToggle = (checked: boolean) => {
    if (checked && !isPublic) {
      // Show confirmation dialog when enabling public
      setPendingPublicValue(true)
      setShowPublicDialog(true)
    } else {
      // Allow disabling without confirmation
      setIsPublic(false)
    }
  }

  const confirmPublicToggle = () => {
    setIsPublic(true)
    setShowPublicDialog(false)
    setPendingPublicValue(false)
  }

  const cancelPublicToggle = () => {
    setShowPublicDialog(false)
    setPendingPublicValue(false)
  }

  // Keyboard shortcut handler
  const handleSave = useCallback(async () => {
    if (saving) return

    // Validation
    if (!name.trim()) {
      toast.error('Template name is required')
      return
    }

    if (!content.trim()) {
      toast.error('Template content is required')
      return
    }

    // Validate template variables
    const validation = validateTemplateVariables(content)
    if (!validation.valid) {
      toast.error(validation.error || 'Invalid template variable syntax')
      return
    }

    setSaving(true)

    try {
      // Process category: split comma-separated values, trim, filter empty
      const categoryString = category
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .join(',') || undefined

      const templateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: categoryString,
        content: content, // Always send as string
        isPublic,
      }

      let result
      if (templateId) {
        // Update existing
        result = await updateTemplate({ id: templateId, data: templateData })
      } else {
        // Create new
        result = await createTemplate(templateData)
      }

      if (result.success) {
        toast.success(templateId ? 'Template updated successfully' : 'Template created successfully')
        onClose()
      } else {
        // Improved error handling
        const errorMessage =
          result.error ||
          (result as any).message ||
          (templateId ? 'Failed to update template' : 'Failed to create template')
        toast.error(errorMessage)
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }, [name, description, category, content, isPublic, templateId, saving, updateTemplate, createTemplate, onClose])

  // Keyboard shortcut: Cmd+S / Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  // Only show skeleton when we actually need to fetch remote data
  if (shouldFetch && loading && !initializedRef.current) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{templateId ? 'Edit Template' : 'New Template'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
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
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Personal Injury, Contract (comma-separated)"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple categories with commas
            </p>
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
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Wrap variable names in double curly braces, e.g. {'{{recipientName}}'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={handlePublicToggle}
              disabled={saving}
            />
            <Label htmlFor="isPublic" className="cursor-pointer">
              Make this template public (visible to all firms)
            </Label>
          </div>
        </div>

        {/* Preview */}
        <Card className="p-4 border border-border bg-muted">
          <h3 className="font-semibold mb-3">Preview</h3>
          <div className="break-words whitespace-pre-wrap overflow-auto max-h-64 text-sm font-mono text-muted-foreground bg-background p-4 rounded border border-border">
            {content || 'Enter content to see preview...'}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </div>

      {/* Public Template Confirmation Dialog */}
      <AlertDialog open={showPublicDialog} onOpenChange={setShowPublicDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make Template Public?</AlertDialogTitle>
            <AlertDialogDescription>
              Public templates are visible to <strong>all firms</strong>. Are you sure you want to make this
              template public?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPublicToggle}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublicToggle}>Make Public</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
