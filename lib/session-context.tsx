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
    // Check query parameters first
    const params = new URLSearchParams(window.location.search)
    const urlSessionId = params.get('session') || params.get('sessionId')

    if (urlSessionId) {
      localStorage.setItem('resumeBuilderSessionId', urlSessionId)
      setSessionId(urlSessionId)

      // Clean up URL parameter cleanly without page reload
      const cleanUrl = window.location.pathname + window.location.search.replace(/[?&]session(Id)?=[^&]*/gi, '')
      window.history.replaceState({}, '', cleanUrl === '' ? '/' : cleanUrl)
    } else {
      // Check localStorage for existing session
      const storedSessionId = localStorage.getItem('resumeBuilderSessionId')
      if (storedSessionId) {
        setSessionId(storedSessionId)
      } else {
        // Generate new session ID
        const newSessionId = generateSessionId()
        localStorage.setItem('resumeBuilderSessionId', newSessionId)
        setSessionId(newSessionId)
      }
    }
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
