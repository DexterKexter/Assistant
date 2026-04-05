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
      className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-sm flex justify-end"
      onClick={closeTask}
    >
      <div
        className="bg-white w-full h-full md:w-[480px] md:max-w-[90vw] shadow-2xl overflow-hidden flex flex-col animate-[slideIn_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
        style={{ '--tw-enter-translate-x': '100%' } as React.CSSProperties}
      >
        <TaskDetailSheet />
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
