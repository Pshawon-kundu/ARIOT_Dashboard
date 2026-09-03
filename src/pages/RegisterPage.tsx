import { useEffect, useRef, useState } from 'react'
import { Bot, CheckCircle2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  const navigate = useNavigate()
  const redirectTimer = useRef<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => () => {
    if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current)
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    const trimmedName = name.trim()
    const normalizedEmail = email.trim()
    if (!trimmedName || !normalizedEmail || !password || !confirmation) {
      setError('Complete all required fields.')
      return
    }
    if (trimmedName.length < 2) {
      setError('Full name must contain at least 2 characters.')
      return
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await registerUser({
        name: trimmedName,
        email: normalizedEmail,
        password,
      })
      setSuccess(true)
      redirectTimer.current = window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Account created successfully. You can now sign in.' },
        })
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#E3EAF3] bg-white p-8 shadow-[0_4px_24px_rgba(16,24,40,0.08)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <Bot size={24} />
          </span>
          <div>
            <h1 className="text-[22px] font-bold text-[#101828]">Create your account</h1>
            <p className="mt-1 text-[13px] text-[#667085]">Get started with ARIOT CleanBot</p>
          </div>
        </div>

        {success ? (
          <div className="mt-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-pale text-success">
              <CheckCircle2 size={24} />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-ink">
              Account created successfully. You can now sign in.
            </p>
            <p className="mt-2 text-[13px] text-ink-muted">Taking you to sign in...</p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <Field label="Full Name" id="name">
                <input
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[#DCE4EF] px-3 text-[14px] text-[#101828] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
                  placeholder="Your full name"
                />
              </Field>
              <Field label="Email" id="register-email">
                <input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[#DCE4EF] px-3 text-[14px] text-[#101828] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Password" id="register-password" hint="Minimum 8 characters">
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[#DCE4EF] px-3 text-[14px] text-[#101828] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
                  placeholder="Create a password"
                />
              </Field>
              <Field label="Confirm Password" id="confirm-password">
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="h-10 w-full rounded-lg border border-[#DCE4EF] px-3 text-[14px] text-[#101828] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
                  placeholder="Repeat your password"
                />
              </Field>

              {error && (
                <div role="alert" className="rounded-lg bg-danger-pale px-3 py-2 text-[13px] text-[#B42318]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-brand text-[14px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            <p className="mt-6 text-center text-[13px] text-ink-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
                Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string
  id: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-[#344054]">
          {label}
        </label>
        {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}
