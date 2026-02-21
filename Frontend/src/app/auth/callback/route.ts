import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email/send'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Detect first-ever sign-in: created_at and last_sign_in_at are equal
      // (Supabase sets last_sign_in_at on every login, but for the very first
      // login via magic-link/OAuth the token exchange happens within seconds
      // of account creation — so we check if created_at is within 2 minutes).
      const createdAt = new Date(data.user.created_at).getTime()
      const isNewUser = Date.now() - createdAt < 2 * 60 * 1000

      if (isNewUser) {
        // Fire-and-forget: never block the redirect on email failure
        const name = data.user.user_metadata?.full_name as string | undefined
        const email = data.user.email
        if (email) {
          sendWelcomeEmail(email, name).catch(() => {})
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Authentication failed`)
}
