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
import { Download, FileText, FileCode } from 'lucide-react'
import { toast } from 'sonner'

export type ExportFormat = 'PDF' | 'DOCX' | 'HTML'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  letterId: string
  letterTitle: string
}

export function ExportDialog({ open, onOpenChange, letterId, letterTitle }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('PDF')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)

    try {
      // TODO: Implement actual export API call
      // For now, simulate export
      await new Promise((resolve) => setTimeout(resolve, 1500))

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

        <div className="py-4">
          <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
            <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent cursor-pointer">
              <RadioGroupItem value="PDF" id="pdf" />
              <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="font-medium">PDF</div>
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

            <div className="flex items-center space-x-2 p-4 rounded-lg border hover:bg-accent cursor-pointer">
              <RadioGroupItem value="HTML" id="html" />
              <Label htmlFor="html" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="font-medium">HTML</div>
                    <div className="text-sm text-muted-foreground">
                      Web format - Best for email and web viewing
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
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

