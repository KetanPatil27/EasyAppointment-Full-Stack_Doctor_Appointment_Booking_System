'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useApp } from '@/lib/app-context';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { CheckCircle, Calendar, Clock, IndianRupee, User } from 'lucide-react';
import Link from 'next/link';
import { getAppointmentById } from '@/services/appointmentService';
import { getDoctorByUserId, Doctor } from '@/services/doctorService';

interface AppointmentData {
  _id: string
  patientId: string
  doctorId: string
  date: string
  time: string
  fee?: number
  consultationType?: string
  status?: string
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const router = useRouter();

  const { isAuthenticated } = useApp();
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const load = async () => {
      if (!appointmentId) { setLoading(false); return; }
      try {
        const appt = await getAppointmentById(appointmentId);
        if (appt) {
          setAppointment(appt);
          const doc = await getDoctorByUserId(appt.doctorId);
          if (doc) setDoctor(doc);
        }
      } catch (err) {
        console.error('Failed to load confirmation:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [appointmentId, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-foreground/60">Loading confirmation...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-foreground/60 mb-4">Appointment not found</p>
            <Link href="/dashboard" className="text-primary hover:underline">Go to Dashboard</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 md:py-20">
        <div className="mx-auto max-w-2xl px-4">
          {/* Success Card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-8 md:p-12 mb-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="rounded-full bg-green-100 p-4 sm:p-6 dark:bg-green-900/20">
                <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">Booking Confirmed!</h1>
              <p className="text-base sm:text-lg text-foreground/60">
                Your appointment has been successfully booked. You'll receive a confirmation email shortly.
              </p>
            </div>

            {/* Appointment Details */}
            <div className="bg-muted/30 rounded-xl p-4 sm:p-6 md:p-8 mb-8 space-y-5 sm:space-y-6">
              <div>
                <p className="text-sm text-foreground/60 mb-2">Confirmation Number</p>
                <p className="text-2xl font-bold text-foreground">{appointment._id.slice(-8).toUpperCase()}</p>
              </div>

              {doctor && (
                <div className="border-t border-border pt-6">
                  <p className="text-sm text-foreground/60 mb-4">Doctor Information</p>
                  <div className="flex items-center gap-4">
                    {doctor.profileImage ? (
                      <img
                        src={doctor.profileImage}
                        alt={doctor.name || 'Doctor'}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {(doctor.name || 'D')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">Dr. {doctor.name || 'Doctor'}</p>
                      <p className="text-sm text-foreground/60">{doctor.specialization}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-foreground/60">Date</p>
                    <p className="font-semibold text-foreground">
                      {new Date(appointment.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-foreground/60">Time</p>
                    <p className="font-semibold text-foreground">{appointment.time}</p>
                  </div>
                </div>

                {appointment.fee && (
                  <div className="flex items-center gap-3">
                    <IndianRupee className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-foreground/60">Consultation Fee</p>
                      <p className="font-semibold text-foreground">₹{appointment.fee}</p>
                    </div>
                  </div>
                )}

                {appointment.consultationType && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-foreground/60">Consultation Type</p>
                      <p className="font-semibold text-foreground capitalize">{appointment.consultationType}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-accent/10 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-foreground mb-4">What's Next?</h3>
              <ul className="space-y-3 text-sm text-foreground/70">
                <li className="flex gap-3">
                  <span className="text-accent font-bold">1.</span>
                  <span>You'll receive a confirmation email with appointment details</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">2.</span>
                  <span>Join your consultation at the scheduled time</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-accent font-bold">3.</span>
                  <span>After the consultation, you can download your medical records</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/dashboard/appointments"
                className="rounded-lg border-2 border-primary px-6 py-3 text-base font-semibold text-primary hover:bg-primary/5 transition-colors text-center"
              >
                View My Appointments
              </Link>
              <Link
                href="/doctors"
                className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors text-center"
              >
                Book Another Appointment
              </Link>
            </div>
          </div>

          {/* Support Info */}
          <div className="text-center text-sm text-foreground/60">
            <p>Need help? Contact our support team at <span className="text-primary font-medium">support@easyappointment.com</span></p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
