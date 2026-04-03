'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useApp } from '@/lib/app-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Lock, IndianRupee } from 'lucide-react';
import { getDoctorById, Doctor } from '@/services/doctorService';
import { bookAppointment } from '@/services/appointmentService';
import { toast } from 'sonner';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const doctorId = searchParams.get('doctorId');
  const slotId = searchParams.get('slotId');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const consultationType = (searchParams.get('type') || 'online') as 'online' | 'in-clinic';

  const { currentUser, isAuthenticated } = useApp();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'bank-transfer' | 'wallet'>('card');
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.push('/login?redirect=/checkout');
      return;
    }
    const loadDoctor = async () => {
      if (!doctorId) { setLoading(false); return; }
      try {
        const doc = await getDoctorById(doctorId);
        setDoctor(doc);
      } catch (err) {
        console.error('Failed to load doctor:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDoctor();
  }, [isAuthenticated, currentUser, doctorId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-foreground/60">Loading checkout...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!doctorId || !slotId || !date || !time || !currentUser || !doctor) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-foreground/60">Invalid checkout session</p>
        </main>
        <Footer />
      </div>
    );
  }

  const totalAmount = doctor.hourlyRate;

  const handleCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);

    try {
      const appt = await bookAppointment(slotId, `${consultationType} consultation`);
      toast.success('Appointment booked successfully!');
      router.push(`/booking-confirmation?appointmentId=${appt._id}`);
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Payment processing failed.';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-3xl font-bold text-foreground mb-8">Confirm & Pay</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-border bg-card p-6 md:p-8 mb-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Appointment Details</h2>

                <div className="space-y-4 pb-6 border-b border-border mb-6">
                  <div className="flex items-center gap-4">
                    {doctor.profileImage ? (
                      <img src={doctor.profileImage} alt={doctor.name || 'Doctor'} className="h-16 w-16 rounded-lg object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                        {(doctor.name || 'D')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-foreground">Dr. {doctor.name || 'Doctor'}</p>
                      <p className="text-sm text-foreground/60">{doctor.specialization}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-foreground/80">
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium text-foreground">{new Date(date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time</span>
                    <span className="font-medium text-foreground">{time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Consultation Type</span>
                    <span className="font-medium text-foreground capitalize">{consultationType}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="rounded-xl border border-border bg-card p-6 md:p-8">
                <h2 className="text-xl font-bold text-foreground mb-6">Payment Method</h2>

                <div className="space-y-4 mb-6">
                  {(['card', 'upi', 'bank-transfer', 'wallet'] as const).map((method) => (
                    <label key={method} className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-muted/30 transition-all" style={{borderColor: paymentMethod === method ? 'hsl(var(--primary))' : 'hsl(var(--border))'}}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="font-medium text-foreground capitalize">{method.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>

                {/* Card Details Form */}
                {paymentMethod === 'card' && (
                  <form onSubmit={handleCheckout} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Cardholder Name</label>
                      <input
                        type="text" placeholder="John Doe"
                        value={cardData.cardholderName}
                        onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Card Number</label>
                      <input
                        type="text" placeholder="1234 5678 9012 3456"
                        value={cardData.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').slice(0, 16);
                          setCardData({ ...cardData, cardNumber: value.replace(/(\d{4})/g, '$1 ').trim() });
                        }}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Expiry Date</label>
                        <input
                          type="text" placeholder="MM/YY"
                          value={cardData.expiryDate}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (value.length >= 2) {
                              setCardData({ ...cardData, expiryDate: `${value.slice(0, 2)}/${value.slice(2)}` });
                            } else {
                              setCardData({ ...cardData, expiryDate: value });
                            }
                          }}
                          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">CVV</label>
                        <input
                          type="text" placeholder="123"
                          value={cardData.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                            setCardData({ ...cardData, cvv: value });
                          }}
                          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit" disabled={isProcessing}
                      className="w-full mt-6 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Lock className="h-5 w-5" />
                      {isProcessing ? 'Processing Payment...' : 'Complete Payment'}
                    </button>
                  </form>
                )}

                {paymentMethod !== 'card' && (
                  <button
                    onClick={() => handleCheckout()}
                    disabled={isProcessing}
                    className="w-full mt-6 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Lock className="h-5 w-5" />
                    {isProcessing ? 'Processing Payment...' : 'Pay with ' + paymentMethod.replace('-', ' ')}
                  </button>
                )}
              </div>
            </div>

            {/* Price Summary */}
            <div>
              <div className="rounded-xl border border-border bg-card p-6 sticky top-6">
                <h3 className="text-lg font-bold text-foreground mb-6">Order Summary</h3>

                <div className="space-y-4 pb-4 border-b border-border mb-4">
                  <div className="flex justify-between text-foreground/70">
                    <span>Consultation Fee</span>
                    <span className="flex items-center"><IndianRupee className="h-3.5 w-3.5" />{doctor.hourlyRate}</span>
                  </div>
                  <div className="flex justify-between text-foreground/70">
                    <span>Service Fee</span>
                    <span>₹0</span>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-bold text-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-primary flex items-center"><IndianRupee className="h-5 w-5" />{totalAmount}</span>
                </div>

                <div className="p-4 bg-accent/10 rounded-lg mb-6">
                  <p className="text-xs text-foreground/60">
                    ✓ Secure payment processing  
                    ✓ 100% encrypted  
                    ✓ Money-back guarantee
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
