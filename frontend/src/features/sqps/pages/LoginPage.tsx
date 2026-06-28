import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useAuth } from '../../../lib/auth/AuthContext'
import { roleHome } from '../../../lib/auth/auth'
import { loginSchema, otpSchema, registrationSchema, type LoginValues, type OtpValues, type RegistrationValues } from '../schemas/authSchemas'

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

function AuthFrame({ registerMode, children }: { registerMode: boolean; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2">
      <section>
        <p className="eyebrow">NexTurn account</p>
        <h1 className="mt-3 text-4xl font-bold text-ink sm:text-5xl">{registerMode ? 'Create your account.' : 'Welcome back.'}</h1>
        <p className="mt-4 max-w-md text-slate-600">{registerMode ? 'Every new account starts securely as a user. Administrators manage elevated access.' : 'Sign in to the workspace assigned to your account.'}</p>
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
  const registerMode = useLocation().pathname === '/register'
  const navigate = useNavigate()
  const { signIn, registerAccount, verifyEmailOtp, resendEmailOtp } = useAuth()
  const [formError, setFormError] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [resending, setResending] = useState(false)
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const registrationForm = useForm<RegistrationValues>({ resolver: zodResolver(registrationSchema) })
  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema), defaultValues: { otp: '' } })

  const submitLogin = async (values: LoginValues) => {
    setFormError('')
    try {
      const session = await signIn(values.email, values.password)
      navigate(roleHome[session.role])
    } catch (error) {
      setFormError(errorMessage(error, 'Unable to sign in.'))
    }
  }

  const submitRegistration = async (values: RegistrationValues) => {
    setFormError('')
    try {
      const pending = await registerAccount(values)
      setVerificationEmail(pending.email)
    } catch (error) {
      setFormError(errorMessage(error, 'Unable to create account.'))
    }
  }

  const submitOtp = async (values: OtpValues) => {
    setFormError('')
    try {
      const session = await verifyEmailOtp(verificationEmail, values.otp)
      navigate(roleHome[session.role])
    } catch (error) { setFormError(errorMessage(error, 'Unable to verify this code.')) }
  }

  const resend = async () => {
    setFormError('')
    setResending(true)
    try { await resendEmailOtp(verificationEmail) }
    catch (error) { setFormError(errorMessage(error, 'Unable to resend the code.')) }
    finally { setResending(false) }
  }

  return (
    <AuthFrame registerMode={registerMode}>
      {registerMode && verificationEmail ? (
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
          <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters with one uppercase letter" error={registrationForm.formState.errors.password?.message} {...registrationForm.register('password')} />
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <Button className="w-full" disabled={registrationForm.formState.isSubmitting}>{registrationForm.formState.isSubmitting ? 'Creating account...' : 'Create account'}</Button>
          <p className="text-center text-sm text-slate-500">Already registered? <Link className="font-bold text-ocean" to="/login">Sign in</Link></p>
        </form>
      ) : (
        <form onSubmit={loginForm.handleSubmit(submitLogin)} className="space-y-5">
          <Input label="Email address" type="email" autoComplete="email" placeholder="you@example.com" error={loginForm.formState.errors.email?.message} {...loginForm.register('email')} />
          <Input label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" error={loginForm.formState.errors.password?.message} {...loginForm.register('password')} />
          {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <Button className="w-full" disabled={loginForm.formState.isSubmitting}>{loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in securely'}</Button>
          <p className="text-center text-sm text-slate-500">New to NexTurn? <Link className="font-bold text-ocean" to="/register">Create an account</Link></p>
        </form>
      )}
    </AuthFrame>
  )
}
