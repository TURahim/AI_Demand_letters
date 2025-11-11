'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { authApi } from '@/src/api/auth.api'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firmName, setFirmName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [formError, setFormError] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const resetErrors = () => {
    setFormError('')
    setFieldErrors({})
  }

  const validatePasswordStrength = (value: string) => {
    const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    return complexity.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetErrors()

    if (!firstName || !lastName || !email || !password || !firmName) {
      const msg = 'Please fill in all required fields'
      setFormError(msg)
      toast.error(msg)
      return
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match'
      setFormError(msg)
      setFieldErrors({ confirmPassword: msg })
      toast.error(msg)
      return
    }

    if (!validatePasswordStrength(password)) {
      const msg = 'Password must be at least 8 characters and include uppercase, lowercase, and a number'
      setFormError(msg)
      setFieldErrors({ password: msg })
      toast.error(msg)
      return
    }

    if (!agreedToTerms) {
      const msg = 'Please agree to the Terms of Service'
      setFormError(msg)
      toast.error(msg)
      return
    }

    setLoading(true)

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        firmName: firmName.trim(),
      }

      const response = await authApi.register(payload)

      if (response.status === 'success' && response.data) {
        const { user, accessToken } = response.data
        toast.success('Account created successfully!')

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(user))
          localStorage.setItem('auth_token', accessToken)
        }

        // Prefer Next.js navigation but fall back to window redirect
        try {
          router.push('/dashboard')
          setTimeout(() => {
            if (window.location.pathname !== '/dashboard') {
              window.location.href = '/dashboard'
            }
          }, 150)
        } catch (navError) {
          window.location.href = '/dashboard'
        }
      } else {
        const apiMessage = response.message || 'Registration failed'
        const apiErrors = response.errors || []

        if (apiErrors.length > 0) {
          const fieldErrorMap: Record<string, string> = {}

          apiErrors.forEach((error) => {
            const key = error.field || 'form'
            fieldErrorMap[key] = error.message
          })

          setFieldErrors(fieldErrorMap)
          const summaryMessage = apiErrors.map((error) => error.message).join(', ')
          setFormError(summaryMessage)
          toast.error(summaryMessage || 'Please correct the highlighted fields')
        } else {
          setFormError(apiMessage)
          toast.error(apiMessage)
        }
      }
    } catch (error: any) {
      const fallbackMessage = error?.message || 'Unable to create account. Please try again.'
      setFormError(fallbackMessage)
      toast.error(fallbackMessage)
      console.error('Registration exception:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderFieldError = (field: string) => {
    if (!fieldErrors[field]) return null
    return (
      <p
        id={`${field}-error`}
        className="text-sm text-destructive mt-1"
        role="alert"
      >
        {fieldErrors[field]}
      </p>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border border-border">
        <div className="p-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
              <span className="text-primary-foreground font-bold">S</span>
            </div>
            <span className="font-bold text-lg">Steno</span>
          </Link>

          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground text-sm mb-6">Join legal professionals saving hours every week</p>

          {/* Error Alert */}
          {formError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium" role="alert">
                {formError}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                required
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
              />
              {renderFieldError('firstName')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
                required
                aria-invalid={!!fieldErrors.lastName}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
              />
              {renderFieldError('lastName')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="firmName">Law Firm Name</Label>
              <Input
                id="firmName"
                type="text"
                placeholder="Smith & Associates"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                disabled={loading}
                required
                aria-invalid={!!fieldErrors.firmName}
                aria-describedby={fieldErrors.firmName ? 'firmName-error' : undefined}
              />
              {renderFieldError('firmName')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {renderFieldError('email')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              {renderFieldError('password')}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {renderFieldError('confirmPassword')}
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                className="w-4 h-4 mt-1"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                aria-invalid={!!fieldErrors.terms}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </Label>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
