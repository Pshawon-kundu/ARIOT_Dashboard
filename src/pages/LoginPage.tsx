import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { loginUser } from '../services/api'

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const location = useLocation()
  const message = (location.state as { message?: string } | null)?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginUser(email, password)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app">
      <div className="w-full max-w-[380px] rounded-2xl border border-[#E3EAF3] bg-white p-8 shadow-[0_4px_24px_rgba(16,24,40,0.08)]">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <Bot size={24} />
          </span>
          <h1 className="text-[22px] font-bold text-[#101828]">ARIOT CleanBot</h1>
          <p className="text-[13px] text-[#667085]">Sign in to the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {message && (
            <div className="rounded-lg bg-success-pale px-3 py-2 text-[13px] text-[#166B45]">
              {message}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-[#344054]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE4EF] px-3 text-[14px] text-[#101828] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-[13px] font-medium text-[#344054]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE4EF] px-3 text-[14px] text-[#101828] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-[#FEF3F2] px-3 py-2 text-[13px] text-[#B42318]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-brand text-[14px] font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-[13px] text-ink-secondary">
          New to ARIOT?{' '}
          <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
