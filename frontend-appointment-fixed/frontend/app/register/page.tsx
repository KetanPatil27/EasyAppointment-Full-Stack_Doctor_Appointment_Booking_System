'use client'

import React from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { registerUser } from '@/services/userService'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [userType, setUserType] = useState<'patient' | 'doctor'>('patient')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      toast.error('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      // Step 1 of the 2-step signup flow: create the account in unverified state.
      // The backend issues a 6-digit OTP and emails it; we redirect the user to
      // /verify-email to enter it. Do NOT auto-login here — login is gated on
      // emailVerified and would just throw "verify your email first."
      await registerUser({
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone,
        password: formData.password,
        role: userType,
      })

      toast.success('Account created. Check your email for the verification code.')
      router.push(`/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'An error occurred'
      const displayMsg = msg.includes('duplicate') || msg.includes('E11000')
        ? 'An account with this email already exists.'
        : msg
      setError(displayMsg)
      toast.error(displayMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const isPhoneValid = formData.phone ? isValidPhoneNumber(formData.phone) : false
  const isFormValid = formData.name && formData.email && isPhoneValid &&
    formData.password && formData.password === formData.confirmPassword && agreeToTerms

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 md:py-20">
        <div className="w-full max-w-md px-4">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Create Account</h1>
              <p className="text-xs sm:text-sm text-foreground/60">Join EasyAppointment today</p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-foreground mb-3">Register As</p>
              <div className="grid grid-cols-2 gap-3">
                {(['patient', 'doctor'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setUserType(type)}
                    className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all capitalize ${
                      userType === type ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
                <div className="relative phone-input-container">
                  <PhoneInput
                    international
                    defaultCountry="IN"
                    value={formData.phone}
                    onChange={(value?: string) => setFormData(prev => ({ ...prev, phone: value || '' }))}
                    placeholder="+91 12345 67890"
                    className="w-full pl-4 pr-4 py-3 rounded-lg border border-border bg-background text-foreground focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow outline-none flex items-center gap-3"
                  />
                  {formData.phone && !isValidPhoneNumber(formData.phone) && (
                    <p className="absolute -bottom-6 left-1 text-xs text-destructive font-medium">
                      Invalid phone number for selected country
                    </p>
                  )}
                  <style jsx global>{`
                    .phone-input-container .PhoneInputInput {
                      background: transparent;
                      border: none;
                      outline: none;
                      color: inherit;
                      width: 100%;
                      font-size: 1rem;
                    }
                    .phone-input-container .PhoneInputCountry {
                      margin-right: 0.5rem;
                      padding-right: 0.5rem;
                      border-right: 1px solid hsl(var(--border) / 0.5);
                    }
                    .phone-input-container .PhoneInputCountrySelect {
                      padding: 0.5rem;
                    }
                    .phone-input-container .PhoneInputCountryIcon {
                      width: 1.5rem;
                      height: 1rem;
                      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    }
                  `}</style>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" required
                    className="w-full pl-12 pr-12 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
                  <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required
                    className="w-full pl-12 pr-12 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} className="h-4 w-4 accent-primary mt-1" />
                <span className="text-xs text-foreground/70">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and{' '}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </span>
              </label>

              <button type="submit" disabled={!isFormValid || isLoading}
                className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6">
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-foreground/60 mt-8">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">Sign in here</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
