import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from './server'

export async function getAuthenticatedUser(request: NextRequest) {
  // First, try Bearer token (from extension)
  const authHeader = request.headers.get('Authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')

    // Create a Supabase client with the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (user && !error) {
      return { user, supabase }
    }
  }

  // Fall back to cookie-based auth (web app)
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return { user, supabase }
}
