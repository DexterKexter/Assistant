'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface TaskModalContextType {
  openTask: (id: string) => void
  createTask: () => void
  closeTask: () => void
  selectedTaskId: string | null
  isCreating: boolean
}

const TaskModalContext = createContext<TaskModalContextType>({
  openTask: () => {},
  createTask: () => {},
  closeTask: () => {},
  selectedTaskId: null,
  isCreating: false,
})

export function useTaskModal() {
  return useContext(TaskModalContext)
}

export function TaskModalProvider({ children }: { children: ReactNode }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <TaskModalContext.Provider value={{
      openTask: (id) => { setSelectedTaskId(id); setIsCreating(false) },
      createTask: () => { setSelectedTaskId(null); setIsCreating(true) },
      closeTask: () => { setSelectedTaskId(null); setIsCreating(false) },
      selectedTaskId,
      isCreating,
    }}>
      {children}
    </TaskModalContext.Provider>
  )
}
