'use client'

import { useState } from 'react'
import { Brain, Loader2, Check, X, ChevronDown, ChevronUp, Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react'
import { useLocalFirst } from './LocalFirstProvider'

export function AIStatus() {
  const [expanded, setExpanded] = useState(false)
  const {
    aiReady,
    aiLoading,
    aiProgress,
    aiStatus,
    syncStatus,
    syncNow
  } = useLocalFirst()

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg transition-colors ${
          aiLoading
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : aiReady
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300'
        }`}
      >
        {aiLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : aiReady ? (
          <Brain className="h-4 w-4" />
        ) : (
          <Brain className="h-4 w-4 opacity-50" />
        )}

        <span className="text-sm font-medium">
          {aiLoading ? 'Loading AI...' : aiReady ? 'AI Ready' : 'AI Offline'}
        </span>

        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Local AI Status</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              AI runs on your device for privacy
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* AI Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                <span className="text-sm text-gray-700 dark:text-slate-300">Categorization</span>
              </div>
              {aiLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${aiProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400">{Math.round(aiProgress)}%</span>
                </div>
              ) : aiReady ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              )}
            </div>

            {aiLoading && aiStatus && (
              <p className="text-xs text-gray-500 dark:text-slate-400 pl-6">{aiStatus}</p>
            )}

            {/* Sync Status */}
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {syncStatus.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {syncStatus.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {syncStatus.pendingChanges > 0 ? (
                    <CloudOff className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Cloud className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {syncStatus.pendingChanges > 0
                      ? `${syncStatus.pendingChanges} pending`
                      : 'All synced'}
                  </span>
                </div>

                {syncStatus.pendingChanges > 0 && syncStatus.isOnline && (
                  <button
                    onClick={syncNow}
                    className="text-xs text-primary-600 dark:text-sky-400 hover:underline"
                  >
                    Sync now
                  </button>
                )}
              </div>

              {syncStatus.lastSync && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                  Last synced: {new Date(syncStatus.lastSync).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 text-xs text-gray-500 dark:text-slate-400">
            Data stored locally on your device
          </div>
        </div>
      )}
    </div>
  )
}
