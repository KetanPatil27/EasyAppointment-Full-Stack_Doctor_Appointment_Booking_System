import api from './api'

export const forgotPassword = async (email: string) => {
  const res = await api.post('/forgot-password', { email })
  return res.data
}

export const resetPassword = async (token: string, password: string) => {
  const res = await api.post('/reset-password', { token, password })
  return res.data
}
