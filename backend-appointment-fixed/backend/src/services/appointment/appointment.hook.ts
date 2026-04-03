import { hooks as authHooks } from '@feathersjs/authentication'
import { Forbidden, BadRequest } from '@feathersjs/errors'
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

    const allowedStatuses = ['cancelled']
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
    const invalidKeys = patchKeys.filter(k => !allowedFields.includes(k))
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

const bookSlot = async (context: any) => {
  const { app, data, params } = context
  const slotService = app.service('slots')

  const slot = await slotService.get(data.slotId)
  if (slot.isBooked) {
    throw new BadRequest('Slot is already booked')
  }

  await slotService.patch(data.slotId, { isBooked: true }, { provider: undefined })

  context.data = {
    slotId: data.slotId,
    doctorId: slot.doctorId.toString(),
    patientId: params.user._id.toString(),
    status: 'booked',
    notes: data.notes || '',
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    createdAt: new Date().toISOString()
  }
  return context
}

// Reschedule: release old slot, book new slot, update appointment date/time
const handleReschedule = async (context: any) => {
  const { app, data } = context
  if (!data.slotId) return context

  const slotService = app.service('slots')
  const appointment = await context.service.get(context.id)

  const newSlot = await slotService.get(data.slotId)
  if (newSlot.isBooked) {
    throw new BadRequest('This slot is already booked. Please select another.')
  }

  // Release old slot
  if (appointment.slotId) {
    await slotService.patch(appointment.slotId, { isBooked: false }, { provider: undefined })
  }

  // Book new slot
  await slotService.patch(data.slotId, { isBooked: true }, { provider: undefined })

  // Update appointment with new slot details
  context.data = {
    slotId: data.slotId,
    date: newSlot.date,
    startTime: newSlot.startTime,
    endTime: newSlot.endTime,
    status: 'booked',  // reset to booked after reschedule
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
      app.service('doctors').find({ query: { userId: result.doctorId }, provider: undefined } as any)
        .then((r: any) => r.data?.[0] || null).catch(() => null)
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
    console.error('[Email] Confirmation error:', err)
  }
  return context
}

const releaseSlotIfCancelled = async (context: any) => {
  const cancelledStatuses = ['cancelled', 'cancelled_by_patient', 'cancelled_by_doctor']
  if (context.result && cancelledStatuses.includes(context.result.status)) {
    await context.app.service('slots').patch(
      context.result.slotId,
      { isBooked: false },
      { provider: undefined }
    ).catch(() => {})
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
