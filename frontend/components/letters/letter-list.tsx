'use client'

import { useState } from 'react'
import { Letter } from '@/src/api/letters.api'
import { lettersApi } from '@/src/api/letters.api'
import { LetterCard } from './letter-card'
import { useApi } from '@/src/hooks/useApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import { Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface LetterListProps {
  showActions?: boolean
}

export function LetterList({ showActions = true }: LetterListProps) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, loading, error, execute } = useApi(
    () =>
      lettersApi.listLetters({
        page,
        limit: 12,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      }),
    { immediate: true }
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this letter?')) {
      return
    }

    const result = await lettersApi.deleteLetter(id)
    if (result.status === 'success') {
      toast.success('Letter deleted successfully')
      execute() // Refresh list
    } else {
      toast.error(result.message || 'Failed to delete letter')
    }
  }

  const handleView = (id: string) => {
    window.open(`/editor?id=${id}`, '_blank')
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

  const letters = data?.letters || []

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search letters..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => execute()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Letter Grid */}
      {letters.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No letters found</EmptyTitle>
            <EmptyDescription>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Generate your first letter to get started'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {letters.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                onDelete={showActions ? handleDelete : undefined}
                onView={showActions ? handleView : undefined}
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

