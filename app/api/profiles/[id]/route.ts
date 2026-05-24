import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = request.headers.get("x-session-id")
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: profile, error: profileError } = await supabase
      .from("career_profiles")
      .select("*")
      .eq("id", id)
      .eq("session_id", sessionId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { data: resumes, error: resumesError } = await supabase
      .from("resumes")
      .select("*")
      .eq("session_id", sessionId)
      .eq("profile_id", id)
      .order("created_at", { ascending: false })

    if (resumesError) {
      return NextResponse.json({ error: resumesError.message }, { status: 500 })
    }

    const masterResumeId = profile.master_resume_id
    let masterResume = null
    if (masterResumeId) {
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("id", masterResumeId)
        .eq("session_id", sessionId)
        .single()
      masterResume = data
    }

    const variants = (resumes || []).filter((resume) => !resume.is_master)

    return NextResponse.json({
      profile,
      masterResume,
      variants,
    })
  } catch (error) {
    console.error("Error in GET /api/profiles/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = request.headers.get("x-session-id")
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const body = await request.json()
    const supabase = await createClient()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.name === "string") updates.name = body.name.trim()
    if (typeof body.description === "string") updates.description = body.description.trim()
    if (body.master_resume_id !== undefined) updates.master_resume_id = body.master_resume_id

    const { data, error } = await supabase
      .from("career_profiles")
      .update(updates)
      .eq("id", id)
      .eq("session_id", sessionId)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Profile not found or could not be updated" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in PUT /api/profiles/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
