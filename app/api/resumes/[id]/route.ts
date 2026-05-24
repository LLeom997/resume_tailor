import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET a specific resume
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', id)
      .eq('session_id', sessionId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/resumes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT update a resume
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, content, export_meta, profile_id, is_master } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updates.name = name
    if (content !== undefined) updates.content = content
    if (export_meta !== undefined) updates.export_meta = export_meta
    if (profile_id !== undefined) updates.profile_id = profile_id
    if (is_master !== undefined) updates.is_master = is_master

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const supabase = await createClient()

    let { data, error } = await supabase
      .from('resumes')
      .update(updates)
      .eq('id', id)
      .eq('session_id', sessionId)
      .select()
      .single()

    // Sync updates to resume_variations if export_meta is updated
    if (!error && data && export_meta) {
      try {
        await supabase
          .from('resume_variations')
          .update({
            company_name: export_meta.company || 'Company',
            role_title: export_meta.role || 'Role',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('session_id', sessionId)
      } catch (syncErr) {
        console.warn('Failed to sync resume update to resume_variations:', syncErr)
      }
    }

    // If update fails due to missing columns (e.g., database not migrated),
    // fall back to updating name and content only, ignoring schema-specific fields.
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.warn('Supabase update failed due to missing columns. Retrying with basic fields only...');
      const fallbackUpdates: Record<string, unknown> = {
        updated_at: updates.updated_at,
      }
      if (name !== undefined) fallbackUpdates.name = name
      if (content !== undefined) fallbackUpdates.content = content

      const retryResult = await supabase
        .from('resumes')
        .update(fallbackUpdates)
        .eq('id', id)
        .eq('session_id', sessionId)
        .select()
        .single()
      
      data = retryResult.data
      error = retryResult.error
    }

    if (error || !data) {
      console.error('Supabase update error:', error)
      return NextResponse.json(
        { 
          error: 'Resume not found or could not be updated',
          details: error ? error.message : 'No data returned'
        },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/resumes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE a resume
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = request.headers.get('x-session-id')
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id)
      .eq('session_id', sessionId)

    if (error) {
      return NextResponse.json(
        { error: 'Resume not found or could not be deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/resumes/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
