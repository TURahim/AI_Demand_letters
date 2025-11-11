'use client'

import { useState } from 'react'
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

export function TemplateList() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, loading, execute } = useApi(
    () => templatesApi.listTemplates({ search: searchQuery || undefined }),
    { immediate: true }
  )

  const { mutate: deleteTemplate } = useMutation(templatesApi.deleteTemplate)
  const { mutate: cloneTemplate } = useMutation(templatesApi.cloneTemplate)

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
    const result = await cloneTemplate(id, `${name} (Copy)`)
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
    setSelectedTemplate(id)
    setShowEditor(true)
  }

  if (showEditor) {
    return (
      <TemplateEditor
        templateId={selectedTemplate}
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
          {templates.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {template.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          Public
                        </Badge>
                      )}
                      {template.category && (
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{template.usageCount} uses</span>
                  <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
              <div className="px-6 pb-6 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(template.id)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClone(template.id, template.name)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

