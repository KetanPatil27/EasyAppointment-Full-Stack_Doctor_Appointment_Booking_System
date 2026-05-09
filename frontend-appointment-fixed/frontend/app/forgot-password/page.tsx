'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Mail, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { forgotPassword } from '@/services/authService'

type FeedbackKind = 'idle' | 'sent' | 'no-account' | 'rate-limited' | 'error'

interface Feedback {
  kind: FeedbackKind
  message: string
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFeedback({ kind: 'idle', message: '' })

    try {
      const res = await forgotPassword(email.trim().toLowerCase())
      setFeedback({
        kind: 'sent',
        message: res?.message || 'If that email exists, a reset link has been sent.'
      })
    } catch (err: any) {
      const status = err?.response?.status
      const apiMessage: string = err?.response?.data?.message || ''

      if (status === 429) {
        setFeedback({
          kind: 'rate-limited',
          message:
            apiMessage ||
            'Too many reset attempts for this email. Please wait an hour before trying again.'
        })
      } else if (
        status === 400 &&
        /no account found/i.test(apiMessage)
      ) {
        // Strict-validation mode is enabled on the backend.
        setFeedback({
          kind: 'no-account',
          message: apiMessage
        })
      } else {
        setFeedback({
          kind: 'error',
          message: apiMessage || 'Something went wrong. Please try again.'
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isSent = feedback.kind === 'sent'
  const showInlineAlert =
    feedback.kind === 'no-account' ||
    feedback.kind === 'rate-limited' ||
    feedback.kind === 'error'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20">
        <div className="w-full max-w-md px-4">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Forgot Password</h1>
              <p className="text-foreground/60">Enter your email and we'll send you a reset link</p>
            </div>

            {isSent ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-800 font-medium">{feedback.message}</p>
                <p className="text-green-700 text-sm mt-1">
                  Check your email — the link expires in 15 minutes.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-4 text-primary hover:underline text-sm font-medium"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <>
                {showInlineAlert && (
                  <div
                    className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                      feedback.kind === 'no-account'
                        ? 'bg-amber-50 border border-amber-200 text-amber-900'
                        : feedback.kind === 'rate-limited'
                        ? 'bg-orange-50 border border-orange-200 text-orange-900'
                        : 'bg-destructive/10 border border-destructive/20 text-destructive'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{feedback.message}</p>
                      {feedback.kind === 'no-account' && (
                        <p className="mt-1 text-xs">
                          <Link href="/register" className="font-medium underline">
                            Create an account
                          </Link>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/40 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || feedback.kind === 'rate-limited'}
                    className="w-full rounded-lg bg-primary px-4 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
