'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Letter } from '@/src/api/letters.api'
import { lettersApi } from '@/src/api/letters.api'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { DocumentToolbar } from './document-toolbar'
import { AIRefinementPanel } from './ai-refinement-panel'
import { CommentsSidebar } from './comments-sidebar'
import { ExportDialog } from '@/components/export/export-dialog'
import { FileText, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DocumentViewerProps {
  letterId: string
  letter: Letter
  currentUserId?: string
  onRefresh?: () => Promise<any>
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
type ViewMode = 'edit' | 'preview'

export function DocumentViewer({ letterId, letter: initialLetter, currentUserId, onRefresh }: DocumentViewerProps) {
  const [content, setContent] = useState<string>(
    typeof initialLetter.content === 'string'
      ? initialLetter.content
      : initialLetter.content?.body || ''
  )
  const [title, setTitle] = useState(initialLetter.title)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const [showRefinement, setShowRefinement] = useState(true)
  const [isGenerating, setIsGenerating] = useState(initialLetter.status === 'PENDING')

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContentRef = useRef<string>(content)
  const lastSavedTitleRef = useRef<string>(title)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load versions
  const fetchVersions = useCallback(() => lettersApi.getVersions(letterId), [letterId])
  const { data: versionsData } = useApi(fetchVersions)

  const { mutate: updateLetter, loading: isSaving } = useMutation(lettersApi.updateLetter)

  useEffect(() => {
    const letterContent =
      typeof initialLetter.content === 'string'
        ? initialLetter.content
        : initialLetter.content?.body || ''
    setContent(letterContent)
    setTitle(initialLetter.title)
    setIsGenerating(initialLetter.status === 'PENDING')
    lastSavedContentRef.current = letterContent
    lastSavedTitleRef.current = initialLetter.title
  }, [initialLetter])

  // Polling effect for when letter is being generated
  useEffect(() => {
    if (!isGenerating || !onRefresh) {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current)
      }
      return
    }

    const pollForUpdates = async () => {
      try {
        const result = await onRefresh()
        if (result?.letter) {
          const letter = result.letter
          setIsGenerating(letter.status === 'PENDING')
          
          // Update content if it has been generated
          if (letter.content && letter.status !== 'PENDING') {
            const newContent = typeof letter.content === 'string'
              ? letter.content
              : letter.content?.body || ''
            if (newContent !== content) {
              setContent(newContent)
              lastSavedContentRef.current = newContent
            }
          }
        }
      } catch (error) {
        console.error('Error polling for letter updates:', error)
      }

      // Continue polling if still generating
      pollingTimerRef.current = setTimeout(pollForUpdates, 2000)
    }

    // Start polling
    pollingTimerRef.current = setTimeout(pollForUpdates, 2000)

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current)
      }
    }
  }, [isGenerating, onRefresh, content])

  // Auto-save effect
  useEffect(() => {
    const hasChanges =
      content !== lastSavedContentRef.current ||
      title !== lastSavedTitleRef.current

    if (!hasChanges) {
      return
    }

    setSaveStatus('unsaved')

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')

      const result = await updateLetter(letterId, {
        title,
        content: { body: content },
      })

      if (result.success) {
        setSaveStatus('saved')
        lastSavedContentRef.current = content
        lastSavedTitleRef.current = title
      } else {
        setSaveStatus('error')
        console.error('Auto-save failed:', result.error)
      }
    }, 2000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [content, title, letterId, updateLetter])

  const handleSave = async () => {
    setSaveStatus('saving')
    const result = await updateLetter(letterId, {
      title,
      content: { body: content },
    })

    if (result.success) {
      setSaveStatus('saved')
      lastSavedContentRef.current = content
      lastSavedTitleRef.current = title
      toast.success('Letter saved successfully')
    } else {
      setSaveStatus('error')
      toast.error(result.error || 'Failed to save letter')
    }
  }

  const handleApplyRefinement = async (type: string) => {
    toast.info('AI refinement feature coming soon')
  }

  const handleRestoreVersion = (versionId: string, versionContent: string) => {
    setContent(versionContent)
    toast.success('Version restored')
  }

  const versions = versionsData?.versions || []

  // Split content into paragraphs for better presentation
  const contentParagraphs = content.split('\n\n').filter(p => p.trim())

  // Show loading state if letter is being generated
  if (isGenerating) {
    return (
      <div className="h-screen flex flex-col bg-[#FAFAF8]">
        <DocumentToolbar
          title={title}
          saveStatus={saveStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onSave={handleSave}
          onExport={() => setShowExportDialog(true)}
          onSend={() => toast.info('Send feature coming soon')}
          onToggleComments={() => setShowComments(!showComments)}
          showComments={showComments}
          isSaving={isSaving}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <Loader2 className="w-12 h-12 animate-spin text-[#A18050] mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3 text-foreground" style={{ fontFamily: 'Editor, serif' }}>
              Generating Your Letter
            </h2>
            <p className="text-muted-foreground mb-2" style={{ fontFamily: 'Apercu, system-ui, sans-serif' }}>
              Our AI is crafting your demand letter. This may take a few moments.
            </p>
            <p className="text-xs text-muted-foreground/60" style={{ fontFamily: 'Apercu, system-ui, sans-serif' }}>
              You can leave this page and come back later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#FAFAF8]">
      <DocumentToolbar
        title={title}
        saveStatus={saveStatus}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSave={handleSave}
        onExport={() => setShowExportDialog(true)}
        onSend={() => toast.info('Send feature coming soon')}
        onToggleComments={() => setShowComments(!showComments)}
        showComments={showComments}
        isSaving={isSaving}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="container max-w-[900px] mx-auto px-6 py-12">
              <AnimatePresence mode="wait">
                {viewMode === 'edit' ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Document Canvas - Edit Mode */}
                    <Card className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
                      <div className="p-12">
                        {/* Title Input */}
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="text-3xl font-bold w-full bg-transparent border-none outline-none focus:outline-none mb-8 text-foreground placeholder:text-muted-foreground"
                          placeholder="Untitled Document"
                          style={{ fontFamily: 'Editor, serif' }}
                        />

                        {/* Content Editor */}
                        <Textarea
                          ref={textareaRef}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Begin typing your demand letter..."
                          className="min-h-[600px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base leading-relaxed resize-none text-foreground placeholder:text-muted-foreground"
                          style={{
                            fontFamily: 'Apercu, system-ui, sans-serif',
                            lineHeight: '1.8',
                          }}
                        />
                      </div>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Document Canvas - Preview Mode */}
                    <Card className="bg-white shadow-lg border-0 rounded-lg overflow-hidden">
                      <div className="p-12">
                        <h1
                          className="text-3xl font-bold mb-8 text-foreground"
                          style={{ fontFamily: 'Editor, serif' }}
                        >
                          {title}
                        </h1>

                        {contentParagraphs.length > 0 ? (
                          <div className="space-y-4">
                            {contentParagraphs.map((paragraph, idx) => (
                              <p
                                key={idx}
                                className="text-base leading-relaxed text-foreground"
                                style={{
                                  fontFamily: 'Apercu, system-ui, sans-serif',
                                  lineHeight: '1.8',
                                }}
                              >
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-muted-foreground">
                              No content yet. Switch to edit mode to start writing.
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spacing for scroll */}
              <div className="h-24" />
            </div>
          </ScrollArea>
        </div>

        {/* Right Sidebar - AI Refinement */}
        <AnimatePresence>
          {showRefinement && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <AIRefinementPanel
                onApplyRefinement={handleApplyRefinement}
                versions={versions}
                onRestoreVersion={handleRestoreVersion}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments Sidebar */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden border-l border-border bg-white"
            >
              <div className="h-full p-4">
                <CommentsSidebar letterId={letterId} currentUserId={currentUserId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        letterId={letterId}
        letterTitle={title}
      />
    </div>
  )
}

// Empty state component for when no letter is selected
export function DocumentViewerEmptyState() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#FAFAF8]">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="mb-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-[#A18050]/10 blur-2xl rounded-full" />
            <FileText className="w-24 h-24 mx-auto text-[#A18050] relative" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-foreground" style={{ fontFamily: 'Editor, serif' }}>
          Select a letter to begin editing
        </h2>
        <p className="text-muted-foreground mb-6" style={{ fontFamily: 'Apercu, system-ui, sans-serif' }}>
          Choose an existing letter from your library or create a new one to get started.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.location.href = '/letters'}
          >
            <FileText className="w-4 h-4" />
            View Letters
          </Button>
          <Button
            className="gap-2 bg-[#A18050] hover:bg-[#8F6F42]"
            onClick={() => window.location.href = '/generation'}
          >
            <Upload className="w-4 h-4" />
            Generate New
          </Button>
        </div>
      </div>
    </div>
  )
}

