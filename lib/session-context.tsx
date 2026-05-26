'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { generateSessionId } from './resume-utils'

interface SessionContextType {
  sessionId: string | null
  isLoading: boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const defaultSessionId = 'default-workspace-session'

    // Extract from query parameters or localStorage if present
    const params = new URLSearchParams(window.location.search)
    const urlSessionId = params.get('session') || params.get('sessionId')
    const storedSessionId = localStorage.getItem('resumeBuilderSessionId')

    const oldSessionId = urlSessionId || (storedSessionId && storedSessionId !== defaultSessionId ? storedSessionId : null)

    if (oldSessionId && oldSessionId !== defaultSessionId) {
      // Auto-migrate the old session database records to the new default workspace session!
      fetch('/api/merge-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': defaultSessionId
        },
        body: JSON.stringify({ oldSessionId })
      })
      .then(res => res.json())
      .then(data => {
        console.log('Auto-migration result:', data)
        localStorage.setItem('resumeBuilderSessionId', defaultSessionId)
        
        // Clean URL parameters cleanly without page reload
        const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]session(Id)?=[^&]*/gi, '')
        window.history.replaceState({}, '', cleanUrl === '' ? '/' : cleanUrl)
        
        window.location.reload()
      })
      .catch(err => {
        console.error('Auto-migration failed:', err)
      })
    } else {
      localStorage.setItem('resumeBuilderSessionId', defaultSessionId)
    }

    setSessionId(defaultSessionId)
    setIsLoading(false)
  }, [])

  return (
    <SessionContext.Provider value={{ sessionId, isLoading }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
