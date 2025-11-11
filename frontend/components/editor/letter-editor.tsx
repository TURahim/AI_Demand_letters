'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bold, Italic, Underline, Type, RotateCcw, Download, Send, Save, Check, Loader2, AlertCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Letter } from '@/src/api/letters.api'
import { lettersApi } from '@/src/api/letters.api'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { toast } from 'sonner'
import { ExportDialog } from '@/components/export/export-dialog'
import { CommentsSidebar } from './comments-sidebar'

interface LetterEditorProps {
  letterId: string
  letter: Letter
  currentUserId?: string
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export function LetterEditor({ letterId, letter: initialLetter, currentUserId }: LetterEditorProps) {
  const [content, setContent] = useState<string>(
    typeof initialLetter.content === 'string'
      ? initialLetter.content
      : initialLetter.content?.body || ''
  )
  const [title, setTitle] = useState(initialLetter.title)
  const [showVersions, setShowVersions] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showComments, setShowComments] = useState(true)
  const [refinementPanel, setRefinementPanel] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContentRef = useRef<string>(content)
  const lastSavedTitleRef = useRef<string>(title)

  // Load versions
  const { data: versionsData } = useApi(() => lettersApi.getVersions(letterId))

  const { mutate: updateLetter } = useMutation(lettersApi.updateLetter)

  useEffect(() => {
    // Update content when letter changes
    const letterContent =
      typeof initialLetter.content === 'string'
        ? initialLetter.content
        : initialLetter.content?.body || ''
    setContent(letterContent)
    setTitle(initialLetter.title)
    lastSavedContentRef.current = letterContent
    lastSavedTitleRef.current = initialLetter.title
  }, [initialLetter])

  // Auto-save effect
  useEffect(() => {
    // Check if content or title has changed
    const hasChanges = 
      content !== lastSavedContentRef.current || 
      title !== lastSavedTitleRef.current;

    if (!hasChanges) {
      return;
    }

    // Mark as unsaved
    setSaveStatus('unsaved');

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Schedule auto-save (2 seconds debounce)
    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      
      const result = await updateLetter(letterId, {
        title,
        content: { body: content },
      });

      if (result.success) {
        setSaveStatus('saved');
        lastSavedContentRef.current = content;
        lastSavedTitleRef.current = title;
      } else {
        setSaveStatus('error');
        console.error('Auto-save failed:', result.error);
      }
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content, title, letterId, updateLetter])

  const handleSave = async () => {
    setSaving(true)
    const result = await updateLetter(letterId, {
      title,
      content: { body: content },
    })

    if (result.success) {
      toast.success('Letter saved successfully')
    } else {
      toast.error(result.error || 'Failed to save letter')
    }
    setSaving(false)
  }

  const handleApplyRefinement = async (type: string) => {
    // TODO: Connect to AI refinement API
    toast.info('AI refinement feature coming soon')
  }

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  const versions = versionsData?.versions || []

  // Save status indicator component
  const SaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="w-3 h-3" />
            <span>Saved</span>
          </div>
        );
      case 'saving':
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case 'unsaved':
        return (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Unsaved changes</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            <span>Save failed</span>
          </div>
        );
    }
  };

  return (
    <>
      <div className={`grid gap-6 ${
        showComments && refinementPanel 
          ? 'md:grid-cols-[1fr_320px_320px]' 
          : showComments 
          ? 'md:grid-cols-[1fr_320px]'
          : refinementPanel
          ? 'md:grid-cols-[1fr_320px]'
          : ''
      }`}>
        {/* Main Editor */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold w-full bg-transparent border-none outline-none focus:outline-none"
              placeholder="Letter Title"
            />
            <SaveStatusIndicator />
          </div>

          {/* Toolbar */}
          <Card className="p-3 bg-card border border-border flex items-center gap-1 flex-wrap">
            <div className="flex items-center gap-1 border-r border-border pr-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Italic className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Underline className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 border-r border-border pr-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Type className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersions(!showVersions)}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Versions ({versions.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Comments
              </Button>
            </div>
          </Card>

          {/* Letter Textarea */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your demand letter..."
            className="min-h-96 font-serif text-base leading-relaxed p-6"
          />

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSave} variant="outline" className="gap-2" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={() => setShowExportDialog(true)} className="gap-2 bg-primary hover:bg-primary/90">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </div>

        {/* Right Sidebar - Refinement Panel */}
        {refinementPanel && (
          <div className="space-y-4">
            <Card className="p-4 border border-border">
              <h3 className="font-semibold mb-4">AI Refinement</h3>

              {/* Tone */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">TONE</span>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => handleApplyRefinement('formal')}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-border text-sm"
                  >
                    <div className="font-medium">More Formal</div>
                    <div className="text-xs text-muted-foreground">Increase legal formality</div>
                  </button>
                  <button
                    onClick={() => handleApplyRefinement('firm')}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-border text-sm"
                  >
                    <div className="font-medium">More Assertive</div>
                    <div className="text-xs text-muted-foreground">Strengthen the demand</div>
                  </button>
                  <button
                    onClick={() => handleApplyRefinement('conciliatory')}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-border text-sm"
                  >
                    <div className="font-medium">More Conciliatory</div>
                    <div className="text-xs text-muted-foreground">Softer, more diplomatic tone</div>
                  </button>
                </div>
              </div>
            </Card>

            {/* Version History */}
            {showVersions && (
              <Card className="p-4 border border-border">
                <h4 className="font-semibold mb-3 text-sm">Version History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No versions yet</p>
                  ) : (
                    versions.map((version, idx) => (
                      <button
                        key={version.id}
                        onClick={() => {
                          const versionContent =
                            typeof version.content === 'string'
                              ? version.content
                              : version.content?.body || ''
                          setContent(versionContent)
                        }}
                        className="w-full text-left p-2 rounded hover:bg-muted transition-colors border border-transparent hover:border-border text-xs"
                      >
                        <div className="font-medium">Version {version.version}</div>
                        <div className="text-muted-foreground text-xs">{formatDate(version.createdAt)}</div>
                      </button>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Comments Sidebar */}
        {showComments && (
          <div className="space-y-4">
            <Card className="p-4 border border-border sticky top-4">
              <CommentsSidebar letterId={letterId} currentUserId={currentUserId} />
            </Card>
          </div>
        )}
      </div>

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        letterId={letterId}
        letterTitle={title}
      />
    </>
  )
}
