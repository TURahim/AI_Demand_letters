'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CollaborativeEditor } from '@/components/editor/collaborative-editor'
import { PresenceIndicators } from '@/components/editor/presence-indicators'
import { CommentsSidebar } from '@/components/editor/comments-sidebar'
import { ExportDialog } from '@/components/export/export-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageSquare, Download, Save, ArrowLeft } from 'lucide-react'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { lettersApi, Letter } from '@/src/api/letters.api'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { WebsocketProvider } from 'y-websocket'

// Generate random user color
function generateUserColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

function CollaborativeEditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const letterId = searchParams.get('letterId') || ''
  
  const [showComments, setShowComments] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [userColor] = useState(generateUserColor())

  // Fetch letter data
  const fetchLetter = useCallback(() => lettersApi.getLetter(letterId), [letterId])
  const { data: letterData, loading } = useApi(fetchLetter)
  const letter = letterData?.letter as Letter | undefined

  const { mutate: updateLetter } = useMutation(lettersApi.updateLetter)

  useEffect(() => {
    if (letter) {
      setTitle(letter.title)
      const letterContent =
        typeof letter.content === 'string'
          ? letter.content
          : letter.content?.body || ''
      setContent(letterContent)
    }
  }, [letter])

  const handleSave = async () => {
    const result = await updateLetter(letterId, {
      title,
      content: { body: content },
    })

    if (result.success) {
      toast.success('Letter saved successfully')
    } else {
      toast.error(result.error || 'Failed to save letter')
    }
  }

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (!letter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Letter not found</p>
          <Button onClick={() => router.push('/letters')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Letters
          </Button>
        </div>
      </div>
    )
  }

  const currentUserId = 'user-' + Math.random().toString(36).substr(2, 9) // TODO: Get from auth context
  const currentUserName = letter.createdBy || 'Anonymous User' // TODO: Get from auth context

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.push('/letters')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Letters
          </Button>
          <div className="flex items-center gap-2">
            <PresenceIndicators
              provider={provider}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
            />
            <Button variant="outline" onClick={() => setShowComments(!showComments)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Comments
            </Button>
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-3xl font-bold w-full bg-transparent border-none outline-none focus:outline-none mb-2"
          placeholder="Letter Title"
        />
      </div>

      {/* Editor Grid */}
      <div className={`grid gap-6 ${showComments ? 'md:grid-cols-[1fr_320px]' : ''}`}>
        {/* Collaborative Editor */}
        <CollaborativeEditor
          letterId={letterId}
          firmId={letter.firmId}
          userId={currentUserId}
          userName={currentUserName}
          userColor={userColor}
          initialContent={content}
          onContentChange={handleContentChange}
        />

        {/* Comments Sidebar */}
        {showComments && (
          <div className="space-y-4">
            <Card className="p-4 border border-border sticky top-4">
              <CommentsSidebar letterId={letterId} currentUserId={currentUserId} />
            </Card>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        letterId={letterId}
        letterTitle={title}
      />
    </div>
  )
}

export default function CollaborativeEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    }>
      <CollaborativeEditorContent />
    </Suspense>
  )
}

