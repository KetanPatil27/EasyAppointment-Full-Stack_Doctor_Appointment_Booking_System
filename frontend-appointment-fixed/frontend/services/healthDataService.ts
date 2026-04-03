import api from './api'

export interface HealthData {
  _id?: string
  userId: string
  weight?: number
  height?: number
  bloodPressure?: { systolic: number; diastolic: number }
  heartRate?: number
  bloodSugar?: number
  bmi?: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export const getHealthData = async (): Promise<HealthData[]> => {
  const res = await api.get('/health-data')
  return res.data?.data || res.data || []
}

export const saveHealthData = async (data: Partial<HealthData>): Promise<HealthData> => {
  const res = await api.post('/health-data', data)
  return res.data
}

export const updateHealthData = async (id: string, data: Partial<HealthData>): Promise<HealthData> => {
  const res = await api.patch(`/health-data/${id}`, data)
  return res.data
}
