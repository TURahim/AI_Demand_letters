'use client'

import { useState } from 'react'
import { Document } from '@/src/api/documents.api'
import { documentsApi } from '@/src/api/documents.api'
import { DocumentCard } from './document-card'
import { useApi } from '@/src/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentListProps {
  onSelectDocument?: (id: string) => void
  selectedIds?: string[]
  showActions?: boolean
}

export function DocumentList({
  onSelectDocument,
  selectedIds = [],
  showActions = true,
}: DocumentListProps) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, loading, error, execute } = useApi(
    () =>
      documentsApi.listDocuments({
        page,
        limit: 12,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      }),
    { immediate: true }
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    const result = await documentsApi.deleteDocument(id)
    if (result.status === 'success') {
      toast.success('Document deleted successfully')
      execute() // Refresh list
    } else {
      toast.error(result.message || 'Failed to delete document')
    }
  }

  const handleDownload = async (id: string) => {
    const blob = await documentsApi.downloadDocument(id)
    if (blob) {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `document-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Download started')
    } else {
      toast.error('Failed to download document')
    }
  }

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-4" />
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => execute()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const documents = data?.documents || []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => {
          setStatusFilter(value)
          setPage(1)
        }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => execute()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Document Grid */}
      {documents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No documents found</EmptyTitle>
            <EmptyDescription>
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Upload your first document to get started'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={showActions ? handleDelete : undefined}
                onDownload={showActions ? handleDownload : undefined}
                onSelect={onSelectDocument}
                selected={selectedIds.includes(doc.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Temporary Card component for skeleton
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-card p-6 ${className}`}>{children}</div>
}

