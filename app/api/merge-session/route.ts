import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const currentSessionId = request.headers.get('x-session-id')
    if (!currentSessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    const { oldSessionId } = await request.json()

    if (!oldSessionId || oldSessionId.trim() === '') {
      return NextResponse.json({ error: 'Old Session ID is required' }, { status: 400 })
    }

    if (oldSessionId.trim() === currentSessionId.trim()) {
      return NextResponse.json({ error: 'Cannot merge a session into itself' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify if the old session actually has any resumes
    const { data: checkResumes, error: checkError } = await supabase
      .from('resumes')
      .select('id')
      .eq('session_id', oldSessionId)
      .limit(1)

    if (checkError) {
      console.error('Error checking resumes:', checkError)
      return NextResponse.json({ error: 'Database check failed: ' + checkError.message }, { status: 500 })
    }

    // List of tables containing session_id to migrate
    const tables = [
      'resumes',
      'personas',
      'resume_variations',
      'resume_activity',
      'profiles',
      'job_applications'
    ]

    const stats: Record<string, number> = {}

    // Perform the migration updates
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .update({ session_id: currentSessionId })
          .eq('session_id', oldSessionId)
          .select('id')

        if (error) {
          console.warn(`Failed to merge table ${table}:`, error)
          stats[table] = 0
        } else {
          stats[table] = data ? data.length : 0
        }
      } catch (err) {
        console.warn(`Exception when merging table ${table}:`, err)
        stats[table] = 0
      }
    }

    const totalMigrated = Object.values(stats).reduce((acc, curr) => acc + curr, 0)

    return NextResponse.json({
      success: true,
      message: `Successfully merged records from old session.`,
      stats,
      totalMigrated
    })
  } catch (error) {
    console.error('Error in POST /api/merge-session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
