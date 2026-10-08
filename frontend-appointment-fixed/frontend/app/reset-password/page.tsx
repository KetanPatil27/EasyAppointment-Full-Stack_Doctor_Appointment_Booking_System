'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { resetPassword } from '@/services/authService'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired token')
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
        <p className="text-destructive">Invalid reset link. Please request a new one.</p>
        <Link href="/forgot-password" className="inline-block mt-4 text-primary hover:underline">
          Request New Link
        </Link>
      </div>
    )
  }

  return success ? (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
      <p className="text-green-800 font-medium">Password updated successfully!</p>
      <p className="text-green-700 text-sm mt-1">Redirecting to login...</p>
    </div>
  ) : (
    <>
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              className="w-full pl-12 pr-12 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Updating...' : 'Reset Password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 md:py-20">
        <div className="w-full max-w-md px-4">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Reset Password</h1>
              <p className="text-xs sm:text-sm text-foreground/60">Enter your new password below</p>
            </div>
            <Suspense fallback={<p className="text-center text-foreground/60">Loading...</p>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
