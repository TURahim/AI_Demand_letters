import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export default function SignupPage() {
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

          {/* Form */}
          <form className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Full Name</label>
              <Input type="text" placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Email</label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Password</label>
              <Input type="password" placeholder="Create a password" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Confirm Password</label>
              <Input type="password" placeholder="Confirm password" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" />
              <span className="text-sm">I agree to the Terms of Service and Privacy Policy</span>
            </label>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
              Create Account
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{" "}
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
