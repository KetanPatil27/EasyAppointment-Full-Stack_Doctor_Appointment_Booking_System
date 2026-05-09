import nodemailer from 'nodemailer'
import { Resend } from 'resend'

/**
 * Unified email sender. Two delivery paths:
 *
 *   1. RESEND (HTTPS API on port 443) — used when RESEND_API_KEY is set.
 *      This is the production path on Render's free tier, which blocks
 *      outbound SMTP on ports 25/465/587.
 *
 *   2. NODEMAILER (Gmail SMTP on port 587) — used when MAIL_USER + MAIL_PASS
 *      are set. This is the local-dev path.
 *
 *   3. DEV CONSOLE LOG — when neither is configured, prints the email to
 *      the server log so you can still test the flow without real delivery.
 *
 * Resend free tier note: until you verify a domain, you can only send to
 * the email address you used to sign up. For multi-recipient testing,
 * verify a domain at resend.com/domains.
 */

const RESEND_FROM_ADDRESS =
  process.env.RESEND_FROM || 'EasyAppointment <onboarding@resend.dev>'

interface SendArgs {
  to: string
  subject: string
  html: string
}

const sendEmail = async ({ to, subject, html }: SendArgs): Promise<'sent' | 'logged'> => {
  // Path 1: Resend (HTTPS)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: RESEND_FROM_ADDRESS,
      to,
      subject,
      html
    })
    if (error) throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`)
    return 'sent'
  }

  // Path 2: Nodemailer / Gmail SMTP
  const user = process.env.MAIL_USER
  const pass = process.env.MAIL_PASS
  if (user && pass && user !== 'your_email@gmail.com') {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await transporter.sendMail({ from: user, to, subject, html })
    return 'sent'
  }

  // Path 3: dev console fallback
  console.log(`[DEV] Email NOT sent (no provider configured). To: ${to} | Subject: ${subject}`)
  return 'logged'
}

/**
 * Generic notification sender used by Upgrades 5–7. Just forwards subject/html
 * to the unified `sendEmail` helper above. Kept as its own export so callers
 * can stay decoupled from the underlying provider switch.
 */
export const sendNotificationEmail = async (to: string, subject: string, html: string) => {
  return sendEmail({ to, subject, html })
}

/**
 * Send the 6-digit signup verification OTP. The OTP itself is plain in the
 * email but stored hashed in DB. Expiry is rendered into the message so the
 * user knows the urgency.
 */
export const sendOtpEmail = async (email: string, otp: string, expiryMinutes: number) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
      <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="margin:0;font-size:24px">EasyAppointment</h1>
        <p style="margin:8px 0 0;opacity:0.9">Verify your email address</p>
      </div>
      <div style="padding:24px">
        <p style="font-size:16px">Welcome — let's confirm it's you.</p>
        <p>Enter this 6-digit code in the app to finish creating your account:</p>
        <div style="text-align:center;margin:28px 0">
          <div style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:18px 32px;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#111827">
            ${otp}
          </div>
        </div>
        <p style="color:#6b7280;font-size:14px">This code expires in <strong>${expiryMinutes} minutes</strong>. If it expires, request a new one from the verification page.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#6b7280;font-size:13px">Didn't try to sign up for EasyAppointment? You can safely ignore this email — no account will be activated without this code.</p>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 EasyAppointment. All rights reserved.</p>
      </div>
    </div>
  `

  const result = await sendEmail({
    to: email,
    subject: `Your EasyAppointment verification code: ${otp}`,
    html
  })

  if (result === 'logged') {
    console.log(`[DEV] OTP for ${email}: ${otp} (expires in ${expiryMinutes} min)`)
  }
}

export const sendResetEmail = async (email: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const resetLink = `${frontendUrl}/reset-password?token=${token}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
      <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h1 style="margin:0;font-size:24px">EasyAppointment</h1>
        <p style="margin:8px 0 0;opacity:0.9">Password Reset Request</p>
      </div>
      <div style="padding:24px">
        <p style="font-size:16px">Hello,</p>
        <p>We received a request to reset the password for your EasyAppointment account associated with <strong>${email}</strong>.</p>
        <p>Click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Reset My Password</a>
        </div>
        <p style="color:#6b7280;font-size:14px">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="color:#2563eb;font-size:13px;word-break:break-all">${resetLink}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#6b7280;font-size:13px">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 EasyAppointment. All rights reserved.</p>
      </div>
    </div>
  `

  const result = await sendEmail({
    to: email,
    subject: 'EasyAppointment – Password Reset Request',
    html
  })

  if (result === 'logged') {
    console.log(`[DEV] Reset link for ${email}: ${resetLink}`)
  }
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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const appointmentsLink = `${frontendUrl}/dashboard/appointments`
  const {
    emailType, patientEmail, patientName, doctorName, date, startTime, endTime,
    consultationFee, appointmentId, clinicName, city, locality, pincode
  } = data

  const title = emailType === 'booked' ? 'Appointment Booked' : 'Appointment Confirmed ✓'
  const message = emailType === 'booked'
    ? 'Your appointment has been successfully booked and is waiting for doctor confirmation.'
    : 'Your appointment has been confirmed by the doctor. Here are the details:'

  const clinicAddress = [clinicName, locality, city, pincode].filter(Boolean).join(', ') || 'Not specified'

  const html = `
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
          <a href="${appointmentsLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600">
            View My Appointments
          </a>
        </div>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">© 2026 EasyAppointment. All rights reserved.</p>
      </div>
    </div>
  `

  const result = await sendEmail({
    to: patientEmail,
    subject: `EasyAppointment – ${title}`,
    html
  })

  if (result === 'logged') {
    console.log(`[DEV] ${title} for ${patientEmail}: appointment ${appointmentId} on ${date} ${startTime}-${endTime}, fee ₹${consultationFee}, clinic: ${clinicAddress}`)
  }
}
