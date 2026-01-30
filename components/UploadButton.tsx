'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { UploadModal } from './UploadModal'

interface UploadButtonProps {
  onUpload?: () => void
}

export function UploadButton({ onUpload }: UploadButtonProps) {
  const [showModal, setShowModal] = useState(false)

  function handleClose() {
    setShowModal(false)
  }

  function handleSuccess() {
    onUpload?.()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-primary-600 dark:bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-sky-600 font-medium transition-colors"
      >
        <Plus className="h-5 w-5" />
        Add Item
      </button>

      {showModal && <UploadModal onClose={handleClose} onSuccess={handleSuccess} />}
    </>
  )
}
