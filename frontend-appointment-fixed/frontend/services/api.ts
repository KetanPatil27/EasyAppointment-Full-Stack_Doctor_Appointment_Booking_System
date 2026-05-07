import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Send and receive httpOnly cookies (JWT lives in a cookie now, not localStorage).
  withCredentials: true
})

// Handle 401 globally — session expired or no cookie present.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear the cached user profile so the UI doesn't show a stale "logged in" state.
      localStorage.removeItem('currentUser')
      // Avoid bouncing the user when they're already on a public page.
      const path = window.location.pathname
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/']
      if (!publicPaths.includes(path)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
export { API_URL }
