'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useApp } from '@/lib/app-context'

export default function AdminLoginPage() {
  const router = useRouter()
  const { login } = useApp()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ email: '', password: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const success = await login(formData.email, formData.password)
      if (!success) { setError('Invalid email or password'); return }

      const storedUser = JSON.parse(localStorage.getItem('currentUser')!)
      if (storedUser.role !== 'admin') {
        setError('Access denied. This account is not an admin.')
        return
      }
      router.push('/admin')
    } catch {
      setError('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Top bar with Back to Home */}
      <div className="p-4 sm:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      </div>

      {/* Centred card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-8">

            {/* Logo + title */}
            <div className="flex flex-col items-center mb-8">
              <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-2xl font-bold mb-4 shadow-lg">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
              <p className="text-sm text-foreground/60 mt-1">Sign in to manage EasyAppointment</p>
            </div>

            {error && (
              <div className="mb-5 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  id="email" name="email" type="email" required
                  value={formData.email} onChange={handleChange}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    required value={formData.password} onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={isLoading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
              >
                {isLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Demo creds */}
            {/* <div className="mt-6 p-3.5 bg-muted rounded-xl border border-border/60">
              <p className="text-xs font-semibold text-foreground/70 mb-1.5">Demo Credentials</p>
              <p className="text-xs text-foreground/60">admin@easyappointment.com</p>
              <p className="text-xs text-foreground/60">Password: admin123</p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  )
}
