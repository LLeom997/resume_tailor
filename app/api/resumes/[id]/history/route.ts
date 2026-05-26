import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = "default-workspace-session"

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("resume_history")
      .select("*")
      .eq("resume_id", id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })

    if (error) {
      if (error.code === "42P01") {
        console.warn("Table 'resume_history' does not exist yet. Returning empty array.")
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/resumes/[id]/history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = "default-workspace-session"

    const body = await request.json()
    const { change_description, previous_content, new_content } = body

    if (!change_description || !previous_content || !new_content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("resume_history")
      .insert({
        resume_id: id,
        session_id: sessionId,
        change_description,
        previous_content,
        new_content,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/resumes/[id]/history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
