"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"

export function GenerationWizard() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientAddress: "",
    amount: "",
    reason: "",
    deadline: "30",
    references: "",
  })

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Recipient Name</label>
              <Input
                value={formData.recipientName}
                onChange={(e) => handleInputChange("recipientName", e.target.value)}
                placeholder="Full name of recipient"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Recipient Address</label>
              <Textarea
                value={formData.recipientAddress}
                onChange={(e) => handleInputChange("recipientAddress", e.target.value)}
                placeholder="Street address, city, state, zip"
                rows={3}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Amount Demanded</label>
              <Input
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                placeholder="e.g., $10,000.00"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Reason for Demand</label>
              <Textarea
                value={formData.reason}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                placeholder="Describe the reason for this demand (breach of contract, unpaid invoice, etc.)"
                rows={4}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Payment Deadline (days)</label>
              <Input
                value={formData.deadline}
                onChange={(e) => handleInputChange("deadline", e.target.value)}
                placeholder="30"
                type="number"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Supporting References (Optional)</label>
              <Textarea
                value={formData.references}
                onChange={(e) => handleInputChange("references", e.target.value)}
                placeholder="Contract numbers, invoice dates, prior communications, etc."
                rows={4}
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <Card className="p-4 bg-muted border border-border">
              <h3 className="font-semibold mb-4">Review Your Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-medium">{formData.recipientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount Demanded</p>
                  <p className="font-medium">{formData.amount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium line-clamp-2">{formData.reason}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Deadline</p>
                  <p className="font-medium">{formData.deadline} days</p>
                </div>
              </div>
            </Card>
            <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
              <CheckCircle2 className="w-4 h-4" />
              Generate Letter
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
                s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 mx-2 ${s < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="text-sm text-muted-foreground">
        Step {step} of 4 - {step === 1 && "Recipient Information"}
        {step === 2 && "Demand Details"}
        {step === 3 && "Timeline & References"}
        {step === 4 && "Review & Generate"}
      </div>

      {/* Form Content */}
      <Card className="p-6 border border-border">{renderStep()}</Card>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button onClick={handlePrevious} disabled={step === 1} variant="outline" className="flex-1 bg-transparent">
          Previous
        </Button>
        {step < 4 && (
          <Button onClick={handleNext} className="flex-1 gap-2 bg-primary hover:bg-primary/90">
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
