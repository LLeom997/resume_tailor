"use client"

import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Terminal, 
  Cpu, 
  Database, 
  Sparkles, 
  Zap, 
  Code2, 
  CheckCircle2, 
  Hourglass, 
  Eye
} from "lucide-react"

interface InteractiveProgressProps {
  title: string
  subtitle: string
  isCompleted?: boolean
  onClose?: () => void
  estimatedDurationMs?: number // Default: 7000ms
}

export function InteractiveProgress({
  title,
  subtitle,
  isCompleted = false,
  onClose,
  estimatedDurationMs = 7000,
}: InteractiveProgressProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [boosted, setBoosted] = useState(false)
  const [verbose, setVerbose] = useState(true)

  const steps = [
    { title: "Ingestion & Sanitization", desc: "Tokenizing inputs and formatting text arrays...", icon: Terminal },
    { title: "Feature Extraction", desc: "Isolating experiences, projects, dates, and metrics...", icon: Database },
    { title: "Semantic NLP Analysis", desc: "Detecting keywords, intent, verbs, and domain alignment...", icon: Cpu },
    { title: "Schema Synthesis", desc: "Structuring parameters into a typesafe schema format...", icon: Code2 },
    { title: "Parity Check & Finalization", desc: "Validating margins, links, and layout consistency...", icon: CheckCircle2 },
  ]

  const mockLogPool = [
    "Initializing neural parsing pipeline...",
    "Scanning document headers for metadata...",
    "Extracting Basics -> Name: Found, Email: Found",
    "Processing professional headline layers...",
    "Sanitizing contact records & structural inputs...",
    "Segmenting experiences by chron-order...",
    "Parsing Experience [1] -> Senior NPD Engineer...",
    "Isolating action verbs: 'lead', 'drive', 'innovate'...",
    "Extracting key metrics: 40% reduction, $12M budget...",
    "Detecting academic institutions and credentials...",
    "Mapping skills array -> FEA: High, CFD: High, CAD: Expert...",
    "Validating project URLs and links...",
    "Aligning certification nodes and dates...",
    "Detecting language proficiencies...",
    "Assembling content JSON nodes...",
    "Injecting Google Sans typographical variables...",
    "Checking A4 sheet boundaries and scaling factors...",
    "Normalizing subpixels for print rendering...",
    "Syncing Zustand workspace state store...",
    "Optimization complete. Loading high-fidelity preview...",
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
          const speedMultiplier = boosted ? 2.8 : 1.2
          const remaining = 92 - prev
          const step = Math.max(0.15, (remaining / 20) * speedMultiplier) // Eases/decays as it goes up
          return prev + step
        })
      }, intervalTime)
    }

    return () => clearInterval(timer)
  }, [isCompleted, estimatedDurationMs, boosted, onClose])

  // Sync steps based on progress percent
  useEffect(() => {
    const stepIndex = Math.min(Math.floor(progress / 20), steps.length - 1)
    setCurrentStep(stepIndex)
  }, [progress, steps.length])

  // Stream mock terminal logs dynamically in sync with progress
  useEffect(() => {
    const triggerPercentage = Math.floor(progress)
    const poolSize = mockLogPool.length
    const logIndex = Math.min(Math.floor(triggerPercentage / (100 / poolSize)), poolSize - 1)
    
    // Add success logs at the end
    const logText = progress === 100 
      ? "SUCCESS: State synchronized. Rendering visual resume layout!"
      : mockLogPool[logIndex]

    const newLog = `[${new Date().toLocaleTimeString([], { hour12: false })}] ${logText}`
    
    setLogs((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].substring(11) !== logText) {
        return [...prev, newLog].slice(-7) // Keep latest 7 logs
      }
      return prev
    })
  }, [progress])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md transition-all duration-300">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 overflow-hidden md:p-8">
        
        {/* Animated Background Neon Elements */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

        {/* TOP META ROW */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-lg tracking-tight">{title}</h3>
              <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-300 bg-zinc-800 animate-pulse">
            ENGINE STATUS: {progress === 100 ? "COMPLETED" : boosted ? "BOOSTED" : "RUNNING"}
          </Badge>
        </div>

        {/* RADAR INTERACTIVE SCANNER SCREEN */}
        <div className="grid gap-6 md:grid-cols-5 items-stretch mb-6">
          
          <div className="md:col-span-2 border border-zinc-800 rounded-lg bg-zinc-950 p-4 flex flex-col items-center justify-center relative overflow-hidden h-[180px]">
            {/* Visual Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:16px_16px] opacity-10" />
            
            {/* Rotating Radar Line */}
            <div className="absolute w-[180px] h-[180px] rounded-full border border-blue-500/20 flex items-center justify-center">
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_50%,rgba(59,130,246,0.15))] rounded-full animate-[spin_3s_linear_infinite]" />
              <div className="absolute w-[120px] h-[120px] rounded-full border border-purple-500/10" />
              <div className="absolute w-[60px] h-[60px] rounded-full border border-zinc-800" />
            </div>

            {/* Glowing Center Core */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
              <div className="p-3.5 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 shadow-lg shadow-blue-500/10">
                <Cpu className={`w-6 h-6 ${progress === 100 ? "" : "animate-[spin_4s_linear_infinite]"}`} />
              </div>
              <span className="font-mono text-xs font-bold text-zinc-300 tracking-wider">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* ACTIVE STEP CARD */}
          <div className="md:col-span-3 border border-zinc-800 rounded-lg bg-zinc-950/60 p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Active Phase ({currentStep + 1}/5)</span>
              <div className="flex items-center gap-2">
                {(() => {
                  const IconComp = steps[currentStep].icon
                  return <IconComp className="w-5 h-5 text-blue-400 flex-shrink-0 animate-pulse" />
                })()}
                <h4 className="font-bold text-sm text-zinc-100">{steps[currentStep].title}</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                {steps[currentStep].desc}
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="space-y-2 mt-4">
              <Progress value={progress} className="h-1.5 bg-zinc-850" />
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>Phase Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* DYNAMIC LOGS PANEL */}
        {verbose && (
          <div className="border border-zinc-800 bg-zinc-950 rounded-lg p-3 font-mono text-[10px] text-zinc-400 space-y-1.5 h-[130px] overflow-y-auto mb-6 scrollbar-thin select-none relative">
            <div className="sticky top-0 bg-zinc-950/90 pb-1 border-b border-zinc-850 flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1"><Terminal className="w-3 h-3 text-zinc-500" /> Pipeline Console Stream</span>
              <span>LIVE</span>
            </div>
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-1.5 truncate border-l border-zinc-800 pl-2">
                <span className="text-zinc-500">{log.substring(0, 10)}</span>
                <span className={log.includes("SUCCESS") ? "text-emerald-400 font-semibold animate-pulse" : log.includes("Error") ? "text-red-400" : "text-zinc-300"}>
                  {log.substring(10)}
                </span>
              </div>
            ))}
            {/* Auto scroll buffer */}
            <div className="h-1 animate-pulse bg-blue-500/20 w-1 rounded-full mt-1" />
          </div>
        )}

        {/* INTERACTIVE micro controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant={boosted ? "default" : "outline"}
              onClick={() => setBoosted(!boosted)}
              className="text-[10px] h-7 font-mono font-bold tracking-tight gap-1 hover:border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
            >
              <Zap className={`w-3 h-3 ${boosted ? "fill-current text-yellow-400 animate-bounce" : "text-zinc-400"}`} />
              {boosted ? "ENGINE OVERCLOCKED" : "BOOST PIPELINE (+2.8x)"}
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setVerbose(!verbose)}
              className="text-[10px] h-7 font-mono border-zinc-700 text-zinc-400 hover:text-zinc-100 bg-zinc-850 hover:bg-zinc-800"
            >
              <Eye className="w-3 h-3" />
              {verbose ? "HIDE STREAM" : "SHOW STREAM"}
            </Button>
          </div>
          
          <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
            <Hourglass className="w-3.5 h-3.5 animate-spin" />
            <span>Calculating...</span>
          </div>
        </div>

      </div>
    </div>
  )
}
