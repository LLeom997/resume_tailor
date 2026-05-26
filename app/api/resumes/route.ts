import { createClient } from '@/lib/supabase/server'
import { Resume, ResumeContent } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

// GET all resumes for the session
export async function GET(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching resumes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/resumes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST create a new resume
export async function POST(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const { name, content, is_master } = await request.json()

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    if (is_master) {
      await supabase
        .from("resumes")
        .update({ is_master: false })
        .eq("session_id", sessionId)
        .eq("is_master", true)
    }

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        session_id: sessionId,
        name,
        content,
        is_master: is_master || false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating resume:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/resumes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
