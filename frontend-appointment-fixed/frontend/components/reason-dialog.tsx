'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ReasonDialogProps {
  open: boolean
  title: string
  description: string
  /** "Suspend", "Delete" — used as the primary button label. */
  confirmLabel: string
  /** Called with the entered reason on confirm. Async — caller can throw to keep dialog open. */
  onConfirm: (reason: string) => Promise<void> | void
  onCancel: () => void
  /** When true, the danger styling is applied (red). */
  danger?: boolean
  /** Allow empty reason. Default false — admin must type a reason. */
  allowEmpty?: boolean
}

/**
 * Modal that prompts the admin for a reason before destructive actions
 * (suspend, delete). Keeps the dialog open if onConfirm throws.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
  allowEmpty
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleConfirm = async () => {
    if (!allowEmpty && !reason.trim()) {
      setError('Please enter a reason — the user will see it in the notification email.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onConfirm(reason.trim())
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Action failed.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    setReason('')
  }

  const handleClose = () => {
    if (submitting) return
    setReason('')
    setError('')
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-start justify-between gap-4 p-5 border-b border-border ${danger ? 'bg-destructive/5' : 'bg-muted/30'}`}>
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center ${
                danger ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{title}</h2>
              <p className="text-foreground/60 text-sm mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="p-1 rounded hover:bg-muted text-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={3}
              placeholder="Visible to the affected user. e.g. Repeated patient complaints…"
              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              autoFocus
            />
          </label>
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-muted/30 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {submitting ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
