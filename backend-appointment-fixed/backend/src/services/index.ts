import type { Application } from '../declarations'
import { users }          from './users/users'
import { doctors }        from './doctors/doctors'
import { slots }          from './slots/slots'
import { appointment }    from './appointment/appointment'
import { patients }       from './patients/patients'
import { passwordResets } from './password-reset/password-reset'
import { resetPassword }  from './reset-password/reset-password'
import { forgotPassword } from './forgot-password/forgot-password'
import { messages }       from './messages/messages'
import { prescriptions }  from './prescriptions/prescriptions'
import { healthData }     from './health-data/health-data'
import { reviews }        from './reviews/reviews'
import { verifyOtp }      from './verify-otp/verify-otp'
import { resendOtp }      from './resend-otp/resend-otp'
import { auditLogs }      from './audit-logs/audit-logs'
import { restoreUser }    from './restore-user/restore-user'

export const services = (app: Application) => {
  app.configure(users)
  app.configure(patients)
  app.configure(doctors)
  app.configure(slots)
  app.configure(appointment)
  app.configure(passwordResets)
  app.configure(resetPassword)
  app.configure(forgotPassword)
  app.configure(messages)
  app.configure(prescriptions)
  app.configure(healthData)
  app.configure(reviews)
  app.configure(verifyOtp)
  app.configure(resendOtp)
  app.configure(auditLogs)
  app.configure(restoreUser)
}
