'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, FileText, FileCode } from 'lucide-react'
import { toast } from 'sonner'
import { exportApi } from '@/src/api/export.api'

export type ExportFormat = 'PDF' | 'DOCX' | 'HTML'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  letterId: string
  letterTitle: string
}

export function ExportDialog({ open, onOpenChange, letterId, letterTitle }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('DOCX')
  const [includeHeader, setIncludeHeader] = useState(true)
  const [includeFooter, setIncludeFooter] = useState(true)
  const [firmBranding, setFirmBranding] = useState(true)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)

    try {
      // Generate export
      const result = await exportApi.generateExport(letterId, {
        format,
        includeHeader,
        includeFooter,
        firmBranding,
      })

      if (result.status !== 'success' || !result.data) {
        throw new Error(result.message || 'Export failed')
      }

      // Download the file immediately using the presigned URL
      const fileResponse = await fetch(result.data.downloadUrl)
      if (!fileResponse.ok) {
        throw new Error('Failed to download export')
      }

      const blob = await fileResponse.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${letterTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')}.${format.toLowerCase()}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Letter exported as ${format}`, {
        description: `"${letterTitle}" has been exported successfully.`,
      })

      onOpenChange(false)
    } catch (error: any) {
      toast.error('Export failed', {
        description: error.message || 'Failed to export letter. Please try again.',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Letter</DialogTitle>
          <DialogDescription>
            Choose a format to export your letter "{letterTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeHeader"
                  checked={includeHeader}
                  onCheckedChange={(checked) => setIncludeHeader(!!checked)}
                />
                <Label htmlFor="includeHeader" className="text-sm cursor-pointer">
                  Include header (title and date)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFooter"
                  checked={includeFooter}
                  onCheckedChange={(checked) => setIncludeFooter(!!checked)}
                />
                <Label htmlFor="includeFooter" className="text-sm cursor-pointer">
                  Include footer
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="firmBranding"
                  checked={firmBranding}
                  onCheckedChange={(checked) => setFirmBranding(!!checked)}
                />
                <Label htmlFor="firmBranding" className="text-sm cursor-pointer">
                  Include firm branding
                </Label>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2 p-4 rounded-lg border opacity-50 cursor-not-allowed">
                <RadioGroupItem value="PDF" id="pdf" disabled />
                <Label htmlFor="pdf" className="flex-1">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-500" />
                    <div>
                      <div className="font-medium">PDF (Coming Soon)</div>
                      <div className="text-sm text-muted-foreground">
                        Portable Document Format - Best for printing and sharing
                      </div>
                    </div>
                  </div>
                </Label>
              </div>

            <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent cursor-pointer">
              <RadioGroupItem value="DOCX" id="docx" />
              <Label htmlFor="docx" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium">Microsoft Word (DOCX)</div>
                    <div className="text-sm text-muted-foreground">
                      Editable document format - Best for further editing
                    </div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-4 rounded-lg border opacity-50 cursor-not-allowed">
              <RadioGroupItem value="HTML" id="html" disabled />
              <Label htmlFor="html" className="flex-1">
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="font-medium">HTML (Coming Soon)</div>
                    <div className="text-sm text-muted-foreground">
                      Web format - Best for email and web viewing
                    </div>
                  </div>
                </div>
              </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Download className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

