'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CreateBoardModal } from './CreateBoardModal'

export function CreateBoardButton() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-primary-600 dark:bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-primary-700 dark:hover:bg-sky-600 font-medium transition-colors"
      >
        <Plus className="h-5 w-5" />
        Create Board
      </button>

      {showModal && <CreateBoardModal onClose={() => setShowModal(false)} />}
    </>
  )
}
