import api from './api'
import type { Doctor } from './doctorService'

export const adminGetAllUsers = async (query?: Record<string, any>) => {
  const res = await api.get('/users', { params: { $limit: 100, ...query } })
  return res.data?.data || res.data || []
}

export const adminGetAllDoctors = async (query?: Record<string, any>) => {
  const [usersRes, doctorsRes, apptsRes] = await Promise.all([
    api.get('/users', { params: { role: 'doctor', $limit: 200 } }),
    api.get('/doctors', { params: { $limit: 200 } }),
    api.get('/appointments', { params: { $select: ['doctorId', 'patientId'], $limit: 5000 } }).catch(() => ({ data: { data: [] } }))
  ])
  
  const users = usersRes.data?.data || usersRes.data || []
  const profiles = doctorsRes.data?.data || doctorsRes.data || []
  const allAppointments = apptsRes.data?.data || apptsRes.data || []

  // Pre-calculate unique patients per doctor
  const patientsPerDoctor: Record<string, Set<string>> = {}
  allAppointments.forEach((a: any) => {
    if (a.doctorId && a.patientId) {
      if (!patientsPerDoctor[a.doctorId]) patientsPerDoctor[a.doctorId] = new Set()
      patientsPerDoctor[a.doctorId].add(a.patientId)
    }
  })

  return users.map((user: any) => {
    const profile = profiles.find((p: any) => p.userId === user._id)
    return {
      ...(profile || {}),
      _id: profile ? profile._id : `noprog_${user._id}`, // Fallback ID for React keys
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      // Fallbacks if no profile exists yet
      specialization: profile?.specialization || 'Profile Not Setup',
      experience: profile?.experience || 0,
      hourlyRate: profile?.hourlyRate || 0,
      patientsCount: patientsPerDoctor[user._id]?.size || 0
    }
  })
}

export const adminGetAllAppointments = async (query?: Record<string, any>) => {
  const res = await api.get('/appointments', { params: { $limit: 200, ...query } })
  return res.data?.data || res.data || []
}

export const adminUpdateUser = async (id: string, data: Record<string, any>) => {
  const res = await api.patch(`/users/${id}`, data)
  return res.data
}

export const adminDeleteUser = async (id: string) => {
  const res = await api.delete(`/users/${id}`)
  return res.data
}

export const adminUpdateDoctor = async (id: string, data: Record<string, any>) => {
  const res = await api.patch(`/doctors/${id}`, data)
  return res.data
}

export const adminDeleteDoctor = async (id: string) => {
  const res = await api.delete(`/doctors/${id}`)
  return res.data
}

export const adminApproveDoctor = async (userId: string) => {
  // Patch the user account to active
  await api.patch(`/users/${userId}`, { status: 'active' })
  // Also try to update doctor profile status
  try {
    const docs = await api.get('/doctors', { params: { userId, $limit: 1 } })
    const doctor = docs.data?.data?.[0] || docs.data?.[0]
    if (doctor) {
      await api.patch(`/doctors/${doctor._id}`, { status: 'active' })
    }
  } catch {}
}

export const adminSuspendUser = async (userId: string, suspend: boolean) => {
  const newStatus = suspend ? 'suspended' : 'active'
  await api.patch(`/users/${userId}`, { status: newStatus })
  // Also update doctor profile if exists
  try {
    const docs = await api.get('/doctors', { params: { userId, $limit: 1 } })
    const doctor = docs.data?.data?.[0] || docs.data?.[0]
    if (doctor) {
      await api.patch(`/doctors/${doctor._id}`, { status: newStatus })
    }
  } catch {}
}

export const adminGetAllPatients = async (query?: Record<string, any>) => {
  const [res, apptsRes] = await Promise.all([
    api.get('/users', { params: { $limit: 200, role: 'patient', ...query } }),
    api.get('/appointments', { params: { $select: ['patientId'], $limit: 5000 } }).catch(() => ({ data: { data: [] } }))
  ])
  
  const patients = res.data?.data || res.data || []
  const appointments = apptsRes.data?.data || apptsRes.data || []

  const apptsPerPatient: Record<string, number> = {}
  appointments.forEach((a: any) => {
    if (a.patientId) {
      apptsPerPatient[a.patientId] = (apptsPerPatient[a.patientId] || 0) + 1
    }
  })

  return patients.map((p: any) => ({
    ...p,
    appointmentsCount: apptsPerPatient[p._id] || 0
  }))
}

export const adminGetAppointmentsWithNames = async (query?: Record<string, any>) => {
  const appointments = await adminGetAllAppointments(query)

  // Collect unique user IDs
  const userIds = new Set<string>()
  appointments.forEach((a: any) => {
    if (a.patientId) userIds.add(a.patientId)
    if (a.doctorId) userIds.add(a.doctorId)
  })

  // Batch fetch user names
  const userMap: Record<string, string> = {}
  const feeMap: Record<string, number> = {}
  const users = await adminGetAllUsers({ $limit: 500 }).catch(() => [])
  users.forEach((u: any) => { userMap[u._id] = u.name || u.email || 'Unknown' })

  // Also try doctors service for doctor names and their hourly rates
  const doctors = await adminGetAllDoctors({ $limit: 500 }).catch(() => [])
  doctors.forEach((d: any) => {
    if (d.userId && d.name) {
      userMap[d.userId] = d.name
      feeMap[d.userId] = d.hourlyRate || 0
    }
  })

  return appointments.map((a: any) => ({
    ...a,
    patientName: userMap[a.patientId] || 'Deleted Account',
    doctorName: userMap[a.doctorId] ? `Dr. ${userMap[a.doctorId]}` : 'Deleted Account',
    consultationFee: a.consultationFee || feeMap[a.doctorId] || 0
  }))
}

export const adminGetStats = async () => {
  const [users, doctors, appointments] = await Promise.all([
    api.get('/users', { params: { $limit: 0 } }),
    api.get('/doctors', { params: { $limit: 0 } }),
    api.get('/appointments', { params: { $limit: 0 } })
  ])
  return {
    totalUsers: users.data?.total || 0,
    totalDoctors: doctors.data?.total || 0,
    totalAppointments: appointments.data?.total || 0,
  }
}

export const adminGetAnalyticsData = async () => {
  const [apptsRes, docsRes, usersRes, revsRes] = await Promise.all([
    api.get('/appointments', { params: { $limit: 10000 } }).catch(() => ({ data: { data: [] } })),
    api.get('/doctors', { params: { $limit: 1000 } }).catch(() => ({ data: { data: [] } })),
    api.get('/users', { params: { role: 'doctor', $limit: 1000 } }).catch(() => ({ data: { data: [] } })),
    api.get('/reviews', { params: { $limit: 10000 } }).catch(() => ({ data: { data: [] } }))
  ])

  const appointments = apptsRes.data?.data || apptsRes.data || []
  const doctors = docsRes.data?.data || docsRes.data || []
  const users = usersRes.data?.data || usersRes.data || []
  const reviews = revsRes.data?.data || revsRes.data || []

  // Create lookup maps
  const userMap: Record<string, string> = {}
  users.forEach((u: any) => { userMap[u._id] = u.name })
  
  const docFeeMap: Record<string, number> = {}
  doctors.forEach((d: any) => { if (d.userId && d.hourlyRate) docFeeMap[d.userId] = d.hourlyRate })

  // 1. KPI Metrics
  let totalRevenue = 0
  let totalFeeBooked = 0
  let completedCount = 0
  const totalAppointments = appointments.length

  appointments.forEach((a: any) => {
    const fee = a.consultationFee || docFeeMap[a.doctorId] || 0
    totalFeeBooked += fee
    if (a.status === 'completed') {
      totalRevenue += fee
      completedCount++
    }
  })

  const avgFee = totalAppointments > 0 ? totalFeeBooked / totalAppointments : 0
  const completionRate = totalAppointments > 0 ? Math.round((completedCount / totalAppointments) * 100) : 0
  
  const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0)
  const patientSatisfaction = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0

  // 2. Appointment Trends (Last 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const trendsMap = new Map<string, { month: string, appointments: number, revenue: number, _ts: number }>()
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`
    trendsMap.set(key, { month: monthNames[d.getMonth()], appointments: 0, revenue: 0, _ts: d.getTime() })
  }

  appointments.forEach((a: any) => {
    const d = new Date(a.createdAt)
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`
    if (trendsMap.has(key)) {
      const t = trendsMap.get(key)!
      t.appointments++
      if (a.status === 'completed') {
        t.revenue += (a.consultationFee || docFeeMap[a.doctorId] || 0)
      }
    }
  })
  const chartData = Array.from(trendsMap.values()).map(({ _ts, ...rest }) => rest)

  // 3. Status Distribution
  const statusCounts: Record<string, number> = { completed: 0, cancelled: 0, pending: 0, rescheduled: 0, rejected: 0 }
  appointments.forEach((a: any) => {
    const status = a.status.toLowerCase()
    if (status.includes('cancel')) statusCounts.cancelled++
    else if (statusCounts[status] !== undefined) statusCounts[status]++
  })

  const appointmentTrends = [
    { status: 'Completed', count: statusCounts.completed, percentage: totalAppointments ? Math.round((statusCounts.completed / totalAppointments) * 100) : 0, color: 'bg-green-500' },
    { status: 'Cancelled', count: statusCounts.cancelled, percentage: totalAppointments ? Math.round((statusCounts.cancelled / totalAppointments) * 100) : 0, color: 'bg-red-500' },
    { status: 'Pending', count: statusCounts.pending, percentage: totalAppointments ? Math.round((statusCounts.pending / totalAppointments) * 100) : 0, color: 'bg-yellow-500' },
    { status: 'Rescheduled/Rejected', count: statusCounts.rescheduled + statusCounts.rejected, percentage: totalAppointments ? Math.round(((statusCounts.rescheduled + statusCounts.rejected) / totalAppointments) * 100) : 0, color: 'bg-blue-500' },
  ]

  // 4. Top Performing Doctors
  const docStats: Record<string, { appts: number, rev: number, ratingSum: number, ratingCount: number }> = {}
  appointments.forEach((a: any) => {
    if (!a.doctorId) return
    if (!docStats[a.doctorId]) docStats[a.doctorId] = { appts: 0, rev: 0, ratingSum: 0, ratingCount: 0 }
    docStats[a.doctorId].appts++
    if (a.status === 'completed') {
      docStats[a.doctorId].rev += (a.consultationFee || docFeeMap[a.doctorId] || 0)
    }
  })
  reviews.forEach((r: any) => {
    if (!r.doctorId || !docStats[r.doctorId]) return
    docStats[r.doctorId].ratingSum += r.rating
    docStats[r.doctorId].ratingCount++
  })

  let topDoctors = Object.entries(docStats).map(([doctorId, stats]) => {
    const rating = stats.ratingCount > 0 ? (stats.ratingSum / stats.ratingCount).toFixed(1) : 0
    return {
      id: doctorId,
      name: userMap[doctorId] ? `Dr. ${userMap[doctorId]}` : 'Unknown Doctor',
      appointments: stats.appts,
      revenue: stats.rev,
      rating: Number(rating)
    }
  })
  topDoctors.sort((a, b) => b.appointments - a.appointments)
  topDoctors = topDoctors.slice(0, 5)

  // 5. Revenue Breakdown (Approximated)
  const cancellationRevenue = statusCounts.cancelled * 50 // arbitrary $50 cancellation fee mapping if applicable, otherwise 0. Or from DB. Let's assume real revenue is only completed.
  const actualConsultationRevenue = totalRevenue
  // Just show two buckets based on actuals for matching reality, or dummy buckets if total is 0
  const revBase = Math.max(actualConsultationRevenue, 1) // prevent div by zero
  const revenueData = [
    { source: 'Consultations', amount: actualConsultationRevenue, percentage: Math.round((actualConsultationRevenue / revBase) * 100) },
    { source: 'Cancellation Fees', amount: 0, percentage: 0 },
    { source: 'Premium Services', amount: 0, percentage: 0 }, 
  ]

  return {
    kpis: {
      totalRevenue,
      avgFee: Math.round(avgFee * 10) / 10,
      completionRate,
      patientSatisfaction,
      totalAppointments
    },
    chartData,
    appointmentTrends,
    topDoctors,
    revenueData
  }
}

