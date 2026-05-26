"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Hourglass, Minimize2 } from "lucide-react"

interface InteractiveProgressProps {
  title: string
  subtitle: string
  isCompleted?: boolean
  onClose?: () => void
  estimatedDurationMs?: number // Default: 7000ms
  onMinimize?: () => void
}

export function InteractiveProgress({
  title,
  subtitle,
  isCompleted = false,
  onClose,
  estimatedDurationMs = 7000,
  onMinimize,
}: InteractiveProgressProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    { title: "Ingestion & Sanitization", desc: "Tokenizing inputs and formatting text arrays..." },
    { title: "Feature Extraction", desc: "Isolating experiences, projects, dates, and metrics..." },
    { title: "Semantic NLP Analysis", desc: "Detecting keywords, intent, verbs, and domain alignment..." },
    { title: "Schema Synthesis", desc: "Structuring parameters into a typesafe schema format..." },
    { title: "Parity Check & Finalization", desc: "Validating margins, links, and layout consistency..." },
  ]

  // Progress Bar & Step Control (Controlled by Actual API load status)
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isCompleted) {
      // Rapidly but smoothly shoot to 100% when API completes
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer)
            // Trigger onClose after a brief 800ms pause to let the user see it complete!
            setTimeout(() => {
              onClose?.()
            }, 800)
            return 100
          }
          // Quick exponential catchup
          const next = prev + (100 - prev) * 0.35 + 1.5
          return next >= 99.8 ? 100 : next
        })
      }, 60)
    } else {
      // Slow down asymptotically as we approach 92%
      const intervalTime = estimatedDurationMs / 100
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) {
            // Infinite slow tick above 92% (e.g. 92.05%, 92.1%...) so it never hits 100% before API completes
            return Math.min(97, prev + 0.04)
          }
          const remaining = 92 - prev
          const step = Math.max(0.15, remaining / 20) // Eases/decays as it goes up
          return prev + step
        })
      }, intervalTime)
    }

    return () => clearInterval(timer)
  }, [isCompleted, estimatedDurationMs, onClose])

  // Sync steps based on progress percent
  useEffect(() => {
    const stepIndex = Math.min(Math.floor(progress / 20), steps.length - 1)
    setCurrentStep(stepIndex)
  }, [progress, steps.length])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm transition-all duration-300">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden md:p-8">
        
        {/* HEADER */}
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg tracking-tight">{title}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">{subtitle}</p>
        </div>

        {/* PROGRESS DISPLAY */}
        <div className="flex flex-col items-center justify-center py-6 mb-6 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-850 rounded-xl relative">
          <span className="text-6xl font-extrabold font-mono tracking-tighter text-zinc-900 dark:text-zinc-50 animate-pulse">
            {Math.round(progress)}%
          </span>
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-2">
            Tailoring Pipeline Status
          </span>
        </div>

        {/* STEPS LIST */}
        <div className="space-y-4 mb-6">
          {steps.map((step, index) => {
            const isFinished = index < currentStep
            const isActive = index === currentStep

            return (
              <div
                key={index}
                className={`flex items-start gap-3 transition-opacity duration-300 ${
                  isFinished ? "opacity-60" : isActive ? "opacity-100" : "opacity-45"
                }`}
              >
                <div className="mt-0.5">
                  {isFinished ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-zinc-900 dark:text-zinc-100 flex-shrink-0" />
                  ) : isActive ? (
                    <div className="w-4.5 h-4.5 rounded-full border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin flex-shrink-0" />
                  ) : (
                    <div className="w-4.5 h-4.5 rounded-full border-2 border-zinc-200 dark:border-zinc-800 flex-shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 leading-none">
                    {step.title}
                  </h4>
                  {isActive && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {step.desc}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* PROGRESS BAR CONTAINER */}
        <div className="space-y-2 mb-6">
          <Progress value={progress} className="h-1 bg-zinc-100 dark:bg-zinc-800" />
        </div>

        {/* MINIMIZE CONTROLS */}
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <div>
            {onMinimize && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onMinimize}
                className="text-[11px] h-8 font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 gap-1.5 px-3 rounded-lg"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Run in background
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[10px] font-mono font-medium">
            <Hourglass className="w-3.5 h-3.5 animate-spin" />
            <span>Processing...</span>
          </div>
        </div>

      </div>
    </div>
  )
}
