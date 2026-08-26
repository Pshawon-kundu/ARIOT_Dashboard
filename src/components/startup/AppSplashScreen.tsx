import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'ariot-splash-seen'
const MIN_DISPLAY = 1000
const MAX_DISPLAY = 2200
const ASSETS = ['/assets/ariot-logo.png', '/assets/robot.png']

type Phase = 'visible' | 'exiting' | 'done'

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* sessionStorage unavailable — splash simply shows each load */
  }
}

export function AppSplashScreen() {
  const [phase, setPhase] = useState<Phase>(() =>
    alreadySeen() ? 'done' : 'visible',
  )
  const [logoOk, setLogoOk] = useState(true)
  const startRef = useRef(0)

  useEffect(() => {
    if (phase === 'done') return

    const isReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const min = isReduced ? 700 : MIN_DISPLAY

    let loaded = 0
    let exited = false

    const finish = () => {
      markSeen()
      setPhase('done')
    }

    const tryExit = () => {
      if (exited) return
      const elapsed = performance.now() - startRef.current
      if (elapsed >= min && loaded >= ASSETS.length) {
        exited = true
        setPhase('exiting')
        window.setTimeout(finish, isReduced ? 250 : 450)
      }
    }

    startRef.current = performance.now()

    ASSETS.forEach((src) => {
      const img = new Image()
      img.onload = () => {
        loaded += 1
        tryExit()
      }
      img.onerror = () => {
        loaded += 1
        if (src.includes('ariot-logo')) setLogoOk(false)
        tryExit()
      }
      img.src = src
    })

    const tick = window.setInterval(tryExit, 80)
    const hardStop = window.setTimeout(() => {
      exited = true
      setPhase('exiting')
      window.setTimeout(finish, isReduced ? 250 : 450)
    }, MAX_DISPLAY)

    return () => {
      window.clearInterval(tick)
      window.clearTimeout(hardStop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'done') return null

  return (
    <div
      role="status"
      aria-label="Starting ARIOT CleanBot"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 transition-opacity duration-500 ${
        phase === 'exiting' ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(120% 120% at 50% 35%, #FFFFFF 0%, #F7F9FC 55%, #EEF3FA 100%)',
      }}
    >
      <div className="flex flex-col items-center text-center">
        {logoOk ? (
          <img
            src="/assets/ariot-logo.png"
            alt="ARIOT Technologies"
            draggable={false}
            className="splash-logo w-[210px] max-w-[60vw] h-auto object-contain"
          />
        ) : (
          <div className="splash-logo text-[34px] font-extrabold tracking-tight text-brand">
            ARIOT
          </div>
        )}

        <h1 className="splash-title mt-7 text-[22px] font-bold tracking-tight text-ink">
          ARIOT CleanBot
        </h1>
        <p className="splash-motto mt-1.5 text-[15px] font-medium text-ink-secondary">
          Smart cleaning. Better facilities.
        </p>

        <div className="splash-dots mt-7 flex items-center gap-2" aria-hidden="true">
          <span className="splash-dot h-1.5 w-1.5 rounded-full bg-brand/50" />
          <span
            className="splash-dot h-1.5 w-1.5 rounded-full bg-brand/50"
            style={{ animationDelay: '0.15s' }}
          />
          <span
            className="splash-dot h-1.5 w-1.5 rounded-full bg-brand/50"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>

      <p className="splash-motto absolute bottom-8 text-[12px] font-medium tracking-wide text-ink-muted">
        Facility Management
      </p>
    </div>
  )
}
