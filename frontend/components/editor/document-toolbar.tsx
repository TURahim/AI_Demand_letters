'use client'

import { useState } from 'react'
import { Save, Download, Send, Check, Loader2, AlertCircle, Eye, Edit3, MessageSquare, MoreVertical, ArrowLeft, Home, FileText, Layout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
type ViewMode = 'edit' | 'preview'

interface DocumentToolbarProps {
  title: string
  saveStatus: SaveStatus
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onSave: () => void
  onExport: () => void
  onSend: () => void
  onToggleComments: () => void
  showComments: boolean
  isSaving?: boolean
}

export function DocumentToolbar({
  title,
  saveStatus,
  viewMode,
  onViewModeChange,
  onSave,
  onExport,
  onSend,
  onToggleComments,
  showComments,
  isSaving = false,
}: DocumentToolbarProps) {
  const router = useRouter()

  const SaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <Badge variant="outline" className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400">
            <Check className="w-3 h-3" />
            <span className="text-xs font-medium">Saved</span>
          </Badge>
        )
      case 'saving':
        return (
          <Badge variant="outline" className="gap-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs font-medium">Saving...</span>
          </Badge>
        )
      case 'unsaved':
        return (
          <Badge variant="outline" className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400">
            <span className="text-xs font-medium">Unsaved</span>
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="outline" className="gap-1.5 bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs font-medium">Failed</span>
          </Badge>
        )
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container max-w-[1600px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back Button, Document Title & Status */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 hover:bg-muted transition-all duration-150"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/letters')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Letters
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/documents')}>
                  <Layout className="w-4 h-4 mr-2" />
                  Documents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-6" />

            <h1 className="text-lg font-semibold truncate text-foreground">
              {title}
            </h1>
            <SaveStatusIndicator />
          </div>

          {/* Center: View Mode Toggle */}
          <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('edit')}
              className={`gap-2 transition-all duration-150 ${
                viewMode === 'edit'
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-white/60'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('preview')}
              className={`gap-2 transition-all duration-150 ${
                viewMode === 'preview'
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-white/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </Button>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleComments}
              className={`gap-2 transition-all duration-150 ${
                showComments ? 'bg-muted text-foreground' : ''
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden lg:inline">Comments</span>
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving || saveStatus === 'saving'}
              className="gap-2 hover:bg-muted transition-all duration-150"
            >
              <Save className="w-4 h-4" />
              <span className="hidden lg:inline">Save</span>
            </Button>

            <Button
              onClick={onExport}
              size="sm"
              className="gap-2 bg-[#A18050] hover:bg-[#8F6F42] text-white transition-all duration-150"
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Export</span>
            </Button>

            <Button
              onClick={onSend}
              size="sm"
              className="gap-2 bg-[#193D3D] hover:bg-[#152F2F] text-white transition-all duration-150"
            >
              <Send className="w-4 h-4" />
              <span className="hidden lg:inline">Send</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewModeChange(viewMode === 'edit' ? 'preview' : 'edit')}>
                  {viewMode === 'edit' ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Mode
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Mode
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}

