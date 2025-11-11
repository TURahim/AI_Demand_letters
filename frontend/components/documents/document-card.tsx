'use client'

import { Document } from '@/src/api/documents.api'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, Trash2, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DocumentCardProps {
  document: Document
  onDelete?: (id: string) => void
  onDownload?: (id: string) => void
  onSelect?: (id: string) => void
  selected?: boolean
}

export function DocumentCard({
  document,
  onDelete,
  onDownload,
  onSelect,
  selected = false,
}: DocumentCardProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-700 dark:text-green-400'
      case 'PROCESSING':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'FAILED':
        return 'bg-red-500/10 text-red-700 dark:text-red-400'
      case 'QUARANTINED':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
    }
  }

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect?.(document.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-1">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{document.fileName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(document.status)} variant="outline">
                  {document.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(document.fileSize)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}</span>
        </div>
        {document.extractedText && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {document.extractedText.substring(0, 100)}...
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(document.id)
            }}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(document.id)
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

