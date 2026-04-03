import api from './api'

export interface RegisterPayload {
  name: string
  email: string
  phone?: string
  password: string
  role: 'patient' | 'doctor' | 'admin'
}

export interface LoginResponse {
  accessToken: string
  user: {
    _id: string
    name: string
    email: string
    phone: string
    role: 'patient' | 'doctor' | 'admin'
    status: string
    createdAt: string
    updatedAt: string
  }
}

export const registerUser = async (data: RegisterPayload) => {
  const response = await api.post('/users', data)
  return response.data
}

export const loginUser = async (email: string, password: string, role?: string): Promise<LoginResponse> => {
  const response = await api.post('/authentication', {
    strategy: 'local',
    email,
    password,
    ...(role ? { role } : {})
  })
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/authentication')
  return response.data
}

export const deleteMyAccount = async (userId: string) => {
  const response = await api.delete(`/users/${userId}`)
  return response.data
}

export default api
