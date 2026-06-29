import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, MailCheck, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useAuth } from '../../../lib/auth/AuthContext'
import { roleHome } from '../../../lib/auth/auth'
import {
  forgotPasswordSchema,
  loginSchema,
  otpSchema,
  registrationSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type LoginValues,
  type OtpValues,
  type RegistrationValues,
  type ResetPasswordValues,
} from '../schemas/authSchemas'

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

function AuthFrame({ mode, children }: { mode: 'login' | 'register' | 'forgot' | 'reset'; children: React.ReactNode }) {
  const copy = {
    login: {
      title: 'Welcome back.',
      description: 'Sign in to the workspace assigned to your account.',
    },
    register: {
      title: 'Create your account.',
      description: 'Every new account starts securely as a user. Administrators manage elevated access.',
    },
    forgot: {
      title: 'Reset your password.',
      description: 'Enter your account email and NexTurn will send a secure reset link.',
    },
    reset: {
      title: 'Choose a new password.',
      description: 'Use the secure link from your email to update your NexTurn password.',
    },
  }[mode]

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
      <section>
        <p className="eyebrow">NexTurn account</p>
        <h1 className="mt-3 text-4xl font-bold text-ink sm:text-5xl">{copy.title}</h1>
        <p className="mt-4 max-w-md text-slate-600">{copy.description}</p>
        <div className="mt-8 hidden rounded-2xl bg-navy p-6 text-white lg:block">
          <ShieldCheck className="text-mint" />
          <p className="mt-4 text-sm font-semibold text-mint">Role-safe by default</p>
          <p className="display mt-2 text-2xl font-bold">Access follows your account</p>
          <p className="mt-2 text-sm text-slate-300">Users cannot select or elevate their own role.</p>
        </div>
      </section>
      <section className="card p-6 sm:p-8">{children}</section>
    </div>
  )
}

export function LoginPage() {
  const location = useLocation()
  const registerMode = location.pathname === '/register'
  const forgotMode = location.pathname === '/forgot-password'
  const resetMode = location.pathname === '/reset-password'
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { signIn, registerAccount, verifyEmailOtp, resendEmailOtp, requestPasswordReset, resetPassword } = useAuth()
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [resending, setResending] = useState(false)
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const registrationForm = useForm<RegistrationValues>({ resolver: zodResolver(registrationSchema) })
  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } })
  const forgotPasswordForm = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })
  const resetPasswordForm = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } })
  const resetEmail = searchParams.get('email') ?? ''
  const resetToken = searchParams.get('token') ?? ''

  const submitLogin = async (values: LoginValues) => {
    setFormError('')
    setFormSuccess('')
    try {
      const session = await signIn(values.email, values.password)
      navigate(roleHome[session.role])
    } catch (error) {
      setFormError(errorMessage(error, 'Unable to sign in.'))
    }
  }

  const submitRegistration = async (values: RegistrationValues) => {
    setFormError('')
    setFormSuccess('')
    try {
      const pending = await registerAccount(values)
      setVerificationEmail(pending.email)
    } catch (error) {
      setFormError(errorMessage(error, 'Unable to create account.'))
    }
  }

  const submitOtp = async (values: OtpValues) => {
    setFormError('')
    setFormSuccess('')
    try {
      const session = await verifyEmailOtp(verificationEmail, values.otp)
      navigate(roleHome[session.role])
    } catch (error) { setFormError(errorMessage(error, 'Unable to verify this code.')) }
  }

  const resend = async () => {
    setFormError('')
    setFormSuccess('')
    setResending(true)
    try { await resendEmailOtp(verificationEmail) }
    catch (error) { setFormError(errorMessage(error, 'Unable to resend the code.')) }
    finally { setResending(false) }
  }

  const submitForgotPassword = async (values: ForgotPasswordValues) => {
    setFormError('')
    setFormSuccess('')
    try {
      const message = await requestPasswordReset(values.email)
      setFormSuccess(message || 'If this email exists, a secure reset link has been sent.')
    } catch (error) {
      setFormError(errorMessage(error, 'Unable to send reset email.'))
    }
  }

  const submitResetPassword = async (values: ResetPasswordValues) => {
    setFormError('')
    setFormSuccess('')
    if (!resetEmail || !resetToken) {
      setFormError('This reset link is missing required information. Please request a new link.')
      return
    }
    try {
      const message = await resetPassword({ email: resetEmail, token: resetToken, password: values.password })
      setFormSuccess(message || 'Your password has been reset. You can now sign in.')
      resetPasswordForm.reset()
    } catch (error) {
      setFormError(errorMessage(error, 'Unable to reset password.'))
    }
  }

  const mode = resetMode ? 'reset' : forgotMode ? 'forgot' : registerMode ? 'register' : 'login'

  return (
    <AuthFrame mode={mode}>
      {forgotMode ? (
        <form onSubmit={forgotPasswordForm.handleSubmit(submitForgotPassword)} className="space-y-5">
          <div className="flex items-center gap-2"><KeyRound className="text-ocean" /><h2 className="text-xl font-bold">Forgot password</h2></div>
          <Input label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={forgotPasswordForm.formState.errors.email?.message} {...forgotPasswordForm.register('email')} />
          {formSuccess && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{formSuccess}</p>}
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <Button className="w-full" disabled={forgotPasswordForm.formState.isSubmitting}>{forgotPasswordForm.formState.isSubmitting ? 'Sending link...' : 'Send reset link'}</Button>
          <p className="text-center text-sm text-slate-500">Remembered it? <Link className="font-bold text-ocean" to="/login">Sign in</Link></p>
        </form>
      ) : resetMode ? (
        <form onSubmit={resetPasswordForm.handleSubmit(submitResetPassword)} className="space-y-5">
          <div className="flex items-center gap-2"><KeyRound className="text-ocean" /><h2 className="text-xl font-bold">Set new password</h2></div>
          {resetEmail && <p className="text-sm text-slate-600">Resetting password for <strong>{resetEmail}</strong>.</p>}
          <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters with uppercase, lowercase, and a number" error={resetPasswordForm.formState.errors.password?.message} {...resetPasswordForm.register('password')} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={resetPasswordForm.formState.errors.confirmPassword?.message} {...resetPasswordForm.register('confirmPassword')} />
          {formSuccess && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{formSuccess}</p>}
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <Button className="w-full" disabled={resetPasswordForm.formState.isSubmitting}>{resetPasswordForm.formState.isSubmitting ? 'Updating password...' : 'Update password'}</Button>
          <p className="text-center text-sm text-slate-500">Ready? <Link className="font-bold text-ocean" to="/login">Sign in</Link></p>
        </form>
      ) : registerMode && verificationEmail ? (
        <form onSubmit={otpForm.handleSubmit(submitOtp)} className="space-y-5">
          <div className="flex items-center gap-2"><MailCheck className="text-ocean" /><h2 className="text-xl font-bold">Verify your email</h2></div>
          <p className="text-sm text-slate-600">We sent a 6-digit code to <strong>{verificationEmail}</strong>.</p>
          <Input label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" error={otpForm.formState.errors.otp?.message} {...otpForm.register('otp')} />
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <Button className="w-full" disabled={otpForm.formState.isSubmitting}>{otpForm.formState.isSubmitting ? 'Verifying...' : 'Verify and continue'}</Button>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><button type="button" onClick={resend} disabled={resending} className="inline-flex items-center gap-1 font-bold text-ocean disabled:opacity-50"><RefreshCw size={14} />{resending ? 'Sending...' : 'Resend code'}</button><button type="button" onClick={() => { setVerificationEmail(''); setFormError('') }} className="font-semibold text-slate-500">Change email</button></div>
        </form>
      ) : registerMode ? (
        <form onSubmit={registrationForm.handleSubmit(submitRegistration)} className="space-y-5">
          <div className="flex items-center gap-2"><UserPlus className="text-ocean" /><h2 className="text-xl font-bold">Sign up</h2></div>
          <Input label="Full name" autoComplete="name" error={registrationForm.formState.errors.name?.message} {...registrationForm.register('name')} />
          <Input label="Email address" type="email" autoComplete="email" error={registrationForm.formState.errors.email?.message} {...registrationForm.register('email')} />
          <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters with uppercase, lowercase, and a number" error={registrationForm.formState.errors.password?.message} {...registrationForm.register('password')} />
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <Button className="w-full" disabled={registrationForm.formState.isSubmitting}>{registrationForm.formState.isSubmitting ? 'Creating account...' : 'Create account'}</Button>
          <p className="text-center text-sm text-slate-500">Already registered? <Link className="font-bold text-ocean" to="/login">Sign in</Link></p>
        </form>
      ) : (
        <form onSubmit={loginForm.handleSubmit(submitLogin)} className="space-y-5">
          <Input label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={loginForm.formState.errors.email?.message} {...loginForm.register('email')} />
          <Input label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" error={loginForm.formState.errors.password?.message} {...loginForm.register('password')} />
          <div className="-mt-2 text-right">
            <Link className="text-sm font-bold text-ocean hover:text-navy" to="/forgot-password">Forgot password?</Link>
          </div>
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <Button className="w-full" disabled={loginForm.formState.isSubmitting}>{loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in securely'}</Button>
          <p className="text-center text-sm text-slate-500">New to NexTurn? <Link className="font-bold text-ocean" to="/register">Create an account</Link></p>
        </form>
      )}
    </AuthFrame>
  )
}
