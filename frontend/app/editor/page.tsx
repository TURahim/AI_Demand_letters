'use client'

import { Suspense, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { LetterEditor } from '@/components/editor/letter-editor'
import { lettersApi } from '@/src/api/letters.api'
import { useApi } from '@/src/hooks/useApi'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

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
    return (
      <AppLayout>
        <div className="flex-1 bg-background">
          <div className="container max-w-7xl mx-auto px-6 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">No Letter Selected</h1>
              <p className="text-muted-foreground">Please select a letter to edit or generate a new one.</p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 bg-background">
          <div className="container max-w-7xl mx-auto px-6 py-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !data?.letter) {
    return (
      <AppLayout>
        <div className="flex-1 bg-background">
          <div className="container max-w-7xl mx-auto px-6 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-2">Letter Not Found</h1>
              <p className="text-muted-foreground">{error || 'The letter you are looking for does not exist.'}</p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{data.letter.title}</h1>
            <p className="text-muted-foreground">Refine your demand letter with AI-powered suggestions</p>
          </div>

          <LetterEditor letterId={letterId} letter={data.letter} />
        </div>
      </div>
    </AppLayout>
  )
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex-1 bg-background">
            <div className="container max-w-7xl mx-auto px-6 py-8">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </AppLayout>
      }
    >
      <EditorContent />
    </Suspense>
  )
}
