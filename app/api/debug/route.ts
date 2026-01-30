import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'

export async function GET(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request)

  return NextResponse.json({
    authenticated: !!user,
    userId: user?.id,
    email: user?.email
  })
}
