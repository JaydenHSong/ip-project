'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { I18nProvider } from '@/lib/i18n/context'
import { SpigenLogo } from '@/components/ui/SpigenLogo'

const SPLINE_URL = 'https://prod.spline.design/Rd0xLPNbcDHXmezX/scene.splinecode'

const LoginContent = () => {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleGoogleLogin = async () => {
    const supabase = createClient()

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          hd: 'spigen.com',
        },
      },
    })
  }

  return (
    <div className="relative flex min-h-screen">
      {/* Spline Viewer Script */}
      <Script
        src="https://unpkg.com/@splinetool/viewer@1.12.69/build/spline-viewer.js"
        type="module"
        strategy="afterInteractive"
      />

      {/* Left Panel — Spline 3D Scene */}
      <div className="hidden flex-1 lg:block">
        <div className="h-full w-full overflow-hidden">
          <spline-viewer
            url={SPLINE_URL}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              transform: 'scaleX(-1)',
            }}
          />
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-8 lg:w-[480px] lg:min-w-[480px]">
        <div className="absolute inset-0 bg-th-bg" />

        <div className="relative z-10 w-full max-w-sm animate-fade-in">
          {/* Sentinel Branding */}
          <div className="flex items-center gap-2.5">
            <SpigenLogo className="h-8 w-7 text-th-accent" />
            <span className="text-xl font-bold text-th-text">Sentinel</span>
          </div>
          <p className="mt-2 text-sm text-th-text-secondary">
            {t('login.hero.subtitle' as Parameters<typeof t>[0])}
          </p>

          {/* Sign In */}
          <h1 className="mt-10 text-2xl font-bold text-th-text">{t('login.title')}</h1>
          <p className="mt-1 text-sm text-th-text-secondary">
            {t('login.subtitle')}
          </p>

          {/* Error Message */}
          {error === 'account_deactivated' && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <p className="font-medium">{t('login.deactivatedTitle' as Parameters<typeof t>[0])}</p>
              <p className="mt-1 text-xs text-red-400/80">
                {t('login.deactivatedMessage' as Parameters<typeof t>[0])}
              </p>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-th-border bg-surface-card px-4 py-3.5 text-sm font-medium text-th-text shadow-sm transition-all duration-200 hover:shadow-md hover:border-th-border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-th-accent focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t('login.signIn')}
          </button>

          <p className="mt-4 text-xs text-th-text-secondary">
            {t('login.restriction')}
          </p>
        </div>
      </div>
    </div>
  )
}

const LoginPage = () => {
  return (
    <I18nProvider>
      <Suspense>
        <LoginContent />
      </Suspense>
    </I18nProvider>
  )
}

export default LoginPage
