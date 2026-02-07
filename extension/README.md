# Novamind Browser Extension

Save links, text, screenshots, and images to Novamind from any webpage.

## Production URL (Vercel)

Edit **`config.js`** and set `API_BASE_URL` to your deployed app, e.g.:

```js
var API_BASE_URL = 'https://novamind.vercel.app'
```

If you use a custom domain, also add it to **`content/content.js`** in `ALLOWED_ORIGINS`.

## Giving the extension to others

1. **Load unpacked (for testing / small team)**  
   - Zip the `extension` folder (or share the repo).  
   - Others: Chrome → `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → select the `extension` folder.  
   - They must use the same `config.js` URL (your Vercel app).

2. **Chrome Web Store (for public use)**  
   - Package the extension, create a developer account, and publish.  
   - Users install from the store; no need to touch `config.js` (you ship it with your production URL).

## How it runs

- The extension runs **inside the browser** (Chrome/Edge). It does **not** need your Novamind website tab to be open.
- When someone saves (popup, right‑click, or shortcut), the extension sends the request to your **Vercel backend** (Supabase + API). Data is stored in your project.
- Users only need to **connect once** (open your app → Extension connect → log in). The extension keeps a token and uses it until they disconnect.

## Local development

Set `API_BASE_URL` in `config.js` to `http://localhost:3000` and load the extension as unpacked. Use the same origin in `content/content.js` `ALLOWED_ORIGINS` (localhost is already listed).
