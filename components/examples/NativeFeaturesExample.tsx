'use client'

/**
 * Example Component: Using Native Features with Capacitor
 * This is a reference implementation showing how to use Capacitor features
 * You can copy patterns from this file into your own components
 */

import { useState } from 'react'
import {
  isCapacitor,
  isIOS,
  isAndroid,
  getPlatform,
  takePhoto,
  pickImage,
  shareContent,
  requestCameraPermissions,
  checkCameraPermissions,
} from '@/lib/capacitor'

export function NativeFeaturesExample() {
  const [platform, setPlatform] = useState<string>('unknown')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [permissions, setPermissions] = useState({ camera: false, photos: false })

  // Check platform on mount
  useState(() => {
    setPlatform(getPlatform())
  })

  const handleCheckPlatform = () => {
    const platformInfo = {
      isNative: isCapacitor(),
      isiOS: isIOS(),
      isAndroid: isAndroid(),
      platform: getPlatform(),
    }
    alert(JSON.stringify(platformInfo, null, 2))
  }

  const handleCheckPermissions = async () => {
    const perms = await checkCameraPermissions()
    setPermissions(perms)
    alert(`Camera: ${perms.camera ? '✅' : '❌'}\nPhotos: ${perms.photos ? '✅' : '❌'}`)
  }

  const handleRequestPermissions = async () => {
    const granted = await requestCameraPermissions()
    if (granted) {
      alert('✅ Permissions granted!')
      handleCheckPermissions()
    } else {
      alert('❌ Permissions denied')
    }
  }

  const handleTakePhoto = async () => {
    try {
      const photo = await takePhoto()
      if (photo) {
        setPhotoUrl(photo)
        alert('✅ Photo taken!')
      } else {
        alert('❌ No photo taken')
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      alert('❌ Error taking photo')
    }
  }

  const handlePickImage = async () => {
    try {
      const image = await pickImage()
      if (image) {
        setPhotoUrl(image)
        alert('✅ Image selected!')
      } else {
        alert('❌ No image selected')
      }
    } catch (error) {
      console.error('Error picking image:', error)
      alert('❌ Error picking image')
    }
  }

  const handleShare = async () => {
    const shared = await shareContent({
      title: 'Check out Novamind!',
      text: 'A second brain app with local AI',
      url: 'https://novamind.app',
      dialogTitle: 'Share Novamind',
    })

    if (shared) {
      alert('✅ Shared successfully!')
    } else {
      alert('❌ Share cancelled or not available')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-soft p-6">
        <h2 className="text-2xl font-bold mb-4">Native Features Demo</h2>
        <p className="text-warm-600 mb-4">
          Current Platform: <strong>{platform}</strong>
        </p>

        <div className="space-y-3">
          <button
            onClick={handleCheckPlatform}
            className="w-full btn-secondary"
          >
            Check Platform Info
          </button>

          <div className="border-t pt-3">
            <h3 className="font-semibold mb-2">Camera Permissions</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCheckPermissions}
                className="flex-1 btn-secondary"
              >
                Check Permissions
              </button>
              <button
                onClick={handleRequestPermissions}
                className="flex-1 btn-primary"
              >
                Request Permissions
              </button>
            </div>
            {permissions && (
              <p className="text-sm text-warm-600 mt-2">
                Camera: {permissions.camera ? '✅' : '❌'} |
                Photos: {permissions.photos ? '✅' : '❌'}
              </p>
            )}
          </div>

          <div className="border-t pt-3">
            <h3 className="font-semibold mb-2">Camera & Photos</h3>
            <div className="flex gap-2">
              <button
                onClick={handleTakePhoto}
                className="flex-1 btn-primary"
              >
                📸 Take Photo
              </button>
              <button
                onClick={handlePickImage}
                className="flex-1 btn-primary"
              >
                🖼️ Pick Image
              </button>
            </div>
          </div>

          <div className="border-t pt-3">
            <h3 className="font-semibold mb-2">Sharing</h3>
            <button
              onClick={handleShare}
              className="w-full btn-primary"
            >
              📤 Share Content
            </button>
          </div>
        </div>

        {photoUrl && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold mb-2">Selected Image:</h3>
            <img
              src={photoUrl}
              alt="Selected"
              className="w-full h-auto rounded-lg"
            />
          </div>
        )}
      </div>

      <div className="bg-warm-50 rounded-xl p-6">
        <h3 className="font-semibold mb-2">Usage Example:</h3>
        <pre className="text-xs bg-warm-900 text-warm-50 p-4 rounded-lg overflow-x-auto">
{`import {
  isCapacitor,
  takePhoto,
  shareContent
} from '@/lib/capacitor'

// Check if running natively
if (isCapacitor()) {
  const photo = await takePhoto()
  // Use photo...
}

// Share content
await shareContent({
  title: 'Title',
  text: 'Text',
  url: 'https://example.com'
})`}
        </pre>
      </div>
    </div>
  )
}
