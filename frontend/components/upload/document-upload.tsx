'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Trash2, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { documentsApi } from '@/src/api/documents.api'
import { toast } from 'sonner'

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export function DocumentUpload() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    handleFiles(files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files) handleFiles(files)
  }

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  }

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      // Validate file
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 25MB limit`)
        continue
      }

      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ]
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported format (PDF, DOC, DOCX, TXT)`)
        continue
      }

      const uploadId = Math.random().toString(36).substr(2, 9)
      const uploadingFile: UploadingFile = {
        id: uploadId,
        file,
        progress: 0,
        status: 'pending',
      }

      setUploadingFiles((prev) => [...prev, uploadingFile])

      try {
        // Step 1: Get presigned URL
        uploadingFile.status = 'uploading'
        setUploadingFiles((prev) => prev.map((f) => (f.id === uploadId ? uploadingFile : f)))

        const hash = await calculateFileHash(file)
        const presignedResponse = await documentsApi.getPresignedUrl(file.name, file.type, file.size)

        if (presignedResponse.status !== 'success') {
          throw new Error(presignedResponse.message || 'Failed to get upload URL')
        }

        // Step 2: Upload to S3
        const uploadResponse = await fetch(presignedResponse.data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file to S3')
        }

        // Step 3: Complete upload
        uploadingFile.status = 'processing'
        setUploadingFiles((prev) => prev.map((f) => (f.id === uploadId ? uploadingFile : f)))

        const completeResponse = await documentsApi.completeUpload(
          presignedResponse.data.s3Key,
          file.name,
          file.type,
          file.size,
          hash
        )

        if (completeResponse.status === 'success') {
          uploadingFile.status = 'completed'
          uploadingFile.progress = 100
          setUploadingFiles((prev) => prev.map((f) => (f.id === uploadId ? uploadingFile : f)))
          toast.success(`${file.name} uploaded successfully`)

          // Remove from list after 2 seconds
          setTimeout(() => {
            setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId))
            router.refresh() // Refresh to show in document list
          }, 2000)
        } else {
          throw new Error(completeResponse.message || 'Failed to complete upload')
        }
      } catch (error: any) {
        uploadingFile.status = 'error'
        uploadingFile.error = error.message || 'Upload failed'
        setUploadingFiles((prev) => prev.map((f) => (f.id === uploadId ? uploadingFile : f)))
        toast.error(`${file.name}: ${error.message || 'Upload failed'}`)
      }
    }
  }

  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors p-12 text-center cursor-pointer ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="hidden"
          id="file-upload"
          accept=".pdf,.doc,.docx,.txt"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Drag and drop your documents</h3>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT up to 25MB</p>
          </div>
        </label>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {uploadingFile.status === 'uploading' || uploadingFile.status === 'processing' ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : uploadingFile.status === 'completed' ? (
                  <FileText className="w-5 h-5 text-green-500" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{uploadingFile.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{formatFileSize(uploadingFile.file.size)}</p>
                    {uploadingFile.status === 'uploading' && (
                      <span className="text-xs text-primary">{uploadingFile.progress}%</span>
                    )}
                    {uploadingFile.status === 'processing' && (
                      <span className="text-xs text-primary">Processing...</span>
                    )}
                    {uploadingFile.status === 'completed' && (
                      <span className="text-xs text-green-600">Completed</span>
                    )}
                    {uploadingFile.status === 'error' && (
                      <span className="text-xs text-destructive">{uploadingFile.error}</span>
                    )}
                  </div>
                </div>
              </div>
              {(uploadingFile.status === 'error' || uploadingFile.status === 'completed') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(uploadingFile.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
