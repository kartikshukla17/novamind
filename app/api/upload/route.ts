import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth-helper'
import { generateUniqueFilename, isImageFile } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const { user, supabase } = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const filename = generateUniqueFilename(file.name)
    const path = `${user.id}/${filename}`
    const mimeType = file.type

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(path, file, {
        contentType: mimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(path)

    return NextResponse.json({
      path,
      mimeType,
      publicUrl,
      isImage: isImageFile(mimeType),
    })
  } catch (error) {
    console.error('Error in upload:', error)
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 })
  }
}
