'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/hooks/use-workspace-store'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink,
  Loader2,
  Terminal
} from 'lucide-react'

export function BackgroundTaskPill() {
  const router = useRouter()
  const store = useWorkspaceStore()
  const activeTask = store.activeTask
  const [isDismissed, setIsDismissed] = useState(false)

  // Auto-reset dismiss state when a new task starts
  useEffect(() => {
    if (activeTask) {
      setIsDismissed(false)
    }
  }, [activeTask?.id])

  if (!activeTask || isDismissed) return null

  const isCompleted = activeTask.status === 'completed'
  const isError = activeTask.status === 'error'

  const handleAction = () => {
    if (activeTask.targetUrl) {
      router.push(activeTask.targetUrl)
      // For finalization, dismiss immediately on click
      if (activeTask.type === 'generate') {
        store.dismissTask()
      }
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl p-4 text-zinc-100 animate-in slide-in-from-bottom-5 fade-in duration-300 select-none">
      
      {/* GLOWING AMBIENT CORNER HOVERS */}
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15 transition-all duration-500 ${
        isCompleted ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-blue-500'
      }`} />

      {/* HEADER SECTION */}
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${
            isCompleted 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : isError 
                ? 'bg-red-500/10 text-red-400' 
                : 'bg-blue-500/10 text-blue-400 animate-pulse'
          }`}>
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 animate-bounce" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4 animate-spin-slow" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-zinc-100 tracking-tight truncate">
              {activeTask.title}
            </h4>
            <p className="text-[10px] text-zinc-400 font-semibold truncate uppercase mt-0.5 tracking-wider">
              {isCompleted ? 'Pipeline Complete' : isError ? 'Job Failed' : 'Background Execution'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsDismissed(true)
            if (isCompleted || isError) {
              store.dismissTask()
            }
          }}
          className="text-zinc-500 hover:text-zinc-350 hover:bg-zinc-800/60 p-1 rounded-md transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* BODY CONTENT */}
      <div className="space-y-3">
        <p className="text-[11px] text-zinc-350 leading-normal font-medium">
          {isCompleted 
            ? activeTask.type === 'analyze' 
              ? 'Your job description has been parsed. Review the optimization proposed changes now!'
              : 'Dynamic resume tailored and saved to database successfully!'
            : isError 
              ? activeTask.metadata?.error || 'A remote exception occurred during AI optimization.'
              : activeTask.subtitle
          }
        </p>

        {/* PROGRESS AREA */}
        {!isCompleted && !isError && (
          <div className="space-y-1.5 pt-1">
            <Progress value={activeTask.progress} className="h-1 bg-zinc-800" />
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-500" />
                Ticking engine stream...
              </span>
              <span>{Math.round(activeTask.progress)}%</span>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex items-center gap-2 border-t border-zinc-800/60 pt-3 mt-1 justify-end">
          {isCompleted ? (
            <Button
              size="xs"
              onClick={handleAction}
              className="text-[10px] font-mono font-bold tracking-tight bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-md shadow-emerald-950/20"
            >
              {activeTask.type === 'analyze' ? (
                <>Review Changes <ExternalLink className="w-3 h-3" /></>
              ) : (
                <>Open Resume <ExternalLink className="w-3 h-3" /></>
              )}
            </Button>
          ) : isError ? (
            <Button
              size="xs"
              onClick={() => {
                store.dismissTask()
                router.push(`/generate/${activeTask.id.split('-')[1]}`)
              }}
              variant="outline"
              className="text-[10px] font-mono border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300"
            >
              Try Again
            </Button>
          ) : (
            <Button
              size="xs"
              onClick={() => {
                // Instantly routes back to maximize the overlay dialog on generate page
                router.push(`/generate/${activeTask.id.split('-')[1]}`)
              }}
              variant="outline"
              className="text-[10px] font-mono border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 text-zinc-300 gap-1"
            >
              <Terminal className="w-3 h-3 text-zinc-400" /> Maximize
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
