// Novamind Clipboard Monitor
// Listens for copy events and saves to Novamind when enabled in dashboard settings

let isMonitoringEnabled = false
let lastSavedContent = ''

// Check if extension context is still valid
function isExtensionValid() {
  try {
    return chrome.runtime && !!chrome.runtime.id
  } catch (e) {
    return false
  }
}

// Check if monitoring is enabled from chrome storage
async function checkMonitoringStatus() {
  if (!isExtensionValid()) return
  try {
    const { settings } = await chrome.storage.local.get('settings')
    isMonitoringEnabled = settings?.clipboardMonitoring === true
    console.log('Novamind: Clipboard monitoring is', isMonitoringEnabled ? 'enabled' : 'disabled')
  } catch (e) {
    isMonitoringEnabled = false
  }
}

// Initialize on load
checkMonitoringStatus()

// Listen for settings changes in chrome.storage (from extension)
try {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.settings) {
      isMonitoringEnabled = changes.settings.newValue?.clipboardMonitoring === true
      console.log('Novamind: Clipboard monitoring updated to', isMonitoringEnabled ? 'enabled' : 'disabled')
    }
  })
} catch (e) {
  // Extension context invalidated
}

// Listen for settings updates from the web dashboard
window.addEventListener('message', async (event) => {
  if (event.data.type === 'NOVAMIND_SETTINGS_UPDATE' && event.data.settings) {
    const newEnabled = event.data.settings.clipboard_monitoring === true
    isMonitoringEnabled = newEnabled

    // Sync to chrome.storage so other tabs get the update
    try {
      const { settings = {} } = await chrome.storage.local.get('settings')
      settings.clipboardMonitoring = newEnabled
      await chrome.storage.local.set({ settings })
      console.log('Novamind: Settings synced from dashboard, clipboard monitoring:', newEnabled ? 'enabled' : 'disabled')
    } catch (e) {
      // Extension context may be invalidated (extension reloaded)
      console.log('Novamind: Extension context invalidated, please refresh the page')
    }
  }
})

// Also check localStorage for settings (fallback when content script loads on Novamind pages)
const isNovamindDashboard = (window.location.hostname === 'localhost' && window.location.port === '3000') ||
  window.location.hostname.endsWith('vercel.app') ||
  window.location.hostname.endsWith('novamind.com')
if (isNovamindDashboard) {
  try {
    const storedSettings = localStorage.getItem('novamind_settings')
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings)
      if (parsed.clipboard_monitoring !== undefined) {
        isMonitoringEnabled = parsed.clipboard_monitoring === true
        // Sync to chrome.storage
        chrome.storage.local.get('settings').then(({ settings = {} }) => {
          settings.clipboardMonitoring = isMonitoringEnabled
          chrome.storage.local.set({ settings })
        })
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

// Try to read images from clipboard
async function readClipboardImage() {
  try {
    const items = await navigator.clipboard.read()

    for (const item of items) {
      // Check for image types
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          return { blob, mimeType: type }
        }
      }
    }
  } catch (err) {
    // Clipboard read failed - this is expected in some contexts
  }
  return null
}

// Convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Listen for copy events
document.addEventListener('copy', async (e) => {
  if (!isMonitoringEnabled || !isExtensionValid()) return

  // Small delay to let the clipboard populate
  setTimeout(async () => {
    try {
      // First, try to read image from clipboard (for screenshots)
      const imageData = await readClipboardImage()

      if (imageData) {
        // We have an image! Convert to base64 and send
        blobToBase64(imageData.blob).then((base64) => {
          try {
            chrome.runtime.sendMessage({
              action: 'clipboard-capture',
              data: {
                type: 'image',
                imageData: base64,
                mimeType: imageData.mimeType,
                title: 'Image from clipboard'
              }
            })
            console.log('Novamind: Image captured from clipboard')
          } catch (e) {
            // Extension context invalidated
          }
        }).catch(() => {})
        return
      }

      // No image, try text
      const text = await navigator.clipboard.readText()

      // Skip if empty, too short, or same as last saved
      if (!text || text.length < 10 || text === lastSavedContent) {
        return
      }

      // Skip if it looks like code (high ratio of special characters)
      const specialCharRatio = (text.match(/[{}[\]();=<>]/g) || []).length / text.length
      if (specialCharRatio > 0.1) {
        return // Likely code, skip
      }

      lastSavedContent = text

      // Check if it's a URL
      const isUrl = /^https?:\/\/[^\s]+$/.test(text.trim())

      // Send to background script to save
      try {
        chrome.runtime.sendMessage({
          action: 'clipboard-capture',
          data: {
            type: isUrl ? 'link' : 'text',
            [isUrl ? 'url' : 'content']: text.trim(),
            title: isUrl ? text.trim() : `Copied: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`
          }
        })
        console.log('Novamind: Clipboard content captured and sent')
      } catch (e) {
        // Extension context invalidated
      }
    } catch (err) {
      // Clipboard read failed - this is expected in some contexts
    }
  }, 100)
})

// Listen for paste events - we NEVER call preventDefault() so the image always pastes into the page.
// passive: true tells the browser we won't block; we defer our save to the next tick.
document.addEventListener('paste', (e) => {
  if (!isMonitoringEnabled || !isExtensionValid()) return

  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const blob = item.getAsFile()
      if (!blob) continue

      const mimeType = item.type
      // Defer so browser's default paste runs first
      setTimeout(() => {
        blobToBase64(blob).then((base64) => {
          try {
            chrome.runtime.sendMessage({
              action: 'clipboard-capture',
              data: {
                type: 'image',
                imageData: base64,
                mimeType,
                title: 'Image from clipboard'
              }
            })
            console.log('Novamind: Image captured from paste event')
          } catch (err) {}
        }).catch(() => {})
      }, 0)
      break
    }
  }
}, { passive: true })

// Also handle cut events
document.addEventListener('cut', async (e) => {
  if (!isMonitoringEnabled || !isExtensionValid()) return

  setTimeout(async () => {
    try {
      const text = await navigator.clipboard.readText()

      if (!text || text.length < 10 || text === lastSavedContent) {
        return
      }

      const specialCharRatio = (text.match(/[{}[\]();=<>]/g) || []).length / text.length
      if (specialCharRatio > 0.1) {
        return
      }

      lastSavedContent = text

      const isUrl = /^https?:\/\/[^\s]+$/.test(text.trim())

      try {
        chrome.runtime.sendMessage({
          action: 'clipboard-capture',
          data: {
            type: isUrl ? 'link' : 'text',
            [isUrl ? 'url' : 'content']: text.trim(),
            title: isUrl ? text.trim() : `Copied: ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`
          }
        })
      } catch (e) {
        // Extension context invalidated
      }
    } catch (err) {
      // Clipboard read failed
    }
  }, 100)
})
