// CogniKeep Clipboard Monitor
// Listens for copy events and saves to CogniKeep when enabled in dashboard settings

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
    console.log('CogniKeep: Clipboard monitoring is', isMonitoringEnabled ? 'enabled' : 'disabled')
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
      console.log('CogniKeep: Clipboard monitoring updated to', isMonitoringEnabled ? 'enabled' : 'disabled')
    }
  })
} catch (e) {
  // Extension context invalidated
}

// Listen for settings updates from the web dashboard
window.addEventListener('message', async (event) => {
  if (event.data.type === 'COGNIKEEP_SETTINGS_UPDATE' && event.data.settings) {
    const newEnabled = event.data.settings.clipboard_monitoring === true
    isMonitoringEnabled = newEnabled

    // Sync to chrome.storage so other tabs get the update
    try {
      const { settings = {} } = await chrome.storage.local.get('settings')
      settings.clipboardMonitoring = newEnabled
      await chrome.storage.local.set({ settings })
      console.log('CogniKeep: Settings synced from dashboard, clipboard monitoring:', newEnabled ? 'enabled' : 'disabled')
    } catch (e) {
      // Extension context may be invalidated (extension reloaded)
      console.log('CogniKeep: Extension context invalidated, please refresh the page')
    }
  }
})

// Also check localStorage for settings (fallback when content script loads on CogniKeep pages)
if (window.location.hostname === 'localhost' && window.location.port === '3000') {
  try {
    const storedSettings = localStorage.getItem('cognikeep_settings')
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
        const base64 = await blobToBase64(imageData.blob)

        try {
          chrome.runtime.sendMessage({
            action: 'clipboard-capture',
            data: {
              type: 'image',
              imageData: base64,
              mimeType: imageData.mimeType,
              title: `Screenshot ${new Date().toLocaleString()}`
            }
          })
          console.log('CogniKeep: Screenshot captured from clipboard')
        } catch (e) {
          // Extension context invalidated
        }
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
        console.log('CogniKeep: Clipboard content captured and sent')
      } catch (e) {
        // Extension context invalidated
      }
    } catch (err) {
      // Clipboard read failed - this is expected in some contexts
    }
  }, 100)
})

// Listen for paste events - this captures system screenshots!
document.addEventListener('paste', async (e) => {
  if (!isMonitoringEnabled || !isExtensionValid()) return

  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile()
      if (!blob) continue

      // Convert to base64
      const base64 = await blobToBase64(blob)

      try {
        chrome.runtime.sendMessage({
          action: 'clipboard-capture',
          data: {
            type: 'image',
            imageData: base64,
            mimeType: item.type,
            title: `Screenshot ${new Date().toLocaleString()}`
          }
        })
        console.log('CogniKeep: Screenshot captured from paste event')
      } catch (e) {
        // Extension context invalidated
      }
      return
    }
  }
})

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
