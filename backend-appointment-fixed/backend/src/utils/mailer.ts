import nodemailer from 'nodemailer'

const getTransporter = () => {
  const user = process.env.MAIL_USER
  const pass = process.env.MAIL_PASS
  if (!user || !pass || user === 'your_email@gmail.com') return null
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
}

export const sendResetEmail = async (email: string, token: string) => {
  const resetLink = `http://localhost:3000/reset-password?token=${token}`
  const transporter = getTransporter()

  if (!transporter) {
    console.log(`[DEV] Password reset token for ${email}: ${token}`)
    console.log(`[DEV] Reset link: ${resetLink}`)
    return
  }

  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: email,
    subject: 'EasyAppointment – Password Reset',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#2563eb">Password Reset Request</h2>
        <p>You requested a password reset for your EasyAppointment account.</p>
        <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0">Reset Password</a>
        <p style="color:#666;font-size:14px">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p style="color:#9ca3af;font-size:12px">© 2025 EasyAppointment. All rights reserved.</p>
      </div>
    `
  })
}

interface AppointmentEmailData {
  emailType: 'booked' | 'confirmed'
  patientEmail: string
  patientName: string
  doctorName: string
  date: string
  startTime: string
  endTime: string
  consultationFee: number
  appointmentId: string
  clinicName?: string
  city?: string
  locality?: string
  pincode?: string
}

export const sendAppointmentConfirmation = async (data: AppointmentEmailData) => {
  const transporter = getTransporter()
  const { 
    emailType, patientEmail, patientName, doctorName, date, startTime, endTime, 
    consultationFee, appointmentId, clinicName, city, locality, pincode 
  } = data

  const title = emailType === 'booked' ? 'Appointment Booked' : 'Appointment Confirmed ✓'
  const message = emailType === 'booked' 
    ? 'Your appointment has been successfully booked and is waiting for doctor confirmation.'
    : 'Your appointment has been confirmed by the doctor. Here are the details:'

  const clinicAddress = [clinicName, locality, city, pincode].filter(Boolean).join(', ') || 'Not specified'

  if (!transporter) {
    console.log(`[DEV] ${title} for ${patientEmail}:`)
    console.log(`  Patient: ${patientName}, Doctor: Dr. ${doctorName}`)
    console.log(`  Date: ${date} ${startTime}–${endTime}, Fee: ₹${consultationFee}`)
    console.log(`  Clinic: ${clinicAddress}`)
    console.log(`  Appointment ID: ${appointmentId}`)
    return
  }

  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: patientEmail,
    subject: `EasyAppointment – ${title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
        <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="margin:0;font-size:24px">EasyAppointment</h1>
          <p style="margin:8px 0 0;opacity:0.9">${title}</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:16px">Dear <strong>${patientName}</strong>,</p>
          <p>${message}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0 border-radius:8px overflow:hidden border:1px solid #e5e7eb">
            <tr style="background:#f3f4f6"><td style="padding:12px;font-weight:600;width:35%">Appointment ID</td><td style="padding:12px">${appointmentId}</td></tr>
            <tr style="border-top:1px solid #e5e7eb"><td style="padding:12px;font-weight:600">Doctor</td><td style="padding:12px">Dr. ${doctorName}</td></tr>
            <tr style="background:#f3f4f6;border-top:1px solid #e5e7eb"><td style="padding:12px;font-weight:600">Date</td><td style="padding:12px">${date}</td></tr>
            <tr style="border-top:1px solid #e5e7eb"><td style="padding:12px;font-weight:600">Time</td><td style="padding:12px">${startTime} – ${endTime}</td></tr>
            <tr style="background:#f3f4f6;border-top:1px solid #e5e7eb"><td style="padding:12px;font-weight:600">Consultation Fee</td><td style="padding:12px">₹${consultationFee}</td></tr>
            <tr style="border-top:1px solid #e5e7eb"><td style="padding:12px;font-weight:600">Clinic Name</td><td style="padding:12px">${clinicName || 'Not specified'}</td></tr>
            <tr style="background:#f3f4f6;border-top:1px solid #e5e7eb"><td style="padding:12px;font-weight:600">Full Address</td><td style="padding:12px">${clinicAddress}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px">Please arrive 10 minutes before your appointment time. To cancel or reschedule, visit your dashboard at least 2 hours in advance.</p>
          <div style="text-align:center;margin-top:24px">
            <a href="http://localhost:3000/dashboard/appointments" style="display:inline-block;background:#2563eb;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600">
              View My Appointments
            </a>
          </div>
        </div>
        <div style="padding:16px 24px;background:#f9fafb;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;text-align:center">
          <p style="color:#9ca3af;font-size:12px;margin:0">© 2025 EasyAppointment. All rights reserved.</p>
        </div>
      </div>
    `
  })
}
