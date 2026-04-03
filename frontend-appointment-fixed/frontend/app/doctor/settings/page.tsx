'use client'

import { useApp } from '@/lib/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DoctorSidebar } from '@/components/doctor-sidebar'
import { deleteMyAccount } from '@/services/userService'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DoctorSettingsPage() {
  const { currentUser, isAuthenticated, isAuthLoading, logout } = useApp()
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated || currentUser?.role !== 'doctor') {
        router.push('/login')
      }
    }
  }, [isAuthLoading, isAuthenticated, currentUser])

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return
    setDeleting(true)
    try {
      await deleteMyAccount(currentUser!._id)
      toast.success('Account deleted successfully')
      logout()
      router.push('/')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  if (isAuthLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground/60">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DoctorSidebar />
      <div className="flex-1 overflow-auto ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="p-6 md:p-8 max-w-2xl">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-foreground/60 mb-8">Manage your account preferences</p>

          {/* Account Info */}
          <div className="rounded-xl border border-border bg-card p-6 mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Name</span>
                <span className="font-medium text-foreground">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Email</span>
                <span className="font-medium text-foreground">{currentUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Role</span>
                <span className="font-medium text-foreground capitalize">{currentUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Status</span>
                <span className={`font-medium capitalize ${
                  currentUser.status === 'active' ? 'text-green-600' :
                  currentUser.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                }`}>{currentUser.status}</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
            </div>
            <p className="text-sm text-foreground/70 mb-4">
              Deleting your account is permanent. All your data, appointments, and slots will be affected.
              Active appointments will be cancelled.
            </p>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete My Account
              </button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-background">
                <p className="text-sm font-medium text-foreground">
                  Type <strong>DELETE</strong> to confirm account deletion:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== 'DELETE' || deleting}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => { setShowConfirm(false); setConfirmText('') }}
                    className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
