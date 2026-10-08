'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useApp } from '@/lib/app-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

function LoginForm() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [userType,     setUserType]     = useState<'patient' | 'doctor'>('patient')
  const [isLoading,    setIsLoading]    = useState(false)
  const [error,        setError]        = useState('')
  const { login, isAuthenticated, currentUser, isAuthLoading } = useApp()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') || ''

  // If already logged in, send to correct dashboard immediately
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && currentUser) {
      const dest = redirect ||
        (currentUser.role === 'patient' ? '/dashboard' :
         currentUser.role === 'doctor'  ? '/doctor/dashboard' : '/admin')
      router.replace(dest)
    }
  }, [isAuthLoading, isAuthenticated, currentUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      // Pass userType to backend for role validation
      const user = await login(email, password, userType)
      if (!user) {
        setError('Invalid email or password')
        toast.error('Invalid email or password')
        return
      }

      // Redirect — use ?redirect= param first (e.g. came from booking page)
      if (redirect) { router.replace(redirect); return }

      if (user.role === 'patient') router.replace('/dashboard')
      else if (user.role === 'doctor') router.replace('/doctor/dashboard')
      else router.replace('/admin')
    } catch (err: any) {
      // If the account exists but isn't email-verified yet, send the user to
      // the OTP page. The backend tags this case with `data.reason`.
      const data = err?.response?.data
      if (data?.data?.reason === 'email-not-verified') {
        const target = data.data.email || email
        toast.message('Please verify your email to continue.')
        router.push(`/verify-email?email=${encodeURIComponent(target)}`)
        return
      }
      const msg = data?.message || err?.message || 'Login failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-xl mb-3 shadow-sm">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <circle cx="16" cy="10" r="5" stroke="white" strokeWidth="2" fill="none" />
              <path d="M11 10 C11 10, 8 10, 8 15 C8 22, 14 24, 16 24 C18 24, 24 22, 24 15 C24 10, 21 10, 21 10" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="11" cy="7" r="1.5" fill="white" />
              <circle cx="21" cy="7" r="1.5" fill="white" />
              <path d="M14 21 C14 20, 13 19, 14.5 19 C15.5 19, 16 20, 16 20 C16 20, 16.5 19, 17.5 19 C19 19, 18 20, 18 21 C18 22, 16 23.5, 16 23.5 C16 23.5, 14 22, 14 21Z" fill="white" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-foreground/60">Sign in to your EasyAppointment account</p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Login As</p>
          <div className="grid grid-cols-2 gap-3">
            {(['patient', 'doctor'] as const).map(type => (
              <button key={type} type="button" onClick={() => setUserType(type)}
                className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all capitalize ${
                  userType === type
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-foreground/60 hover:border-primary/40'
                }`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
              <input type="email" value={email} required placeholder="your@email.com"
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
              <input type={showPassword ? 'text' : 'password'} value={password} required placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-foreground/60 mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">Create account</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20">
        <Suspense fallback={<div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
