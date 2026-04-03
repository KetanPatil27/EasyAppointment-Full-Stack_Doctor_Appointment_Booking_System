'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { useApp } from '@/lib/app-context'
import { Lock, Trash2, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'
import api from '@/services/api'

export default function SettingsPage() {
  const { currentUser, logout } = useApp()
  const router = useRouter()
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const [pwdForm, setPwdForm] = useState({
    oldPassword: '', newPassword: '', confirmPassword: ''
  })

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'Passwords do not match' })
      return
    }
    if (pwdForm.newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    setChangingPwd(true)
    setPwdMsg(null)

    try {
      // Verify old password by authenticating
      await api.post('/authentication', {
        strategy: 'local',
        email: currentUser?.email,
        password: pwdForm.oldPassword
      })

      // Update password
      await api.patch(`/users/${currentUser?._id}`, {
        password: pwdForm.newPassword
      })

      setPwdMsg({ type: 'success', text: 'Password updated successfully!' })
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update password'
      setPwdMsg({ type: 'error', text: msg.includes('Invalid') ? 'Current password is incorrect' : msg })
    } finally {
      setChangingPwd(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    setDeleteError('')
    try {
      await api.delete(`/users/${currentUser?._id}`)
      logout()
      router.push('/')
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete account')
      setDeletingAccount(false)
    }
  }

  return (
    <div className="flex bg-background min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 ml-0 pt-14 lg:ml-64 lg:pt-0">
        <div className="border-b border-border">
          <div className="mx-auto max-w-3xl px-6 md:px-8 py-6">
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-foreground/60 mt-1">Manage your account security</p>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 md:px-8 py-8 space-y-8">
          {/* Change Password */}
          <section className="rounded-2xl border border-border bg-card p-8">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary" /> Change Password
            </h2>

            {pwdMsg && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${pwdMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {[
                { key: 'oldPassword', label: 'Current Password', show: showOld, toggle: () => setShowOld(!showOld) },
                { key: 'newPassword', label: 'New Password', show: showNew, toggle: () => setShowNew(!showNew) },
                { key: 'confirmPassword', label: 'Confirm New Password', show: showConfirm, toggle: () => setShowConfirm(!showConfirm) }
              ].map(({ key, label, show, toggle }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      value={(pwdForm as any)[key]}
                      onChange={e => setPwdForm(prev => ({ ...prev, [key]: e.target.value }))}
                      required
                      className="w-full px-4 py-2.5 pr-12 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70">
                      {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={changingPwd}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {changingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {changingPwd ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </section>

          {/* Delete Account */}
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
            <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-destructive" /> Delete Account
            </h2>
            <p className="text-sm text-foreground/60 mb-6">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{deleteError}</div>
            )}

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Delete My Account
              </button>
            ) : (
              <div className="bg-card border border-destructive/30 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">Are you absolutely sure?</p>
                    <p className="text-sm text-foreground/60 mt-1">
                      This will permanently delete your account ({currentUser?.email}) and all your data including appointments and medical records.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="flex items-center gap-2 px-6 py-2.5 bg-destructive text-white rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deletingAccount ? 'Deleting...' : 'Yes, Delete Permanently'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingAccount}
                    className="px-6 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
