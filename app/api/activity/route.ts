import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("resume_activity")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      if (error.code === "42P01") {
        console.warn("Table 'resume_activity' does not exist. Returning empty array.")
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const body = await request.json()
    const { persona_id, variation_id, action_type, metadata } = body

    if (!action_type) {
      return NextResponse.json({ error: "action_type is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("resume_activity")
      .insert({
        session_id: sessionId,
        persona_id: persona_id || null,
        variation_id: variation_id || null,
        action_type,
        metadata: metadata || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/activity:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
