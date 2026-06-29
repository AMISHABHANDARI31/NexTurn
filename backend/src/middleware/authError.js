export function authError(code = 'AUTH_REQUIRED', message = 'Authentication is required.', status = 401) {
  return Object.assign(new Error(message), { status, code })
}
