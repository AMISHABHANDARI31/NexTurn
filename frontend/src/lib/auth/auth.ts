import { jwtDecode } from 'jwt-decode'

export type Role = 'User' | 'Manager' | 'SystemAdmin'

export interface Session {
  id: string
  name: string
  email: string
  role: Role
}

interface TokenClaims {
  userId: string
  role: Role
  exp: number
}

export const TOKEN_KEY = 'nexturn_token'
const SESSION_KEY = 'nexturn_session'

// Authentication is scoped to the current browser tab. localStorage is shared
// by every tab on the same origin, which caused an Admin login to replace an
// active User or Manager session. sessionStorage lets all three work at once.
function migrateLegacySession() {
  if (sessionStorage.getItem(TOKEN_KEY)) return

  const legacyToken = localStorage.getItem(TOKEN_KEY)
  const legacySession = localStorage.getItem(SESSION_KEY)
  if (legacyToken && legacySession) {
    sessionStorage.setItem(TOKEN_KEY, legacyToken)
    sessionStorage.setItem(SESSION_KEY, legacySession)
  }
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
}

const isRole = (value: unknown): value is Role =>
  value === 'User' || value === 'Manager' || value === 'SystemAdmin'

export const roleHome: Record<Role, string> = {
  User: '/app/dashboard',
  Manager: '/app/manager/counters',
  SystemAdmin: '/app/admin/dashboard',
}

export const auth = {
  getToken: () => {
    migrateLegacySession()
    return sessionStorage.getItem(TOKEN_KEY)
  },

  getSession(): Session | null {
    const token = auth.getToken()
    if (!token) return null

    try {
      const claims = jwtDecode<TokenClaims>(token)
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Session | null
      if (claims.exp * 1000 <= Date.now() || !isRole(claims.role) || !session || session.id !== claims.userId) {
        auth.clearSession()
        return null
      }
      return { ...session, role: claims.role }
    } catch {
      auth.clearSession()
      return null
    }
  },

  setSession(token: string, session: Session) {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
  },

  clearSession() {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  },
}
