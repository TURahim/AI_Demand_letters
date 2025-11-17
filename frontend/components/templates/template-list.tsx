'use client'

import { useState, useCallback } from 'react'
import { Template } from '@/src/api/templates.api'
import { templatesApi } from '@/src/api/templates.api'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { FileText, Plus, Edit, Trash2, Copy, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { TemplateEditor } from '@/components/templates/template-editor'

function parseCategoryTags(category?: string) {
  return category
    ?.split(',')
    .map((tag) => tag.trim())
    .filter(Boolean) ?? []
}

export function TemplateList() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchTemplates = useCallback(
    () => templatesApi.listTemplates({ search: searchQuery || undefined }),
    [searchQuery]
  )

  const { data, loading, execute } = useApi(fetchTemplates, { immediate: true })

  const { mutate: deleteTemplate } = useMutation(templatesApi.deleteTemplate)
  const { mutate: cloneTemplate } = useMutation(
    ({ id, name }: { id: string; name: string }) => templatesApi.cloneTemplate(id, name)
  )

  const templates = data?.templates || []

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return
    }

    const result = await deleteTemplate(id)
    if (result.success) {
      toast.success('Template deleted successfully')
      execute()
    } else {
      toast.error(result.error || 'Failed to delete template')
    }
  }

  const handleClone = async (id: string, name: string) => {
    const result = await cloneTemplate({ id, name: `${name} (Copy)` })
    if (result.success) {
      toast.success('Template cloned successfully')
      execute()
    } else {
      toast.error(result.error || 'Failed to clone template')
    }
  }

  const handleCreateNew = () => {
    setSelectedTemplate(null)
    setShowEditor(true)
  }

  const handleEdit = (id: string) => {
    const template = templates.find((t: Template) => t.id === id) || null
    setSelectedTemplate(template)
    setShowEditor(true)
  }

  if (showEditor) {
    return (
      <TemplateEditor
        templateId={selectedTemplate?.id}
        initialTemplate={selectedTemplate}
        onClose={() => {
          setShowEditor(false)
          setSelectedTemplate(null)
          execute()
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Template Grid */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No templates found</EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first template to get started'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: Template) => {
            const categoryTags = parseCategoryTags(template.category)

            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow flex flex-col h-full min-w-0 overflow-hidden"
              >
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0 pr-2">
                      <CardTitle className="text-base font-semibold mb-2 line-clamp-2 break-words overflow-hidden min-w-0 truncate">
                        {template.name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 min-w-0">
                        {template.isPublic && (
                          <Badge variant="outline" className="text-xs max-w-[150px] truncate whitespace-normal">
                            Public
                          </Badge>
                        )}
                        {categoryTags.map((tag, index) => (
                          <Badge
                            key={`${template.id}-category-${index}`}
                            variant="outline"
                            className="text-xs max-w-[150px] truncate whitespace-normal"
                            title={tag}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-w-0">
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 break-words overflow-hidden">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-2 min-w-0">
                    <span className="truncate min-w-0">{template.usageCount} uses</span>
                    <span className="shrink-0 ml-2">{new Date(template.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
                <div className="px-6 pb-6 pt-2 flex gap-2 shrink border-t border-border min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-0"
                    onClick={() => handleEdit(template.id)}
                  >
                    <Edit className="w-4 h-4 mr-1.5 shrink-0" />
                    <span className="truncate">Edit</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink min-w-0"
                    onClick={() => handleClone(template.id, template.name)}
                    title="Clone template"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink min-w-0"
                    onClick={() => handleDelete(template.id)}
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

