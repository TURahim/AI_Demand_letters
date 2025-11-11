'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Underline, List, ListOrdered, Quote, Undo2, Redo2 } from 'lucide-react'
import { getAuthToken } from '@/src/api/client'

interface CollaborativeEditorProps {
  letterId: string
  firmId: string
  userId: string
  userName: string
  userColor: string
  initialContent?: string
  onContentChange?: (content: string) => void
}

export function CollaborativeEditor({
  letterId,
  firmId,
  userId,
  userName,
  userColor,
  initialContent = '',
  onContentChange,
}: CollaborativeEditorProps) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable local history, Yjs handles it
      }),
      Collaboration.configure({
        document: yDoc || undefined,
      }),
      CollaborationCursor.configure({
        provider: provider || undefined,
        user: {
          name: userName,
          color: userColor,
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[500px] max-w-none p-4',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onContentChange?.(html)
    },
  })

  useEffect(() => {
    // Create Yjs document
    const doc = new Y.Doc()
    setYDoc(doc)

    // Get auth token
    const token = getAuthToken()
    if (!token) {
      console.error('No auth token found')
      setConnectionStatus('disconnected')
      return
    }

    // Determine WebSocket URL based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = process.env.NEXT_PUBLIC_WS_URL || window.location.host
    const wsUrl = `${wsProtocol}//${wsHost}/collaboration`

    // Create WebSocket provider
    const wsProvider = new WebsocketProvider(
      wsUrl,
      `${firmId}:${letterId}`,
      doc,
      {
        params: {
          letterId,
          firmId,
          token,
        },
      }
    )

    setProvider(wsProvider)

    // Connection status handlers
    wsProvider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') {
        setConnectionStatus('connected')
      } else if (event.status === 'disconnected') {
        setConnectionStatus('disconnected')
      }
    })

    wsProvider.on('connection-error', (error: Error) => {
      console.error('WebSocket connection error:', error)
      setConnectionStatus('disconnected')
    })

    // Cleanup
    return () => {
      wsProvider.disconnect()
      doc.destroy()
    }
  }, [letterId, firmId, userId])

  // Update editor when provider/doc changes
  useEffect(() => {
    if (editor && yDoc && provider) {
      editor.destroy()
      
      const newEditor = useEditor({
        extensions: [
          StarterKit.configure({
            history: false,
          }),
          Collaboration.configure({
            document: yDoc,
          }),
          CollaborationCursor.configure({
            provider: provider,
            user: {
              name: userName,
              color: userColor,
            },
          }),
        ],
        editorProps: {
          attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[500px] max-w-none p-4',
          },
        },
        onUpdate: ({ editor }) => {
          const html = editor.getHTML()
          onContentChange?.(html)
        },
      })
    }
  }, [yDoc, provider, userName, userColor, onContentChange])

  const ConnectionIndicator = () => {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-green-500'
              : connectionStatus === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
          }`}
        />
        <span className="text-muted-foreground">
          {connectionStatus === 'connected'
            ? 'Connected'
            : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Disconnected'}
        </span>
      </div>
    )
  }

  if (!editor) {
    return <div>Loading editor...</div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-3 bg-card border border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-accent' : ''}
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-accent' : ''}
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'bg-accent' : ''}
            >
              <Underline className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-accent' : ''}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-accent' : ''}
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={editor.isActive('blockquote') ? 'bg-accent' : ''}
            >
              <Quote className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>
          <ConnectionIndicator />
        </div>
      </Card>

      {/* Editor */}
      <Card className="border border-border bg-card">
        <EditorContent editor={editor} />
      </Card>
    </div>
  )
}

