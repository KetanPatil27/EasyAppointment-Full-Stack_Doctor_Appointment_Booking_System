/**
 * HTML email templates for admin-action cascades:
 *  - account suspended (doctor / patient)
 *  - account deleted   (doctor / patient)
 *  - patient: their doctor is no longer available
 *
 * Each template returns a `{ subject, html }` pair; the actual delivery goes
 * through the unified mailer in src/utils/mailer.ts.
 */

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@easyappointment.online'

const wrap = (title: string, body: string) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
    <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
      <h1 style="margin:0;font-size:24px">EasyAppointment</h1>
      <p style="margin:8px 0 0;opacity:0.9">${title}</p>
    </div>
    <div style="padding:24px;line-height:1.6">${body}</div>
    <div style="padding:16px 24px;background:#f9fafb;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 EasyAppointment. Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb">${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
`

export const suspendedTemplate = (
  user: { name: string; role: 'doctor' | 'patient' | 'admin' },
  reason: string
) => ({
  subject: 'Your EasyAppointment account has been suspended',
  html: wrap(
    'Account suspended',
    `<p>Hi <strong>${user.name}</strong>,</p>
     <p>Your EasyAppointment account has been temporarily suspended by an administrator.</p>
     <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:12px;margin:16px 0">
       <strong>Reason:</strong><br/>${reason || 'No reason provided.'}
     </div>
     ${
       user.role === 'doctor'
         ? '<p>While suspended, your profile is hidden from patients and your appointment slots are unavailable. Future booked appointments have been cancelled and the affected patients have been notified.</p>'
         : '<p>While suspended, you cannot book new appointments. Existing appointments may be affected.</p>'
     }
     <p>If you believe this was an error or you'd like to appeal, please reply to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> within 30 days.</p>`
  )
})

export const deletedTemplate = (
  user: { name: string; role: 'doctor' | 'patient' | 'admin' },
  reason: string
) => ({
  subject: 'Your EasyAppointment account has been removed',
  html: wrap(
    'Account removed',
    `<p>Hi <strong>${user.name}</strong>,</p>
     <p>Your EasyAppointment account has been removed by an administrator.</p>
     <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:6px;padding:12px;margin:16px 0">
       <strong>Reason:</strong><br/>${reason || 'No reason provided.'}
     </div>
     <p><strong>Data retention:</strong> per medical-records regulations, your historical records (past appointments, prescriptions, reviews) are retained in a soft-deleted state. They are no longer visible in the platform.</p>
     ${
       user.role === 'doctor'
         ? '<p>All your future appointments have been cancelled and the affected patients have been notified to rebook.</p>'
         : '<p>All your future appointments have been cancelled.</p>'
     }
     <p>To appeal this decision or request a full data export within 30 days, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`
  )
})

export const patientCascadeTemplate = (params: {
  patientName: string
  doctorName: string
  reason: 'suspended' | 'deleted'
  affectedAppointments: Array<{ date: string; startTime: string; endTime: string }>
  alternativeDoctors: Array<{ name: string; specializations: string[]; profileLink: string }>
  rebookLink: string
  fee?: number
}) => {
  const verb = params.reason === 'suspended' ? 'suspended' : 'no longer with EasyAppointment'

  const apptList = params.affectedAppointments
    .map(
      (a) =>
        `<li>${a.date} · ${a.startTime}–${a.endTime}</li>`
    )
    .join('')

  const altList =
    params.alternativeDoctors.length > 0
      ? `<p><strong>Suggested alternatives</strong> (same specialization, available now):</p>
         <ul>${params.alternativeDoctors
           .map(
             (d) =>
               `<li><a href="${d.profileLink}">Dr. ${d.name}</a> — ${d.specializations.join(', ')}</li>`
           )
           .join('')}</ul>`
      : ''

  const refundLine =
    params.fee && params.fee > 0
      ? `<p>If your booking was paid, a refund of ₹${params.fee} per appointment is being processed and will appear in your original payment method within 5–7 business days.</p>`
      : ''

  return {
    subject: `Important: Your appointment with Dr. ${params.doctorName} needs attention`,
    html: wrap(
      'Appointment update',
      `<p>Hi <strong>${params.patientName}</strong>,</p>
       <p>We're sorry to inform you that <strong>Dr. ${params.doctorName}</strong> is ${verb}, and your following appointments have been cancelled:</p>
       <ul>${apptList}</ul>
       ${refundLine}
       ${altList}
       <p style="text-align:center;margin:24px 0">
         <a href="${params.rebookLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Find another doctor</a>
       </p>
       <p>We apologise for the inconvenience.</p>`
    )
  }
}
