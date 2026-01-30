// CogniKeep Extension Popup

const API_BASE_URL = 'http://localhost:3000'

document.addEventListener('DOMContentLoaded', async () => {
  const loginPrompt = document.getElementById('login-prompt')
  const saveForm = document.getElementById('save-form')
  const connectBtn = document.getElementById('connect-btn')
  const disconnectLink = document.getElementById('disconnect-link')
  const pageTitle = document.getElementById('page-title')
  const pageUrl = document.getElementById('page-url')
  const itemType = document.getElementById('item-type')
  const textInputGroup = document.getElementById('text-input-group')
  const textContent = document.getElementById('text-content')
  const itemTitle = document.getElementById('item-title')
  const saveBtn = document.getElementById('save-btn')
  const btnText = saveBtn.querySelector('.btn-text')
  const btnLoading = saveBtn.querySelector('.btn-loading')
  const message = document.getElementById('message')

  // Check authentication
  const { authToken } = await chrome.storage.local.get('authToken')

  if (!authToken) {
    loginPrompt.classList.remove('hidden')

    // Connect button handler
    connectBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: `${API_BASE_URL}/extension/connect` })
    })
    return
  }

  saveForm.classList.remove('hidden')
  disconnectLink.classList.remove('hidden')
  document.getElementById('disconnect-separator').classList.remove('hidden')

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (tab) {
    pageTitle.textContent = tab.title || 'Untitled'
    pageUrl.textContent = tab.url || ''
    itemTitle.placeholder = tab.title || 'Custom title...'
  }

  // Handle type change
  itemType.addEventListener('change', () => {
    if (itemType.value === 'text') {
      textInputGroup.classList.remove('hidden')
      document.querySelector('.current-page').classList.add('hidden')
    } else if (itemType.value === 'screenshot') {
      textInputGroup.classList.add('hidden')
      document.querySelector('.current-page').classList.remove('hidden')
      btnText.textContent = 'Capture Screenshot'
    } else {
      textInputGroup.classList.add('hidden')
      document.querySelector('.current-page').classList.remove('hidden')
      btnText.textContent = 'Save to CogniKeep'
    }
  })

  // Handle disconnect
  disconnectLink.addEventListener('click', async (e) => {
    e.preventDefault()
    await chrome.storage.local.remove('authToken')
    window.location.reload()
  })

  // Handle save
  saveBtn.addEventListener('click', async () => {
    const type = itemType.value

    // Show loading state
    saveBtn.disabled = true
    btnText.classList.add('hidden')
    btnLoading.classList.remove('hidden')
    message.classList.add('hidden')

    try {
      // Handle screenshot capture
      if (type === 'screenshot') {
        btnLoading.textContent = 'Capturing...'
        console.log('CogniKeep Popup: Requesting screenshot capture...')

        const result = await chrome.runtime.sendMessage({ action: 'capture-screenshot' })
        console.log('CogniKeep Popup: Screenshot result:', result)

        if (!result || !result.success) {
          throw new Error(result?.error || 'Failed to capture screenshot')
        }

        showMessage('Screenshot saved!', 'success')

        // Close popup after success
        setTimeout(() => {
          window.close()
        }, 1500)
        return
      }

      // Handle link and text
      let data = {
        type,
        title: itemTitle.value || undefined
      }

      if (type === 'link') {
        data.url = tab.url
        data.title = data.title || tab.title
      } else {
        const content = textContent.value.trim()
        if (!content) {
          showMessage('Please enter some text', 'error')
          return
        }
        data.content = content
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
        const err = await response.json()
        throw new Error(err.error || 'Failed to save')
      }

      showMessage('Saved to CogniKeep!', 'success')

      // Clear form
      textContent.value = ''
      itemTitle.value = ''

      // Close popup after success
      setTimeout(() => {
        window.close()
      }, 1500)
    } catch (error) {
      showMessage(error.message || 'Failed to save item', 'error')
    } finally {
      saveBtn.disabled = false
      btnText.classList.remove('hidden')
      btnLoading.classList.add('hidden')
      btnLoading.textContent = 'Saving...'
    }
  })

  function showMessage(text, type) {
    message.textContent = text
    message.className = `message ${type}`
    message.classList.remove('hidden')
  }
})
