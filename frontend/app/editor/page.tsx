'use client'

import { Suspense, useCallback } from 'react'
import { DocumentViewer, DocumentViewerEmptyState } from '@/components/editor/document-viewer'
import { lettersApi } from '@/src/api/letters.api'
import { useApi } from '@/src/hooks/useApi'
import { Skeleton } from '@/components/ui/skeleton'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function EditorContent() {
  const searchParams = useSearchParams()
  const letterId = searchParams.get('letterId') || searchParams.get('id')

  const fetchLetter = useCallback(() => {
    if (!letterId) {
      return Promise.resolve({ status: 'error', message: 'No letter ID provided' } as any)
    }
    return lettersApi.getLetter(letterId)
  }, [letterId])

  const { data, loading, error } = useApi(fetchLetter, { immediate: !!letterId })

  if (!letterId) {
    return <DocumentViewerEmptyState />
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#A18050] mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !data?.letter) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-3 text-foreground">Letter Not Found</h2>
          <p className="text-muted-foreground mb-6">
            {error || 'The letter you are looking for does not exist or you do not have access to it.'}
          </p>
          <button
            onClick={() => window.location.href = '/letters'}
            className="px-4 py-2 bg-[#A18050] text-white rounded-lg hover:bg-[#8F6F42] transition-colors"
          >
            Back to Letters
          </button>
        </div>
      </div>
    )
  }

  return <DocumentViewer letterId={letterId} letter={data.letter} />
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#FAFAF8]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#A18050] mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading document...</p>
          </div>
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  )
}
