/**
 * Single source of truth for the cascading effects of an admin
 * suspending / unsuspending / deleting a user account.
 *
 * Behaviour matrix (from Upgrade 5–7 spec):
 *
 *                       │ DOCTOR                                │ PATIENT
 * ──────────────────────┼───────────────────────────────────────┼──────────────────────────────
 *  SUSPEND              │ user.status='suspended'               │ user.status='suspended'
 *                       │ slots.status='inactive' (all slots)   │
 *                       │ future appts → cancelled              │
 *                       │   reason='doctor_suspended'           │
 *                       │ past appts: untouched                 │
 *                       │ doctor hidden from search             │
 *                       │ EMAIL doctor + EMAIL affected patients│ EMAIL the patient
 * ──────────────────────┼───────────────────────────────────────┼──────────────────────────────
 *  UNSUSPEND            │ user.status='active'                  │ user.status='active'
 *                       │ slots.status='active' (all)           │
 *                       │ appts NOT auto-restored               │
 *                       │ (those patients already booked others)│
 * ──────────────────────┼───────────────────────────────────────┼──────────────────────────────
 *  DELETE               │ user.isDeleted=true (soft)            │ user.isDeleted=true (soft)
 *                       │ slots.status='deleted'                │
 *                       │ future appts → cancelled              │
 *                       │   reason='doctor_removed'             │
 *                       │ refunds flagged                       │
 *                       │ EMAIL doctor + EMAIL affected patients│ EMAIL the patient
 *
 * Atomicity: ALL DB writes happen in a single MongoDB session-based transaction.
 * If any step fails, the transaction is aborted and the DB is unchanged.
 *
 * Email and Socket.IO emit happen AFTER the transaction commits so they reflect
 * actual persisted state. They are best-effort and never roll back the DB.
 *
 * Atlas free M0 supports transactions (3-node replica set). Local mongod must
 * be started with --replSet for transactions to work; otherwise the driver
 * throws "Transactions are not supported."
 */
import { ObjectId } from 'mongodb'
import type { Application } from '../declarations'
import {
  suspendedTemplate,
  deletedTemplate,
  patientCascadeTemplate
} from './notification-emails'
import { sendNotificationEmail } from './mailer'

export type CascadeAction = 'suspend' | 'unsuspend' | 'delete'

export interface CascadeContext {
  app: Application
  action: CascadeAction
  user: {
    _id: string
    name: string
    email: string
    role: 'doctor' | 'patient' | 'admin'
  }
  reason: string
  actorId: string // admin user _id
}

const toObjectId = (id: string): any => (ObjectId.isValid(id) ? new ObjectId(id) : id)

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000'
const EMAIL_BATCH_SIZE = 10

/**
 * Run the cascade. Returns counts of records touched + the audit-log id so
 * callers can attach it to the API response if useful.
 */
export async function cascadeSuspendOrDelete(
  ctx: CascadeContext
): Promise<{
  slotsAffected: number
  appointmentsCancelled: number
  patientsNotified: number
  auditLogId: string
}> {
  const { app, action, user, reason, actorId } = ctx
  const today = new Date().toISOString().split('T')[0]

  const dbPromise = app.get('mongodbClient')
  const db = await dbPromise
  // mongoClient was stored on the app by src/mongodb.ts so we can start a
  // transactional session here. If absent (e.g. local mongod without a replica
  // set), `session` stays null and the writes happen WITHOUT a transaction —
  // a graceful degradation for development. Atlas always supports it.
  const client: any = (app as any).get?.('mongoClient') ?? null
  const userId = toObjectId(user._id)

  let session: any = null
  let slotsAffected = 0
  let appointmentsCancelled = 0
  const cancelledAppts: any[] = []
  let auditLogId = ''

  // ── Transaction ──
  try {
    session = client?.startSession?.()
    if (session) session.startTransaction()

    const sessionOpt = session ? { session } : {}

    const usersCol = db.collection('users')
    const slotsCol = db.collection('slots')
    const apptsCol = db.collection('appointments')
    const auditCol = db.collection('audit-logs')

    // 1. Update user document.
    const now = new Date().toISOString()
    if (action === 'suspend') {
      await usersCol.updateOne(
        { _id: userId },
        { $set: { status: 'suspended', suspendedReason: reason, suspendedAt: now, updatedAt: now } },
        sessionOpt
      )
    } else if (action === 'unsuspend') {
      await usersCol.updateOne(
        { _id: userId },
        {
          $set: { status: 'active', updatedAt: now },
          $unset: { suspendedReason: '', suspendedAt: '' }
        },
        sessionOpt
      )
    } else {
      // delete = soft delete + status:'inactive'
      await usersCol.updateOne(
        { _id: userId },
        {
          $set: {
            isDeleted: true,
            deletedAt: now,
            deletedReason: reason,
            status: 'inactive',
            updatedAt: now
          }
        },
        sessionOpt
      )
    }

    // 2 + 3. Doctor-only: cascade to slots + future appointments.
    if (user.role === 'doctor') {
      const newSlotStatus =
        action === 'suspend' ? 'inactive' : action === 'delete' ? 'deleted' : 'active'

      const slotResult = await slotsCol.updateMany(
        { doctorId: user._id },
        { $set: { status: newSlotStatus } },
        sessionOpt
      )
      slotsAffected = slotResult.modifiedCount

      if (action !== 'unsuspend') {
        const cancelReason = action === 'suspend' ? 'doctor_suspended' : 'doctor_removed'

        // Find then update so we can email the patients afterwards.
        const futureAppts = await apptsCol
          .find(
            {
              doctorId: user._id,
              date: { $gte: today },
              status: { $in: ['booked', 'confirmed'] }
            },
            sessionOpt
          )
          .toArray()
        cancelledAppts.push(...futureAppts)

        if (futureAppts.length > 0) {
          const updateResult = await apptsCol.updateMany(
            {
              _id: { $in: futureAppts.map((a: any) => a._id) }
            },
            {
              $set: {
                status: 'cancelled',
                cancellationReason: cancelReason,
                refundFlagged: action === 'delete',
                updatedAt: now
              }
            },
            sessionOpt
          )
          appointmentsCancelled = updateResult.modifiedCount
        }
      }
    }

    // 4. Audit-log.
    const auditDoc = {
      action,
      targetUserId: user._id,
      targetUserRole: user.role,
      targetUserEmail: user.email,
      actorId,
      reason,
      slotsAffected,
      appointmentsCancelled,
      timestamp: now
    }
    const auditInsert = await auditCol.insertOne(auditDoc, sessionOpt)
    auditLogId = auditInsert.insertedId.toString()

    if (session) await session.commitTransaction()
  } catch (err) {
    if (session) {
      try { await session.abortTransaction() } catch {}
    }
    throw err
  } finally {
    if (session) {
      try { await session.endSession() } catch {}
    }
  }

  // ── After commit: notifications (best-effort, never roll back) ──

  // Email the affected user (Upgrade 5).
  if (action !== 'unsuspend') {
    try {
      const tpl =
        action === 'suspend'
          ? suspendedTemplate(user, reason)
          : deletedTemplate(user, reason)
      await sendNotificationEmail(user.email, tpl.subject, tpl.html)
    } catch (err) {
      console.error('[Cascade] Failed to email affected user', {
        userId: user._id,
        action,
        error: (err as Error).message
      })
    }
  }

  // Email & Socket.IO notify affected patients (Upgrade 6).
  let patientsNotified = 0
  if (cancelledAppts.length > 0) {
    patientsNotified = await notifyAffectedPatients(app, user, cancelledAppts, action as 'suspend' | 'delete')
  }

  return { slotsAffected, appointmentsCancelled, patientsNotified, auditLogId }
}

/**
 * Find all unique patients with cancelled future appointments, fetch the
 * doctor's specialisations to suggest alternatives, then email them in
 * batches of 10. Promise.allSettled means one failed send doesn't block others.
 */
async function notifyAffectedPatients(
  app: Application,
  doctor: { _id: string; name: string },
  cancelledAppts: any[],
  reason: 'suspend' | 'delete'
): Promise<number> {
  // Group cancelled appointments by patient.
  const byPatient = new Map<string, any[]>()
  for (const a of cancelledAppts) {
    const list = byPatient.get(a.patientId) || []
    list.push(a)
    byPatient.set(a.patientId, list)
  }

  // Look up alternative doctors with overlapping specializations.
  const doctorsService = app.service('doctors')
  let myDoctorProfile: any = null
  try {
    const found: any = await doctorsService.find({
      query: { userId: doctor._id, $limit: 1 },
      provider: undefined
    } as any)
    myDoctorProfile = (found?.data || found)?.[0]
  } catch {
    // continue without alternatives
  }

  const myProfileSpecs: string[] = Array.isArray(myDoctorProfile?.specializations)
    ? myDoctorProfile.specializations
    : myDoctorProfile?.specialization
    ? [myDoctorProfile.specialization]
    : []

  let alternativeDoctors: Array<{ name: string; specializations: string[]; profileLink: string }> = []
  if (myProfileSpecs.length > 0) {
    try {
      const altsResp: any = await doctorsService.find({
        query: {
          $or: [
            { specializations: { $in: myProfileSpecs } },
            { specialization: { $in: myProfileSpecs } }
          ],
          userId: { $ne: doctor._id },
          $limit: 3
        },
        provider: undefined
      } as any)
      const alts = altsResp?.data || altsResp || []
      alternativeDoctors = alts.map((d: any) => ({
        name: d.name || 'Available doctor',
        specializations: Array.isArray(d.specializations)
          ? d.specializations
          : d.specialization
          ? [d.specialization]
          : [],
        profileLink: `${FRONTEND_URL()}/doctors/${d._id}`
      }))
    } catch {
      // best-effort
    }
  }

  const usersService = app.service('users')
  const patientIds = Array.from(byPatient.keys())

  // Resolve patient name + email in batches via the users service.
  const patientLookups = await Promise.allSettled(
    patientIds.map((id) => usersService.get(id, { provider: undefined }))
  )

  const sendOne = async (patientId: string, patientLookup: PromiseSettledResult<any>) => {
    if (patientLookup.status !== 'fulfilled') return false
    const patient = patientLookup.value
    if (!patient?.email) return false

    const appointments = byPatient.get(patientId) || []
    const tpl = patientCascadeTemplate({
      patientName: patient.name || 'Patient',
      doctorName: doctor.name,
      reason: reason === 'suspend' ? 'suspended' : 'deleted',
      affectedAppointments: appointments.map((a) => ({
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime
      })),
      alternativeDoctors,
      rebookLink: `${FRONTEND_URL()}/doctors`,
      fee: appointments[0]?.consultationFee
    })

    try {
      await sendNotificationEmail(patient.email, tpl.subject, tpl.html)
      // Real-time in-app nudge (Upgrade 6).
      try {
        ;(app as any).emit('patient-doctor-cascade', {
          patientId,
          doctorId: doctor._id,
          reason,
          appointmentIds: appointments.map((a) => a._id?.toString())
        })
      } catch {
        /* socket layer optional */
      }
      return true
    } catch (err) {
      console.error('[Cascade] Patient email failed', {
        patientId,
        error: (err as Error).message
      })
      return false
    }
  }

  // Send in batches of EMAIL_BATCH_SIZE.
  let successCount = 0
  for (let i = 0; i < patientIds.length; i += EMAIL_BATCH_SIZE) {
    const batchIds = patientIds.slice(i, i + EMAIL_BATCH_SIZE)
    const batchLookups = patientLookups.slice(i, i + EMAIL_BATCH_SIZE)
    const results = await Promise.allSettled(
      batchIds.map((id, idx) => sendOne(id, batchLookups[idx]))
    )
    successCount += results.filter((r) => r.status === 'fulfilled' && r.value === true).length
  }

  return successCount
}
