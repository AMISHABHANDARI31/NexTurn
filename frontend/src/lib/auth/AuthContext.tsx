import { createContext, useContext, useState, type ReactNode } from 'react'
import { auth, type Session } from './auth'
import { authApi, type RegistrationPending } from '../../features/sqps/api/authApi'

interface RegisterInput { name: string; email: string; password: string }
interface ResetPasswordInput { email: string; token: string; password: string }
interface AuthValue {
  session: Session | null
  signIn: (email: string, password: string) => Promise<Session>
  registerAccount: (input: RegisterInput) => Promise<RegistrationPending>
  verifyEmailOtp: (email: string, otp: string) => Promise<Session>
  resendEmailOtp: (email: string) => Promise<RegistrationPending>
  requestPasswordReset: (email: string) => Promise<string>
  resetPassword: (input: ResetPasswordInput) => Promise<string>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => auth.getSession())

  const value: AuthValue = {
    session,
    signIn: async (email, password) => {
      const result = await authApi.login({ email, password })
      auth.setSession(result.token, result.user)
      setSession(result.user)
      return result.user
    },
    registerAccount: async (input) => {
      return authApi.register(input)
    },
    verifyEmailOtp: async (email, otp) => {
      const result = await authApi.verifyOtp({ email, otp })
      auth.setSession(result.token, result.user)
      setSession(result.user)
      return result.user
    },
    resendEmailOtp: (email) => authApi.resendOtp(email),
    requestPasswordReset: (email) => authApi.requestPasswordReset(email),
    resetPassword: (input) => authApi.resetPassword(input),
    signOut: () => {
      auth.clearSession()
      setSession(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
