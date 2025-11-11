'use client'

import { useState } from 'react'
import { Sparkles, ChevronRight, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface AIRefinementPanelProps {
  onApplyRefinement: (type: string) => void
  onClose?: () => void
  versions?: Array<{
    id: string
    version: number
    createdAt: string | Date
    content: any
  }>
  onRestoreVersion?: (versionId: string, content: string) => void
}

export function AIRefinementPanel({
  onApplyRefinement,
  onClose,
  versions = [],
  onRestoreVersion,
}: AIRefinementPanelProps) {
  const [isVersionsOpen, setIsVersionsOpen] = useState(false)

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  const refinementOptions = [
    {
      id: 'formal',
      title: 'More Formal',
      description: 'Increase legal formality',
      color: 'text-blue-600',
    },
    {
      id: 'assertive',
      title: 'More Assertive',
      description: 'Strengthen the demand',
      color: 'text-amber-600',
    },
    {
      id: 'conciliatory',
      title: 'More Conciliatory',
      description: 'Softer, diplomatic tone',
      color: 'text-emerald-600',
    },
    {
      id: 'professional',
      title: 'More Professional',
      description: 'Business-appropriate language',
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="h-full flex flex-col bg-[#FAFAF8] border-l border-border">
      {/* Header */}
      <div className="p-4 bg-white border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#7848DF]/10 rounded-lg">
              <Sparkles className="w-4 h-4 text-[#7848DF]" />
            </div>
            <h3 className="font-semibold text-foreground">AI Refinement</h3>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Enhance your letter with AI-powered suggestions
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Tone Adjustments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs font-medium">
                TONE
              </Badge>
            </div>
            <div className="space-y-2">
              {refinementOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onApplyRefinement(option.id)}
                  className="w-full group"
                >
                  <Card className="border border-border hover:border-[#7848DF] hover:shadow-md transition-all duration-150 cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium text-sm text-foreground mb-0.5">
                            {option.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#7848DF] transition-colors duration-150 flex-shrink-0 mt-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Version History */}
          <Collapsible open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-medium text-sm">Version History</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {versions.length}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <ScrollArea className="max-h-64">
                {versions.length === 0 ? (
                  <Card className="border border-dashed">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground text-center">
                        No versions yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {versions.map((version, idx) => {
                      const versionContent =
                        typeof version.content === 'string'
                          ? version.content
                          : version.content?.body || ''
                      
                      return (
                        <button
                          key={version.id}
                          onClick={() => onRestoreVersion?.(version.id, versionContent)}
                          className="w-full group"
                        >
                          <Card className="border border-border hover:border-[#A18050] hover:shadow-sm transition-all duration-150 cursor-pointer">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-left flex-1 min-w-0">
                                  <div className="text-xs font-medium text-foreground mb-0.5">
                                    Version {version.version}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(version.createdAt)}
                                  </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#A18050] transition-colors duration-150 flex-shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}

