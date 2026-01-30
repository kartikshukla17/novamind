// Novamind Chrome Extension - Background Service Worker

const API_BASE_URL = 'http://localhost:3000'

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-novamind',
    title: 'Save to Novamind',
    contexts: ['page', 'selection', 'link', 'image']
  })

  chrome.contextMenus.create({
    id: 'save-selection-to-novamind',
    title: 'Save selected text to Novamind',
    contexts: ['selection']
  })

  chrome.contextMenus.create({
    id: 'save-link-to-novamind',
    title: 'Save link to Novamind',
    contexts: ['link']
  })

  chrome.contextMenus.create({
    id: 'save-image-to-novamind',
    title: 'Save image to Novamind',
    contexts: ['image']
  })

  chrome.contextMenus.create({
    id: 'save-screenshot-to-novamind',
    title: 'Save page screenshot to Novamind',
    contexts: ['page']
  })
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let itemData = null

  switch (info.menuItemId) {
    case 'save-selection-to-novamind':
      if (info.selectionText) {
        itemData = {
          type: 'text',
          content: info.selectionText,
          title: `Selection from ${tab?.title || 'unknown page'}`
        }
      }
      break

    case 'save-link-to-novamind':
      if (info.linkUrl) {
        itemData = {
          type: 'link',
          url: info.linkUrl,
          title: info.linkUrl
        }
      }
      break

    case 'save-image-to-novamind':
      if (info.srcUrl) {
        itemData = {
          type: 'image',
          url: info.srcUrl,
          thumbnail_url: info.srcUrl,
          title: `Image from ${tab?.title || 'web'}`
        }
      }
      break

    case 'save-screenshot-to-novamind':
      // Capture the visible tab as a screenshot
      if (tab?.id) {
        await captureAndSaveScreenshot(tab)
      }
      return // Return early since we handle this separately

    case 'save-to-novamind':
    default:
      if (info.selectionText) {
        itemData = {
          type: 'text',
          content: info.selectionText,
          title: `Selection from ${tab?.title || 'unknown page'}`
        }
      } else if (tab?.url) {
        itemData = {
          type: 'link',
          url: tab.url,
          title: tab.title || tab.url
        }
      }
      break
  }

  if (itemData) {
    await saveItem(itemData)
  }
})

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (command === 'save-to-novamind') {
    if (tab?.url) {
      await saveItem({
        type: 'link',
        url: tab.url,
        title: tab.title || tab.url
      })
    }
  }

  if (command === 'capture-screenshot') {
    if (tab) {
      console.log('Novamind: Screenshot shortcut triggered')
      await captureAndSaveScreenshot(tab)
    }
  }
})

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'save-item') {
    saveItem(request.data).then(sendResponse)
    return true // Keep channel open for async response
  }

  if (request.action === 'get-current-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      sendResponse({
        url: tab?.url,
        title: tab?.title
      })
    })
    return true
  }

  if (request.action === 'check-auth') {
    checkAuth().then(sendResponse)
    return true
  }

  // Capture screenshot from popup
  if (request.action === 'capture-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab) {
        captureAndSaveScreenshot(tab).then(sendResponse)
      } else {
        sendResponse({ success: false, error: 'No active tab' })
      }
    })
    return true
  }

  // Handle clipboard captures from content script
  if (request.action === 'clipboard-capture') {
    handleClipboardCapture(request.data).then((result) => {
      if (result.success) {
        console.log('Novamind: Clipboard content saved')
      }
    })
    return false // No async response needed
  }

  // Toggle clipboard monitoring
  if (request.action === 'toggle-clipboard-monitoring') {
    chrome.storage.local.get('settings').then(({ settings = {} }) => {
      settings.clipboardMonitoring = request.enabled
      chrome.storage.local.set({ settings }).then(() => {
        sendResponse({ success: true, enabled: request.enabled })
      })
    })
    return true
  }

  // Get clipboard monitoring status
  if (request.action === 'get-clipboard-status') {
    chrome.storage.local.get('settings').then(({ settings = {} }) => {
      sendResponse({ enabled: settings.clipboardMonitoring === true })
    })
    return true
  }
})

// Capture visible tab as screenshot and save
async function captureAndSaveScreenshot(tab) {
  try {
    console.log('Novamind: Starting screenshot capture for tab', tab.id, tab.url)

    const { authToken } = await chrome.storage.local.get('authToken')
    console.log('Novamind: Auth token exists:', !!authToken)

    if (!authToken) {
      showNotification('Please log in to Novamind first', 'error')
      return { success: false, error: 'Not authenticated' }
    }

    // Capture the visible tab
    console.log('Novamind: Capturing visible tab, windowId:', tab.windowId)
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId || null, {
      format: 'png',
      quality: 100
    })
    console.log('Novamind: Screenshot captured, size:', dataUrl?.length || 0)

    // Convert to blob and upload
    const blob = base64ToBlob(dataUrl, 'image/png')
    const filename = `screenshot-${Date.now()}.png`

    const formData = new FormData()
    formData.append('file', blob, filename)

    console.log('Novamind: Uploading screenshot...')
    const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    })

    console.log('Novamind: Upload response status:', uploadResponse.status)

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Novamind: Upload failed:', errorText)
      throw new Error('Failed to upload screenshot: ' + errorText)
    }

    const uploadResult = await uploadResponse.json()
    console.log('Novamind: Upload result:', uploadResult)

    // Create the item with page info for better search
    const result = await saveItem({
      type: 'image',
      title: `Screenshot of ${tab.title || 'page'}`,
      file_path: uploadResult.path,
      file_type: 'image/png',
      thumbnail_url: uploadResult.publicUrl,
      url: tab.url
    })

    return result
  } catch (error) {
    console.error('Novamind: Error capturing screenshot:', error)
    showNotification('Failed to capture screenshot: ' + error.message, 'error')
    return { success: false, error: error.message || String(error) }
  }
}

// Handle clipboard captures (text or images)
async function handleClipboardCapture(data) {
  // If it's an image, upload it first
  if (data.type === 'image' && data.imageData) {
    try {
      const { authToken } = await chrome.storage.local.get('authToken')

      if (!authToken) {
        showNotification('Please log in to Novamind first', 'error')
        return { success: false, error: 'Not authenticated' }
      }

      // Convert base64 to blob
      const blob = base64ToBlob(data.imageData, data.mimeType)

      // Create form data for upload
      const formData = new FormData()
      const filename = `image-${Date.now()}.${data.mimeType.split('/')[1] || 'png'}`
      formData.append('file', blob, filename)

      // Upload the image
      const uploadResponse = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      const uploadResult = await uploadResponse.json()

      // Now create the item with the uploaded image
      const result = await saveItem({
        type: 'image',
        title: data.title || 'Image from clipboard',
        file_path: uploadResult.path,
        file_type: data.mimeType,
        thumbnail_url: uploadResult.publicUrl
      })

      return result
    } catch (error) {
      console.error('Error uploading image:', error)
      showNotification('Failed to save image', 'error')
      return { success: false, error: error.message }
    }
  }

  // For non-image content, use regular saveItem
  return saveItem(data)
}

// Convert base64 data URL to Blob
function base64ToBlob(dataUrl, mimeType) {
  // Handle both data URL format and raw base64
  let base64Data = dataUrl
  if (dataUrl.startsWith('data:')) {
    base64Data = dataUrl.split(',')[1]
  }

  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType || 'image/png' })
}

// Save item to Novamind API
async function saveItem(data) {
  try {
    // Get auth token from storage
    const { authToken } = await chrome.storage.local.get('authToken')

    if (!authToken) {
      showNotification('Please log in to Novamind first', 'error')
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`${API_BASE_URL}/api/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to save item')
    }

    const result = await response.json()
    showNotification('Saved to Novamind!', 'success')
    return { success: true, item: result }
  } catch (error) {
    console.error('Error saving item:', error)
    showNotification('Failed to save item', 'error')
    return { success: false, error: error.message }
  }
}

// Check authentication status
async function checkAuth() {
  const { authToken } = await chrome.storage.local.get('authToken')
  return { isAuthenticated: !!authToken }
}

// Show notification
function showNotification(message, type = 'info') {
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Novamind',
    message: message
  })
}

// Monitor clipboard (if enabled)
let clipboardMonitorInterval = null

async function startClipboardMonitor() {
  const { settings } = await chrome.storage.local.get('settings')

  if (!settings?.clipboardMonitoring) return

  let lastClipboard = ''

  clipboardMonitorInterval = setInterval(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text !== lastClipboard && text.length > 10) {
        lastClipboard = text

        // Check if it looks like a URL
        const isUrl = /^https?:\/\//.test(text)

        await saveItem({
          type: isUrl ? 'link' : 'text',
          [isUrl ? 'url' : 'content']: text,
          title: isUrl ? text : `Clipboard: ${text.slice(0, 50)}...`
        })
      }
    } catch (e) {
      // Clipboard read failed, probably no permission
    }
  }, 2000)
}

function stopClipboardMonitor() {
  if (clipboardMonitorInterval) {
    clearInterval(clipboardMonitorInterval)
    clipboardMonitorInterval = null
  }
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.settings) {
    if (changes.settings.newValue?.clipboardMonitoring) {
      startClipboardMonitor()
    } else {
      stopClipboardMonitor()
    }
  }
})
