'use client'

import { useTaskModal } from '@/lib/task-modal'
import dynamic from 'next/dynamic'

const TaskDetailSheet = dynamic(
  () => import('@/app/(dashboard)/dashboard/tasks/task-detail-sheet'),
  { ssr: false }
)

export function TaskDetailGlobal() {
  const { selectedTaskId, isCreating, closeTask } = useTaskModal()

  if (!selectedTaskId && !isCreating) return null

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4"
      onClick={closeTask}
    >
      <div
        className="bg-white w-full h-full md:rounded-2xl md:w-[560px] md:max-w-[95vw] md:h-[85vh] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <TaskDetailSheet />
      </div>
    </div>
  )
}
