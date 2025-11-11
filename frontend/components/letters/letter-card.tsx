'use client'

import { Letter } from '@/src/api/letters.api'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, Edit, Trash2, Calendar, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface LetterCardProps {
  letter: Letter
  onDelete?: (id: string) => void
  onView?: (id: string) => void
}

export function LetterCard({ letter, onDelete, onView }: LetterCardProps) {
  const getStatusColor = (status: Letter['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/10 text-green-700 dark:text-green-400'
      case 'SENT':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
      case 'IN_REVIEW':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
      case 'ARCHIVED':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
      default:
        return 'bg-primary/10 text-primary'
    }
  }

  const getStatusLabel = (status: Letter['status']) => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <Card className="cursor-pointer transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-1">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{letter.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={getStatusColor(letter.status)} variant="outline">
                  {getStatusLabel(letter.status)}
                </Badge>
                {letter.version > 1 && (
                  <Badge variant="outline" className="text-xs">
                    v{letter.version}
                  </Badge>
                )}
                {letter.sourceDocuments && letter.sourceDocuments.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {letter.sourceDocuments.length} doc{letter.sourceDocuments.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDistanceToNow(new Date(letter.createdAt), { addSuffix: true })}</span>
          </div>
          {letter.metadata?.recipient && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="truncate">
                To: {letter.metadata.recipient.name || 'Unknown'}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Link href={`/editor?id=${letter.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
        {onView && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onView(letter.id)
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(letter.id)
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

