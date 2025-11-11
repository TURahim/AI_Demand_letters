'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { authApi } from '@/src/api/auth.api'
import { useMutation } from '@/src/hooks/useApi'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const { mutate, loading } = useMutation(authApi.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('') // Clear previous errors

    if (!email || !password) {
      const msg = 'Please fill in all fields'
      setErrorMessage(msg)
      toast.error(msg)
      return
    }

    const result = await mutate({ email, password })
    console.log('Login result:', result)

    if (result.success) {
      toast.success('Welcome back!')
      console.log('Redirecting to /dashboard...')
      
      // Use window.location for more reliable navigation
      window.location.href = '/dashboard'
    } else {
      const msg =
        result.error ||
        result.errors?.[0]?.message ||
        (Array.isArray(result.errors) && result.errors.length > 0
          ? result.errors.map((err) => err.message).join(', ')
          : 'Login failed')
      
      console.error('Login error:', msg)
      setErrorMessage(msg)
      toast.error(msg)
    }
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

          <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your account to continue</p>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Label htmlFor="remember" className="text-sm cursor-pointer">
                Remember me
              </Label>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2 text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
            <Link href="#" className="text-primary hover:underline inline-block">
              Forgot password?
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
