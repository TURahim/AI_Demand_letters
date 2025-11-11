'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Check, X, Send, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Comment, commentsApi, CreateCommentDto } from '@/src/api/comments.api'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

interface CommentsSidebarProps {
  letterId: string
  currentUserId?: string
}

export function CommentsSidebar({ letterId, currentUserId }: CommentsSidebarProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showResolved, setShowResolved] = useState(false)

  // Fetch comments
  const getComments = useCallback(
    () => commentsApi.getComments(letterId, { includeResolved: showResolved }),
    [letterId, showResolved]
  );
  const { data: commentsData, loading, execute: fetchComments } = useApi(getComments)

  const { mutate: createComment } = useMutation(commentsApi.createComment)
  const { mutate: updateComment } = useMutation(commentsApi.updateComment)
  const { mutate: deleteComment } = useMutation(commentsApi.deleteComment)
  const { mutate: resolveComment } = useMutation(commentsApi.resolveComment)
  const { mutate: unresolveComment } = useMutation(commentsApi.unresolveComment)

  const comments = commentsData?.comments || []

  // Refresh comments when showResolved changes
  useEffect(() => {
    fetchComments()
  }, [showResolved, fetchComments])

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    const result = await createComment(letterId, {
      content: newComment,
    })

    if (result.success) {
      setNewComment('')
      toast.success('Comment added')
      fetchComments()
    } else {
      toast.error(result.error || 'Failed to add comment')
    }
  }

  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim()) return

    const result = await createComment(letterId, {
      content: replyContent,
      parentId,
    })

    if (result.success) {
      setReplyContent('')
      setReplyingTo(null)
      toast.success('Reply added')
      fetchComments()
    } else {
      toast.error(result.error || 'Failed to add reply')
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    const result = await updateComment(commentId, {
      content: editContent,
    })

    if (result.success) {
      setEditingId(null)
      setEditContent('')
      toast.success('Comment updated')
      fetchComments()
    } else {
      toast.error(result.error || 'Failed to update comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    const result = await deleteComment(commentId)

    if (result.success) {
      toast.success('Comment deleted')
      fetchComments()
    } else {
      toast.error(result.error || 'Failed to delete comment')
    }
  }

  const handleResolveComment = async (commentId: string) => {
    const result = await resolveComment(commentId)

    if (result.success) {
      toast.success('Comment resolved')
      fetchComments()
    } else {
      toast.error(result.error || 'Failed to resolve comment')
    }
  }

  const handleUnresolveComment = async (commentId: string) => {
    const result = await unresolveComment(commentId)

    if (result.success) {
      toast.success('Comment unresolved')
      refetch()
    } else {
      toast.error(result.error || 'Failed to unresolve comment')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingId === comment.id
    const isReplying = replyingTo === comment.id
    const isOwner = currentUserId === comment.userId

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-4 mt-2' : ''}>
        <Card className={`p-3 ${comment.isResolved ? 'opacity-60' : ''}`}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {comment.user.firstName} {comment.user.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </span>
                {comment.isResolved && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Resolved
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-16 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditComment(comment.id)}
                      disabled={!editContent.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null)
                        setEditContent('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              )}
            </div>

            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!comment.isResolved && (
                    <DropdownMenuItem onClick={() => setReplyingTo(comment.id)}>
                      Reply
                    </DropdownMenuItem>
                  )}
                  {isOwner && !comment.isResolved && (
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingId(comment.id)
                        setEditContent(comment.content)
                      }}
                    >
                      Edit
                    </DropdownMenuItem>
                  )}
                  {comment.isResolved ? (
                    <DropdownMenuItem onClick={() => handleUnresolveComment(comment.id)}>
                      Unresolve
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleResolveComment(comment.id)}>
                      Resolve
                    </DropdownMenuItem>
                  )}
                  {isOwner && (
                    <DropdownMenuItem
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-16 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAddReply(comment.id)}
                  disabled={!replyContent.trim()}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyContent('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Get top-level comments (no parent)
  const topLevelComments = comments.filter((c) => !c.parentId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-semibold">Comments</h3>
          <span className="text-xs text-muted-foreground">
            ({topLevelComments.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowResolved(!showResolved)}
          className="text-xs"
        >
          {showResolved ? 'Hide' : 'Show'} resolved
        </Button>
      </div>

      {/* Add new comment */}
      <Card className="p-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-20 mb-2 text-sm"
        />
        <Button
          size="sm"
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          className="w-full"
        >
          <Send className="w-3 h-3 mr-1" />
          Add Comment
        </Button>
      </Card>

      <Separator />

      {/* Comments list */}
      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-4">
          Loading comments...
        </div>
      ) : topLevelComments.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4">
          No comments yet
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {topLevelComments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  )
}

