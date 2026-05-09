'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { OtpInput } from '@/components/otp-input'
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyOtp, resendOtp } from '@/services/otpService'

function VerifyEmailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = (searchParams.get('email') || '').trim().toLowerCase()

  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Resend cooldown — read from server response after each successful resend.
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  // If someone hits /verify-email with no email param, fail loudly.
  if (!email) {
    return (
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-xl font-bold mb-2">Missing email</h1>
        <p className="text-foreground/60 text-sm mb-4">
          Open this page from the link sent in your registration email, or try signing up again.
        </p>
        <Link href="/register" className="text-primary hover:underline font-medium">
          Go to sign up
        </Link>
      </div>
    )
  }

  const submit = async (codeMaybe?: string) => {
    const code = (codeMaybe ?? otp).trim()
    if (code.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }
    setSubmitting(true)
    setError('')
    setInfo('')
    try {
      const res = await verifyOtp(email, code)
      if (res.emailVerified) {
        setSuccess(true)
        setTimeout(() => router.push('/login?verified=1'), 1500)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Verification failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    setError('')
    setInfo('')
    try {
      const res = await resendOtp(email)
      setInfo(res.message)
      setCooldown(res.cooldownSeconds || 60)
      setOtp('')
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message
      if (status === 429 && msg) {
        // Server told us how long to wait — parse it for the cooldown timer.
        const m = msg.match(/(\d+)/)
        if (m) setCooldown(parseInt(m[1], 10))
      }
      setError(msg || 'Could not resend code. Try again in a moment.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="flex justify-center mb-5">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-7 w-7 text-primary" />
          </div>
        </div>

        {success ? (
          <div className="text-center">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-foreground mb-1">Email verified!</h1>
            <p className="text-foreground/60 text-sm">Redirecting you to login…</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-1">Check your email</h1>
              <p className="text-foreground/60 text-sm">
                We sent a 6-digit code to{' '}
                <strong className="text-foreground">{email}</strong>. It expires in 10 minutes.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{info}</span>
              </div>
            )}

            <div className="mb-6">
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={(v) => submit(v)}
                disabled={submitting}
                error={!!error}
              />
            </div>

            <button
              type="button"
              onClick={() => submit()}
              disabled={submitting || otp.length !== 6}
              className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 mb-3"
            >
              {submitting ? 'Verifying…' : 'Verify'}
            </button>

            <div className="text-center text-sm text-foreground/60">
              Didn't get the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-border text-center">
              <Link href="/register" className="text-sm text-foreground/60 hover:text-foreground">
                Wrong email? Sign up again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20">
        <Suspense
          fallback={
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          }
        >
          <VerifyEmailInner />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
