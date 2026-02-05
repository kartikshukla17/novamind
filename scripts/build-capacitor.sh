#!/bin/bash

# Build script for Capacitor mobile apps
# This builds the Next.js app as a static export and syncs with native platforms

echo "🚀 Building Novamind for Capacitor..."

# Use the Capacitor-specific Next.js config
echo "📦 Building Next.js app with static export..."
NEXT_CONFIG_FILE=next.config.capacitor.js npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Next.js build completed successfully"

  # Sync with Capacitor
  echo "🔄 Syncing with Capacitor..."
  npx cap sync

  if [ $? -eq 0 ]; then
    echo "✅ Capacitor sync completed successfully"
    echo ""
    echo "📱 Ready to run on mobile!"
    echo "   - iOS: npm run cap:open:ios"
    echo "   - Android: npm run cap:open:android"
    echo ""
  else
    echo "❌ Capacitor sync failed"
    exit 1
  fi
else
  echo "❌ Next.js build failed"
  exit 1
fi
