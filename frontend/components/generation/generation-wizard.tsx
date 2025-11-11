'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { generationApi } from '@/src/api/generation.api'
import { templatesApi } from '@/src/api/templates.api'
import { documentsApi } from '@/src/api/documents.api'
import { useApi, useMutation } from '@/src/hooks/useApi'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

const NO_TEMPLATE_VALUE = '__NO_TEMPLATE__'

export function GenerationWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)

  // Load templates and documents
  const fetchTemplates = useCallback(() => templatesApi.listTemplates(), [])
  const fetchDocuments = useCallback(() => documentsApi.listDocuments({ limit: 100 }), [])

  const { data: templatesData } = useApi(fetchTemplates)
  const { data: documentsData } = useApi(fetchDocuments)

  const [formData, setFormData] = useState({
    // Step 1: Case Information
    caseType: '',
    incidentDate: '',
    incidentDescription: '',
    location: '',
    
    // Step 2: Parties
    clientName: '',
    clientContact: '',
    defendantName: '',
    defendantAddress: '',
    
    // Step 3: Damages & Documents
    medical: '',
    lostWages: '',
    propertyDamage: '',
    painAndSuffering: '',
    documentIds: [] as string[],
    templateId: '',
    
    // Step 4: Options
    specialInstructions: '',
    tone: 'professional' as 'professional' | 'firm' | 'conciliatory',
  })

  const templateSelectValue = formData.templateId || NO_TEMPLATE_VALUE

  const { mutate: startGeneration } = useMutation(generationApi.startGeneration)

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleDocumentToggle = (docId: string) => {
    setFormData((prev) => ({
      ...prev,
      documentIds: prev.documentIds.includes(docId)
        ? prev.documentIds.filter((id) => id !== docId)
        : [...prev.documentIds, docId],
    }))
  }

  const handleGenerate = async () => {
    if (!formData.caseType || !formData.incidentDescription || !formData.clientName || !formData.defendantName) {
      toast.error('Please fill in all required fields')
      return
    }

    setGenerating(true)

    const damages: any = {}
    if (formData.medical) damages.medical = parseFloat(formData.medical)
    if (formData.lostWages) damages.lostWages = parseFloat(formData.lostWages)
    if (formData.propertyDamage) damages.propertyDamage = parseFloat(formData.propertyDamage)
    if (formData.painAndSuffering) damages.painAndSuffering = parseFloat(formData.painAndSuffering)

    const result = await startGeneration({
      caseType: formData.caseType,
      incidentDate: formData.incidentDate || new Date().toISOString(),
      incidentDescription: formData.incidentDescription,
      location: formData.location || undefined,
      clientName: formData.clientName,
      clientContact: formData.clientContact || undefined,
      defendantName: formData.defendantName,
      defendantAddress: formData.defendantAddress || undefined,
      damages: Object.keys(damages).length > 0 ? damages : undefined,
      documentIds: formData.documentIds.length > 0 ? formData.documentIds : undefined,
      templateId: formData.templateId || undefined,
      specialInstructions: formData.specialInstructions || undefined,
      tone: formData.tone,
    })

    if (result.success && result.data) {
      setJobId(result.data.jobId)
      toast.success('Letter generation started!')
      // Poll for status or redirect to editor
      setTimeout(() => {
        router.push(`/editor?letterId=${result.data.letterId}`)
      }, 2000)
    } else {
      toast.error(result.error || 'Failed to start generation')
      setGenerating(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="caseType">Case Type *</Label>
              <Select value={formData.caseType} onValueChange={(value) => handleInputChange('caseType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal Injury">Personal Injury</SelectItem>
                  <SelectItem value="Breach of Contract">Breach of Contract</SelectItem>
                  <SelectItem value="Property Damage">Property Damage</SelectItem>
                  <SelectItem value="Unpaid Invoice">Unpaid Invoice</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="incidentDate">Incident Date</Label>
              <Input
                id="incidentDate"
                type="date"
                value={formData.incidentDate}
                onChange={(e) => handleInputChange('incidentDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, State"
              />
            </div>
            <div>
              <Label htmlFor="incidentDescription">Incident Description *</Label>
              <Textarea
                id="incidentDescription"
                value={formData.incidentDescription}
                onChange={(e) => handleInputChange('incidentDescription', e.target.value)}
                placeholder="Describe what happened..."
                rows={6}
                required
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Your client's name"
                required
              />
            </div>
            <div>
              <Label htmlFor="clientContact">Client Contact</Label>
              <Input
                id="clientContact"
                value={formData.clientContact}
                onChange={(e) => handleInputChange('clientContact', e.target.value)}
                placeholder="Email or phone"
              />
            </div>
            <div>
              <Label htmlFor="defendantName">Defendant Name *</Label>
              <Input
                id="defendantName"
                value={formData.defendantName}
                onChange={(e) => handleInputChange('defendantName', e.target.value)}
                placeholder="Name of party being demanded"
                required
              />
            </div>
            <div>
              <Label htmlFor="defendantAddress">Defendant Address</Label>
              <Textarea
                id="defendantAddress"
                value={formData.defendantAddress}
                onChange={(e) => handleInputChange('defendantAddress', e.target.value)}
                placeholder="Street address, city, state, zip"
                rows={3}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Damages (Optional)</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="medical" className="text-xs">Medical Expenses</Label>
                  <Input
                    id="medical"
                    type="number"
                    value={formData.medical}
                    onChange={(e) => handleInputChange('medical', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="lostWages" className="text-xs">Lost Wages</Label>
                  <Input
                    id="lostWages"
                    type="number"
                    value={formData.lostWages}
                    onChange={(e) => handleInputChange('lostWages', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="propertyDamage" className="text-xs">Property Damage</Label>
                  <Input
                    id="propertyDamage"
                    type="number"
                    value={formData.propertyDamage}
                    onChange={(e) => handleInputChange('propertyDamage', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="painAndSuffering" className="text-xs">Pain & Suffering</Label>
                  <Input
                    id="painAndSuffering"
                    type="number"
                    value={formData.painAndSuffering}
                    onChange={(e) => handleInputChange('painAndSuffering', e.target.value)}
                    placeholder="$0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Select Documents (Optional)</Label>
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-4 space-y-2">
                {documentsData?.documents?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                ) : (
                  documentsData?.documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.documentIds.includes(doc.id)}
                        onCheckedChange={() => handleDocumentToggle(doc.id)}
                      />
                      <Label className="text-sm cursor-pointer flex-1">{doc.fileName}</Label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="templateId">Template (Optional)</Label>
              <Select
                value={templateSelectValue}
                onValueChange={(value) =>
                  handleInputChange('templateId', value === NO_TEMPLATE_VALUE ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE_VALUE}>None - Use default</SelectItem>
                  {templatesData?.templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select value={formData.tone} onValueChange={(value: any) => handleInputChange('tone', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="firm">Firm</SelectItem>
                  <SelectItem value="conciliatory">Conciliatory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea
                id="specialInstructions"
                value={formData.specialInstructions}
                onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                placeholder="Any specific requirements or notes..."
                rows={4}
              />
            </div>
            <Card className="p-4 bg-muted border border-border">
              <h3 className="font-semibold mb-4">Review Your Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Case Type</p>
                  <p className="font-medium">{formData.caseType || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-medium">{formData.clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Defendant</p>
                  <p className="font-medium">{formData.defendantName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Documents</p>
                  <p className="font-medium">{formData.documentIds.length} selected</p>
                </div>
              </div>
            </Card>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full gap-2 bg-primary hover:bg-primary/90"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Generate Letter
                </>
              )}
            </Button>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 mx-2 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="text-sm text-muted-foreground">
        Step {step} of 4 -{' '}
        {step === 1 && 'Case Information'}
        {step === 2 && 'Parties'}
        {step === 3 && 'Damages & Documents'}
        {step === 4 && 'Review & Generate'}
      </div>

      {/* Form Content */}
      <Card className="p-6 border border-border">{renderStep()}</Card>

      {/* Navigation Buttons */}
      {!generating && (
        <div className="flex gap-3">
          <Button onClick={handlePrevious} disabled={step === 1} variant="outline" className="flex-1">
            Previous
          </Button>
          {step < 4 && (
            <Button onClick={handleNext} className="flex-1 gap-2 bg-primary hover:bg-primary/90">
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
