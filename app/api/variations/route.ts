import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("persona_id")

    const supabase = await createClient()
    let query = supabase
      .from("resume_variations")
      .select("*")
      .eq("session_id", sessionId)

    if (personaId) {
      query = query.eq("persona_id", personaId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      if (error.code === "42P01") {
        console.warn("Table 'resume_variations' does not exist. Returning empty array.")
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/variations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = "default-workspace-session"

    const body = await request.json()
    const {
      persona_id,
      master_resume_id,
      company_name,
      role_title,
      status,
      version,
      jd_text,
      resume_content,
    } = body

    if (!persona_id || !resume_content) {
      return NextResponse.json({ error: "persona_id and resume_content are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("resume_variations")
      .insert({
        session_id: sessionId,
        persona_id,
        master_resume_id,
        company_name: company_name || "Company",
        role_title: role_title || "Role",
        status: status || "draft",
        version: version || 1,
        jd_text: jd_text || "",
        resume_content,
        status_updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/variations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
