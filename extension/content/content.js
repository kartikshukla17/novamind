// Novamind Content Script
// Listens for auth token from the connect page

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://novamind.vercel.app'
  // Add your custom domain here if different, e.g. 'https://app.novamind.com'
]

// Listen for messages from the page
window.addEventListener('message', async (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return

  if (event.data.type === 'NOVAMIND_AUTH_TOKEN' && event.data.token) {
    // Store the token in extension storage
    await chrome.storage.local.set({ authToken: event.data.token })
    console.log('Novamind: Auth token received and stored')

    // Notify the page that we received it
    window.postMessage({ type: 'NOVAMIND_AUTH_CONFIRMED' }, '*')
  }
})

// Also check localStorage for token (fallback)
if (window.location.pathname === '/extension/connect') {
  const checkToken = setInterval(async () => {
    const token = localStorage.getItem('novamind_extension_token')
    if (token) {
      await chrome.storage.local.set({ authToken: token })
      console.log('Novamind: Auth token stored from localStorage')
      clearInterval(checkToken)

      // Clean up
      localStorage.removeItem('novamind_extension_token')
    }
  }, 500)

  // Stop checking after 30 seconds
  setTimeout(() => clearInterval(checkToken), 30000)
}
