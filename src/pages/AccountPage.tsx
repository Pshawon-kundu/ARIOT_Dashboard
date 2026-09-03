import { useEffect, useRef, useState } from 'react'
import { Camera, KeyRound, LoaderCircle, ShieldCheck, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import {
  changePassword,
  updateProfile,
  uploadAvatar,
} from '../services/api'

const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export function AccountPage() {
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const { currentUser, profileLoading, refreshCurrentUser, signOut } = useApp()
  const [name, setName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser) setName(currentUser.name)
  }, [currentUser])

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault()
    setProfileError(null)
    setProfileMessage(null)
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setProfileError('Display name must contain at least 2 characters.')
      return
    }
    setProfileSaving(true)
    try {
      await updateProfile(trimmed)
      await refreshCurrentUser()
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }

  const selectAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setProfileError(null)
    setProfileMessage(null)
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setProfileError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setProfileError('Photo must be 2 MB or smaller.')
      return
    }

    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setAvatarUploading(true)
    try {
      await uploadAvatar(file)
      setAvatarPreview(null)
      await refreshCurrentUser()
      setProfileMessage('Profile photo updated successfully.')
    } catch (error) {
      setAvatarPreview(null)
      setProfileError(error instanceof Error ? error.message : 'Unable to upload photo.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Complete all password fields.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must contain at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      signOut()
      navigate('/login', {
        replace: true,
        state: { message: 'Password changed successfully. Please sign in again.' },
      })
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to change password.')
      setPasswordSaving(false)
    }
  }

  if (profileLoading && !currentUser) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-ink-muted">
        <LoaderCircle className="animate-spin" size={24} />
      </div>
    )
  }

  if (!currentUser) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="font-semibold text-ink">Unable to load your account profile.</p>
        <button className="mt-3 text-sm font-semibold text-brand" onClick={() => void refreshCurrentUser()}>
          Try again
        </button>
      </Card>
    )
  }

  const initials = getInitials(currentUser.name)
  const shownAvatar = avatarPreview ?? currentUser.avatar_url

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Account Settings</h1>
        <p className="mt-1 text-sm text-ink-secondary">Manage your profile and account security.</p>
      </div>

      <div className="space-y-5">
        <Card>
          <div className="flex items-center gap-3 border-b border-line pb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pale text-brand">
              <User size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Profile</h2>
              <p className="text-[13px] text-ink-secondary">Your personal information across the dashboard.</p>
            </div>
          </div>

          <div className="grid gap-8 pt-6 md:grid-cols-[180px_1fr]">
            <div>
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-brand-pale text-brand">
                {shownAvatar ? (
                  <img src={shownAvatar} alt={`${currentUser.name}'s avatar`} className={`h-full w-full object-cover ${avatarUploading ? 'opacity-50' : ''}`} />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-bold">{initials}</span>
                )}
                {avatarUploading && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <LoaderCircle className="animate-spin text-brand-dark" size={22} />
                  </span>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => void selectAvatar(event)}
              />
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => fileInput.current?.click()}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink-secondary hover:bg-app disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera size={15} />
                {currentUser.avatar_url ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="mt-2 text-[11px] leading-5 text-ink-muted">JPEG, PNG, or WebP<br />Maximum 2 MB</p>
            </div>

            <form onSubmit={saveName} className="space-y-4">
              <AccountField label="Display Name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  autoComplete="name"
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </AccountField>
              <AccountField label="Email">
                <input value={currentUser.email} readOnly className="h-10 w-full cursor-not-allowed rounded-lg border border-line bg-app px-3 text-sm text-ink-secondary" />
              </AccountField>
              {(profileError || profileMessage) && (
                <p role="status" className={`rounded-lg px-3 py-2 text-[13px] ${profileError ? 'bg-danger-pale text-[#B42318]' : 'bg-success-pale text-[#166B45]'}`}>
                  {profileError ?? profileMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={profileSaving || name.trim() === currentUser.name}
                className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 border-b border-line pb-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pale text-brand">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Security</h2>
              <p className="text-[13px] text-ink-secondary">Change the password used to sign in.</p>
            </div>
          </div>

          <form onSubmit={submitPassword} className="max-w-xl space-y-4 pt-6">
            <AccountField label="Current Password">
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
            </AccountField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AccountField label="New Password" hint="Minimum 8 characters">
                <input type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
              </AccountField>
              <AccountField label="Confirm New Password">
                <input type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
              </AccountField>
            </div>
            {passwordError && (
              <p role="alert" className="rounded-lg bg-danger-pale px-3 py-2 text-[13px] text-[#B42318]">{passwordError}</p>
            )}
            <button type="submit" disabled={passwordSaving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
              <KeyRound size={16} />
              {passwordSaving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function AccountField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium text-ink-secondary">
        <span>{label}</span>
        {hint && <span className="text-[11px] font-normal text-ink-muted">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'U'
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('')
}
