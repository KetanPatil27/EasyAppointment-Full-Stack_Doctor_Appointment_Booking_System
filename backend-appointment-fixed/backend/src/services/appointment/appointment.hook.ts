import { hooks as authHooks } from '@feathersjs/authentication'
import { Forbidden, BadRequest, Conflict } from '@feathersjs/errors'
import { ObjectId } from 'mongodb'
import { sendAppointmentConfirmation } from '../../utils/mailer'

const { authenticate } = authHooks

const filterAppointmentsByRole = async (context: any) => {
  const { user } = context.params
  if (!user) return context
  if (!context.params.query) context.params.query = {}

  if (user.role === 'doctor') {
    context.params.query.doctorId = user._id.toString()
  }
  if (user.role === 'patient') {
    context.params.query.patientId = user._id.toString()
  }
  return context
}

const restrictToPatient = async (context: any) => {
  const { user } = context.params
  if (!user || user.role !== 'patient') {
    throw new Forbidden('Only patients can book appointments')
  }
  return context
}

const restrictAppointmentPatch = async (context: any) => {
  const { user } = context.params
  const appointment = await context.service.get(context.id)

  if (user.role === 'patient') {
    if (appointment.patientId !== user._id.toString()) {
      throw new Forbidden('You can modify only your own appointment')
    }

    // Allow reschedule: patient can patch slotId (with new slot)
    const isReschedule = context.data.slotId && context.data.slotId !== appointment.slotId
    const isCancel = context.data.status === 'cancelled'

    if (!isReschedule && !isCancel) {
      throw new Forbidden('Patient can only cancel or reschedule appointment')
    }

    if (isReschedule && !['booked', 'confirmed'].includes(appointment.status)) {
      throw new BadRequest('Can only reschedule a booked or confirmed appointment')
    }
  }

  if (user.role === 'doctor') {
    if (appointment.doctorId !== user._id.toString()) {
      throw new Forbidden('You can manage only your own appointments')
    }
    const allowedFields = ['status', 'consultationFee', 'notes']
    const patchKeys = Object.keys(context.data)
    const invalidKeys = patchKeys.filter((k) => !allowedFields.includes(k))
    if (invalidKeys.length > 0) {
      throw new BadRequest(`Invalid fields: ${invalidKeys.join(', ')}`)
    }
    if (context.data.status) {
      const allowedStatuses = ['confirmed', 'completed', 'rejected']
      if (!allowedStatuses.includes(context.data.status)) {
        throw new BadRequest('Invalid status update')
      }
    }
  }
  return context
}

/**
 * Helper: convert a string id to a MongoDB ObjectId, returning the original
 * value if it isn't a valid 24-char hex string. Defensive — if the slot id
 * is malformed the findOneAndUpdate filter simply won't match and we throw
 * a clean Conflict error.
 */
const toObjectId = (id: string): any => {
  return ObjectId.isValid(id) ? new ObjectId(id) : id
}

/**
 * Atomically reserve a slot. Replaces the previous read-then-write code that
 * allowed two concurrent bookings to both read `isBooked: false`, both pass
 * the check, and both succeed in patching the slot — leading to a double
 * booking on the same time slot.
 *
 * `findOneAndUpdate` runs as a single MongoDB operation: only the first caller
 * whose filter matches `isBooked: false` gets the document back; every later
 * caller gets `null` and is rejected with a 409 Conflict.
 */
const bookSlot = async (context: any) => {
  const { app, data, params } = context
  if (!data?.slotId) {
    throw new BadRequest('slotId is required')
  }

  const slotService = app.service('slots')
  const slotsCollection = await slotService.options.Model
  const _id = toObjectId(data.slotId)

  const claimed = await slotsCollection.findOneAndUpdate(
    { _id, isBooked: false },
    { $set: { isBooked: true } },
    { returnDocument: 'after' }
  )

  if (!claimed) {
    // Filter didn't match: either the slot doesn't exist, or another request
    // already flipped isBooked to true between this user opening the page
    // and clicking "Book". Either way it's a 409, not a 500.
    throw new Conflict('This slot is no longer available. Please choose another.')
  }

  context.data = {
    slotId: data.slotId,
    doctorId: claimed.doctorId.toString(),
    patientId: params.user._id.toString(),
    status: 'booked',
    notes: data.notes || '',
    date: claimed.date,
    startTime: claimed.startTime,
    endTime: claimed.endTime,
    createdAt: new Date().toISOString()
  }
  return context
}

/**
 * Atomic reschedule:
 *   1. Atomically claim the new slot (only succeeds if isBooked: false).
 *   2. If claimed, best-effort release the old slot.
 *
 * Note: full multi-collection atomicity (release-old + claim-new + patch-
 * appointment in one transaction) is Phase 2 per the review. For now we at
 * least eliminate the double-claim race on the new slot, which is the only
 * step that can corrupt data; the worst case if step 2 fails is one stale
 * "isBooked: true" slot that never gets released — operationally annoying
 * but not a data integrity violation.
 */
const handleReschedule = async (context: any) => {
  const { app, data } = context
  if (!data.slotId) return context

  const slotService = app.service('slots')
  const appointment = await context.service.get(context.id)
  const slotsCollection = await slotService.options.Model
  const newSlotId = toObjectId(data.slotId)

  const claimed = await slotsCollection.findOneAndUpdate(
    { _id: newSlotId, isBooked: false },
    { $set: { isBooked: true } },
    { returnDocument: 'after' }
  )

  if (!claimed) {
    throw new Conflict('This slot is no longer available. Please choose another.')
  }

  // Release old slot. Failures here are logged but do not roll back the new
  // claim — the patient already has the new slot and rolling back would race
  // with another patient who may have just claimed it. Phase 2 will wrap this
  // sequence in a MongoDB transaction.
  if (appointment.slotId) {
    try {
      await slotService.patch(
        appointment.slotId,
        { isBooked: false },
        { provider: undefined }
      )
    } catch (err) {
      console.error('[Reschedule] Failed to release old slot', {
        appointmentId: context.id,
        oldSlotId: appointment.slotId,
        error: (err as Error).message
      })
    }
  }

  context.data = {
    slotId: data.slotId,
    date: claimed.date,
    startTime: claimed.startTime,
    endTime: claimed.endTime,
    status: 'booked',
    updatedAt: new Date().toISOString()
  }
  return context
}

const sendConfirmationEmail = async (context: any) => {
  try {
    const { app, result, method, data } = context

    // Only send email on create (booked) OR on patch if status is newly confirmed
    let emailType: 'booked' | 'confirmed' = 'booked'
    if (method === 'patch') {
      if (data?.status === 'confirmed' && result.status === 'confirmed') {
        emailType = 'confirmed'
      } else {
        return context // don't send email for other patches
      }
    }

    const [patient, doctorProfile] = await Promise.all([
      app.service('users').get(result.patientId, { provider: undefined }),
      app
        .service('doctors')
        .find({ query: { userId: result.doctorId }, provider: undefined } as any)
        .then((r: any) => r.data?.[0] || null)
        .catch(() => null)
    ])

    const doctorUser = doctorProfile
      ? await app.service('users').get(result.doctorId, { provider: undefined }).catch(() => null)
      : null

    await sendAppointmentConfirmation({
      emailType,
      patientEmail: patient.email,
      patientName: patient.name,
      doctorName: doctorUser?.name || 'Your Doctor',
      date: result.date || '',
      startTime: result.startTime || '',
      endTime: result.endTime || '',
      consultationFee: doctorProfile?.hourlyRate || 0,
      appointmentId: result._id.toString(),
      clinicName: doctorProfile?.clinicAddress?.clinicName,
      city: doctorProfile?.clinicAddress?.city,
      locality: doctorProfile?.clinicAddress?.locality,
      pincode: doctorProfile?.clinicAddress?.zipCode
    })
  } catch (err) {
    // Email failures must NOT block the booking from succeeding (the appointment
    // is already saved). But we DO want a structured log so it shows up clearly
    // in Render's log viewer instead of being lost in the noise.
    console.error('[Email] Failed to send confirmation', {
      appointmentId: context.result?._id?.toString(),
      patientEmail: context.result?.patientEmail,
      mailUserSet: !!process.env.MAIL_USER,
      mailPassSet: !!process.env.MAIL_PASS,
      error: (err as Error).message,
      code: (err as any).code,
      response: (err as any).response
    })
  }
  return context
}

const releaseSlotIfCancelled = async (context: any) => {
  const cancelledStatuses = ['cancelled', 'cancelled_by_patient', 'cancelled_by_doctor']
  if (context.result && cancelledStatuses.includes(context.result.status)) {
    await context.app
      .service('slots')
      .patch(context.result.slotId, { isBooked: false }, { provider: undefined })
      .catch(() => {})
  }
  return context
}

export default {
  before: {
    find: [authenticate('jwt'), filterAppointmentsByRole],
    get: [authenticate('jwt')],
    create: [authenticate('jwt'), restrictToPatient, bookSlot],
    update: [authenticate('jwt')],
    patch: [authenticate('jwt'), restrictAppointmentPatch, handleReschedule],
    remove: [authenticate('jwt')]
  },
  after: {
    all: [],
    create: [sendConfirmationEmail],
    patch: [releaseSlotIfCancelled, sendConfirmationEmail]
  },
  error: {}
}
