'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminHeader } from '@/components/admin-header';
import { TrendingUp, TrendingDown, Calendar, Loader2 } from 'lucide-react';
import { adminGetAnalyticsData } from '@/services/adminService';
import { useApp } from '@/lib/app-context';

export default function AdminAnalyticsPage() {
  const { currentUser, isAuthenticated } = useApp();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      router.push('/admin/login');
      return;
    }
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const analyticsInfo = await adminGetAnalyticsData();
      setData(analyticsInfo);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
          <AdminHeader title="Analytics" />
          <main className="flex-1 overflow-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  const { kpis, chartData, appointmentTrends, topDoctors, revenueData } = data;

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader title="Analytics" />
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">Analytics & Reports</h1>
                <p className="text-foreground/60">View comprehensive platform statistics and insights</p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  label: 'Total Revenue',
                  value: `₹${kpis.totalRevenue.toLocaleString()}`,
                  change: '+15%',
                  trend: 'up',
                  icon: TrendingUp,
                },
                {
                  label: 'Avg Appointment Fee',
                  value: `₹${kpis.avgFee.toFixed(2)}`,
                  change: '+8%',
                  trend: 'up',
                  icon: TrendingUp,
                },
                {
                  label: 'Completion Rate',
                  value: `${kpis.completionRate}%`,
                  change: '+5%',
                  trend: 'up',
                  icon: TrendingUp,
                },
                {
                  label: 'Patient Satisfaction',
                  value: `${kpis.patientSatisfaction}/5`,
                  change: '-2%',
                  trend: 'down',
                  icon: TrendingDown,
                },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-foreground/60 text-sm font-medium">{kpi.label}</p>
                      <Icon className={`w-5 h-5 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <p className="text-3xl font-bold text-foreground mb-2">{kpi.value}</p>
                    <span
                      className={`text-xs font-semibold ${
                        kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {kpi.change} vs last month
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Appointment Trends */}
              <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">Appointment Trends (Last 6 Months)</h2>
                <div className="space-y-6">
                  {chartData.map((d: any) => {
                    const maxAppts = Math.max(...chartData.map((c: any) => c.appointments), 1);
                    return (
                      <div key={d.month}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{d.month}</span>
                          <span className="text-sm font-semibold text-foreground">{d.appointments} appointments</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${(d.appointments / maxAppts) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Appointment Status */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">Appointment Status</h2>
                <div className="space-y-4">
                  {appointmentTrends.map((trend: any) => (
                    <div key={trend.status}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-foreground/70">{trend.status}</span>
                        <span className="text-sm font-semibold text-foreground">{trend.count}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`${trend.color} rounded-full h-2 transition-all`} style={{ width: `${trend.percentage}%` }} />
                      </div>
                      <p className="text-xs text-foreground/50 mt-1">{trend.percentage}% of total</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Doctors */}
              <div className="bg-card rounded-xl border border-border p-6 overflow-hidden flex flex-col">
                <h2 className="text-xl font-bold text-foreground mb-6">Top Performing Doctors</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-3 text-foreground/60 font-semibold">Doctor</th>
                        <th className="text-right pb-3 text-foreground/60 font-semibold">Appointments</th>
                        <th className="text-right pb-3 text-foreground/60 font-semibold">Revenue</th>
                        <th className="text-right pb-3 text-foreground/60 font-semibold">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDoctors.length === 0 ? (
                        <tr><td colSpan={4} className="py-4 text-center text-foreground/50">No data available</td></tr>
                      ) : (
                        topDoctors.map((doctor: any) => (
                          <tr key={doctor.id} className="border-b border-border hover:bg-muted/50 transition-colors last:border-0">
                            <td className="py-4 text-foreground font-medium">{doctor.name}</td>
                            <td className="text-right py-4 text-foreground/70">{doctor.appointments}</td>
                            <td className="text-right py-4 text-foreground font-semibold">₹{doctor.revenue.toLocaleString()}</td>
                            <td className="text-right py-4 text-yellow-500 font-semibold">★ {doctor.rating}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="bg-card rounded-xl border border-border p-6 flex flex-col">
                <h2 className="text-xl font-bold text-foreground mb-6">Revenue Breakdown</h2>
                <div className="space-y-5">
                  {revenueData.map((item: any) => (
                    <div key={item.source}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{item.source}</span>
                        <span className="text-sm font-semibold text-foreground">₹{item.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-indigo-600 rounded-full h-3 transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-foreground/50 mt-1">{item.percentage}% of total revenue</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-foreground/40 text-xs flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4" />
              Showing real-time data from database
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
