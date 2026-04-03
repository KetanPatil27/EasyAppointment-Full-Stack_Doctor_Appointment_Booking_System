'use client'

import { useApp } from '@/lib/app-context'
import { AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'

/**
 * Gate component for doctor pages. 
 * If the doctor's user account status is not 'active', shows a blocking message.
 * Wrap doctor page content with: <DoctorPendingGate>{children}</DoctorPendingGate>
 */
export function DoctorPendingGate({ children, blockPending = false }: { children: React.ReactNode, blockPending?: boolean }) {
  const { currentUser } = useApp()

  if (!currentUser || currentUser.role !== 'doctor') return <>{children}</>

  // If status is 'active' or undefined (backwards compat), allow through
  if (!currentUser.status || currentUser.status === 'active') {
    return <>{children}</>
  }

  const isPending = currentUser.status === 'pending'

  if (isPending && !blockPending) {
    return <>{children}</>
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${
          isPending ? 'bg-yellow-100' : 'bg-red-100'
        }`}>
          {isPending
            ? <Clock className="h-8 w-8 text-yellow-600" />
            : <AlertTriangle className="h-8 w-8 text-red-600" />
          }
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {isPending ? 'Account Pending Approval' : 'Account Suspended'}
        </h2>
        <p className="text-foreground/60 mb-6">
          {isPending
            ? 'Your account is pending admin approval. You cannot create appointment slots or manage bookings until approved. Please complete your profile so the admin can review it.'
            : 'Your account has been suspended. Please contact support for assistance.'
          }
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  )
}
